window.StealthUI.createOverlay();

const questionCache = new Map(); // text -> { id, answer }

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  
  // Basic geometry checks
  if (!(
    rect.width > 5 &&
    rect.height > 5 &&
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom > 0 &&
    rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
    rect.right > 0
  )) {
    return false;
  }

  // Walk up the DOM tree to ensure no parent wrapper is hidden or faded out
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.opacity < 0.05 || style.visibility === 'hidden' || style.display === 'none') {
      return false;
    }
    // Check for common inactive carousel slide attributes
    if (current.getAttribute('aria-hidden') === 'true' || style.pointerEvents === 'none') {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

function findQuestionElements() {
  const candidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, li')).filter(el => {
    const text = (el.innerText || '').trim();
    if (text.length < 12 || text.length > 500) return false;

    // Must not be an interactive option or button
    let current = el;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.cursor === 'pointer' || style.cursor === 'grab' || style.cursor === 'grabbing') {
        return false;
      }
      const className = (current.className || '').toString().toLowerCase();
      const tagName = current.tagName.toLowerCase();
      if (
        tagName === 'button' || 
        tagName === 'a' || 
        tagName === 'input' || 
        current.getAttribute('role') === 'button' ||
        className.includes('option') ||
        className.includes('choice') ||
        className.includes('btn') ||
        className.includes('drag') ||
        className.includes('drop')
      ) {
        return false;
      }
      current = current.parentElement;
    }

    // Broad set of keywords commonly found in questions/instructions
    const hasQuestionIndicator = text.endsWith('?') || /\b(write|create|explain|define|match|select|choose|identify|which|what|how|why|when|where|evaluate|solve|true|false|arrange|order|steps?|implement|determine|fill|complete|correct|incorrect|result|output|print|happen|perform|assignment|python|code|program)\b/i.test(text);
    
    return hasQuestionIndicator;
  });

  // Filter out any elements that are just wrappers around another valid question element
  return candidates.filter(el => {
    return !candidates.some(other => el !== other && el.contains(other));
  });
}

function scanForQuestions() {
  const candidates = findQuestionElements();
  const visibleQuestions = [];
  
  candidates.forEach(el => {
    if (isElementVisible(el)) {
      const text = (el.innerText || '').trim();
      if (!visibleQuestions.includes(text)) {
        visibleQuestions.push(text);
      }
    }
  });

  window.StealthUI.clearBlocks();

  // STRICT LIMIT: Only display the LAST valid question found in the DOM.
  // This permanently eliminates ghost slide stacking in modern SPAs/carousels.
  if (visibleQuestions.length > 0) {
    const text = visibleQuestions[visibleQuestions.length - 1];

    if (!questionCache.has(text)) {
      const questionId = Date.now().toString() + Math.floor(Math.random() * 1000);
      questionCache.set(text, { id: questionId, answer: null });
      
      // Request answer from background with full page context for matching questions
      try {
        chrome.runtime.sendMessage(
          { 
            action: 'get_answer', 
            question: text,
            context: document.body.innerText || ''
          },
          (response) => {
            let ans = 'Error getting answer.';
            if (chrome.runtime.lastError) {
               ans = 'Error: Could not contact worker. Please refresh the page.';
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

        // Watchdog timeout to prevent infinite hanging
        setTimeout(() => {
          const check = questionCache.get(text);
          if (check && !check.answer) {
            check.answer = 'Error: API request timed out (15s). Try Scan Now.';
            window.StealthUI.updateAnswer(check.id, check.answer);
          }
        }, 15000);

      } catch (err) {
        // This catches "Extension context invalidated" if the user reloaded the extension
        const cacheEntry = questionCache.get(text);
        if (cacheEntry) {
          cacheEntry.answer = 'Error: Extension was reloaded. Please refresh this webpage.';
          window.StealthUI.updateAnswer(cacheEntry.id, cacheEntry.answer);
        }
      }
    }
    
    // Add the block (it will use the cached answer if available, or 'Thinking...' if null)
    const cacheData = questionCache.get(text);
    window.StealthUI.addQABlock(cacheData.id, text, cacheData.answer);
  }
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
