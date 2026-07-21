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

  // Walk up the DOM tree to ensure no parent wrapper is hidden, faded out, or collapsed with overflow hidden
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.opacity < 0.05 || style.visibility === 'hidden' || style.display === 'none') {
      return false;
    }
    // Check if parent is collapsed to 0 height/width and clipping its children
    if (style.overflow === 'hidden' || style.overflowY === 'hidden' || style.overflowX === 'hidden') {
      const parentRect = current.getBoundingClientRect();
      if (parentRect.height < 5 || parentRect.width < 5) {
        return false;
      }
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

    // Filter out common header/footer/navigation text
    const textLower = text.toLowerCase();
    const exactBlacklist = ['next', 'previous', 'submit', 'quit', 'exit', 'menu', 'nav', 'navigation', 'back', 'skip', 'continue', 'quit quiz', 'submit quiz'];
    if (exactBlacklist.includes(textLower)) return false;
    
    if (/^(question\s+no|time|score|points|timer)/i.test(text) && text.length < 30) return false;
    if (/(quiz|test|exam)/i.test(text) && text.length < 30) return false;

    // Must not be an interactive option or button
    let current = el;
    let depth = 0;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      if (style.cursor === 'pointer' || style.cursor === 'grab' || style.cursor === 'grabbing') {
        return false;
      }
      const tagName = current.tagName.toLowerCase();
      if (
        tagName === 'button' || 
        tagName === 'a' || 
        tagName === 'input' || 
        current.getAttribute('role') === 'button'
      ) {
        return false;
      }
      // Only filter out class names on the option itself or its immediate parent
      if (depth < 2) {
        const className = (current.className || '').toString().toLowerCase();
        if (
          className.includes('option') ||
          className.includes('choice') ||
          className.includes('btn') ||
          className.includes('drag') ||
          className.includes('drop')
        ) {
          return false;
        }
      }
      current = current.parentElement;
      depth++;
    }

    // Must look like a sentence or instruction (at least 3 words and contains letters)
    const words = text.split(/\s+/);
    if (words.length < 3) return false;
    if (!/[a-zA-Z]/.test(text)) return false;

    return true;
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

// Periodically check for dynamically added/removed questions (fallback)
setInterval(scanForQuestions, 200);

let lastScannedText = '';

// 1. Resilient Global Mutation Observer on document.body - scans instantly without debouncing delay
const observer = new MutationObserver(() => {
  const candidates = findQuestionElements();
  const visible = candidates.filter(isElementVisible);
  
  if (visible.length > 0) {
    const text = (visible[visible.length - 1].innerText || '').trim();
    if (text !== lastScannedText) {
      lastScannedText = text;
      // IMMEDIATE ACTION: Reset old blocks from the UI
      window.StealthUI.clearBlocks();
      scanForQuestions();
    }
  } else {
    if (lastScannedText !== '') {
      lastScannedText = '';
      window.StealthUI.clearBlocks();
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// 2. Intercept History events (pushState/replaceState) for SPAs using client-side routing
function interceptHistory() {
  const wrapHistory = (type) => {
    const orig = history[type];
    return function() {
      const res = orig.apply(this, arguments);
      const ev = new Event(type.toLowerCase());
      ev.arguments = arguments;
      window.dispatchEvent(ev);
      return res;
    };
  };
  
  history.pushState = wrapHistory('pushState');
  history.replaceState = wrapHistory('replaceState');
}

// Inject history interceptors into the webpage context
const script = document.createElement('script');
script.textContent = `
  (${interceptHistory.toString()})();
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

// Listen for history and popstate navigation events to immediately reset UI
const handleNavigation = () => {
  lastScannedText = '';
  window.StealthUI.clearBlocks();
  scanForQuestions();
};

window.addEventListener('popstate', handleNavigation);
window.addEventListener('pushstate', handleNavigation);
window.addEventListener('replacestate', handleNavigation);

// Bind manual scan request from UI
window.StealthUI.onScanRequested = () => {
  // Clear any failed or pending questions from cache so they get retried
  for (const [text, data] of questionCache.entries()) {
    if (!data.answer || data.answer.startsWith('Error')) {
      questionCache.delete(text);
    }
  }
  lastScannedText = ''; // force update
  scanForQuestions();
};
