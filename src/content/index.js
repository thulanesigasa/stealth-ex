window.StealthUI.createOverlay();

const questionCache = new Map(); // text -> { id, answer }

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
    window.getComputedStyle(el).visibility !== 'hidden' &&
    window.getComputedStyle(el).opacity !== '0' &&
    window.getComputedStyle(el).display !== 'none'
  );
}

function scanForQuestions() {
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, div, span, label');
  
  const visibleQuestions = new Set();
  
  elements.forEach(el => {
    // Basic heuristic: no element children to avoid reading a massive block of text as a single question
    if (el.children.length === 0 && el.textContent) {
      const text = el.textContent.trim();
      
      // Question heuristic: ends with ?, reasonable length
      if (text.endsWith('?') && text.length > 10 && text.length < 500) {
        if (isElementVisible(el)) {
          visibleQuestions.add(text);
        }
      }
    }
  });

  // If no questions are visible, clear the overlay
  if (visibleQuestions.size === 0) {
    window.StealthUI.clearBlocks();
    return;
  }

  // Clear UI and rebuild with only currently visible questions
  window.StealthUI.clearBlocks();

  visibleQuestions.forEach(text => {
    if (!questionCache.has(text)) {
      const questionId = Date.now().toString() + Math.floor(Math.random() * 1000);
      questionCache.set(text, { id: questionId, answer: null });
      
      // Request answer from background
      chrome.runtime.sendMessage(
        { action: 'get_answer', question: text },
        (response) => {
          let ans = 'Error getting answer.';
          if (chrome.runtime.lastError) {
             ans = 'Error: Could not contact background worker.';
          } else if (response && response.answer) {
             ans = response.answer;
          }
          
          const cacheEntry = questionCache.get(text);
          if (cacheEntry) {
            cacheEntry.answer = ans;
            // Update UI if it's currently on screen
            window.StealthUI.updateAnswer(cacheEntry.id, ans);
          }
        }
      );
    }
    
    // Add the block (it will use the cached answer if available, or 'Thinking...' if null)
    const cacheData = questionCache.get(text);
    window.StealthUI.addQABlock(cacheData.id, text, cacheData.answer);
  });
}

// Initial scan
setTimeout(scanForQuestions, 1000);

// Periodically check for dynamically added/removed questions
setInterval(scanForQuestions, 2000);
