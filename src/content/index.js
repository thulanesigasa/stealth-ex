window.StealthUI.createOverlay();

const questionCache = new Map(); // text -> { id, answer }

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom > 0 &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right > 0 &&
    window.getComputedStyle(el).visibility !== 'hidden' &&
    window.getComputedStyle(el).opacity !== '0' &&
    window.getComputedStyle(el).display !== 'none'
  );
}

function findQuestionElements() {
  // Find all elements containing text that ends with a question mark
  const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
    const text = (el.innerText || '').trim();
    const isQuestion = text.endsWith('?') || text.endsWith(':') || /^(match|select|choose|identify|which|what)/i.test(text);
    return isQuestion && text.length > 10 && text.length < 500;
  });

  // Filter out any elements that are just wrappers around another valid question element
  return candidates.filter(el => {
    return !candidates.some(other => el !== other && el.contains(other));
  });
}

function scanForQuestions() {
  const visibleQuestions = new Set();
  
  const questionElements = findQuestionElements();
  questionElements.forEach(el => {
    if (isElementVisible(el)) {
      visibleQuestions.add((el.innerText || '').trim());
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
      
      // Request answer from background with full page context for matching questions
      chrome.runtime.sendMessage(
        { 
          action: 'get_answer', 
          question: text,
          context: document.body.innerText 
        },
        (response) => {
          let ans = 'Error getting answer.';
          if (chrome.runtime.lastError) {
             ans = 'Error: Could not contact background worker. Please click the Reload Extension button in the popup.';
          } else if (response && response.answer) {
             ans = response.answer;
          }
          
          const cacheEntry = questionCache.get(text);
          if (cacheEntry) {
            cacheEntry.answer = ans;
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

// Bind manual scan request from UI
window.StealthUI.onScanRequested = () => {
  // Clear any failed or pending questions from cache so they get retried
  for (const [text, data] of questionCache.entries()) {
    if (!data.answer || data.answer.startsWith('Error')) {
      questionCache.delete(text);
    }
  }
  scanForQuestions();
};
