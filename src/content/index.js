window.StealthUI.createOverlay();

const processedQuestions = new Set();

function scanForQuestions() {
  // Scan basic text elements
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, div, span, label');
  
  elements.forEach(el => {
    // Basic heuristic: no element children to avoid reading a massive block of text as a single question
    if (el.children.length === 0 && el.textContent) {
      const text = el.textContent.trim();
      
      // Question heuristic: ends with ?, reasonable length
      if (text.endsWith('?') && text.length > 10 && text.length < 500 && !processedQuestions.has(text)) {
        processedQuestions.add(text);
        
        const questionId = Date.now().toString() + Math.floor(Math.random() * 1000);
        window.StealthUI.addQABlock(questionId, text);

        // Send to background
        chrome.runtime.sendMessage(
          { action: 'get_answer', question: text },
          (response) => {
            if (chrome.runtime.lastError) {
              window.StealthUI.updateAnswer(questionId, 'Error: Could not contact background worker.');
            } else if (response && response.answer) {
              window.StealthUI.updateAnswer(questionId, response.answer);
            } else {
              window.StealthUI.updateAnswer(questionId, 'Error getting answer.');
            }
          }
        );
      }
    }
  });
}

// Initial scan
setTimeout(scanForQuestions, 1000);

// Periodically check for dynamically added questions
setInterval(scanForQuestions, 5000);
