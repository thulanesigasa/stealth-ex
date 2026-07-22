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
    // 1. Ignore any elements inside our own Stealth-Ex UI overlay
    if (el.closest('#stealth-ex-container')) return false;

    const text = (el.innerText || '').trim();
    if (text.length < 10 || text.length > 500) return false;

    // 2. Filter out common header/footer/navigation text & breadcrumbs
    const textLower = text.toLowerCase();
    const exactBlacklist = ['next', 'previous', 'submit', 'quit', 'exit', 'menu', 'nav', 'navigation', 'back', 'skip', 'continue', 'quit quiz', 'submit quiz', 'skip question'];
    if (exactBlacklist.includes(textLower)) return false;
    
    // Ignore breadcrumbs, navigation headings, prerequisites, tabs, and multi-line menu summaries
    if (/^(go to|module|chapter|unit|section|lesson|page|index|summary|table of contents|pre-requisite|prerequisite|course|instructions|assignments|content|gradebook|announcement)/i.test(text)) return false;
    if (/\b(assignments|gradebook|announcements)\b/i.test(text)) return false;
    if (/^(question\s+\d+|time|score|points|timer)/i.test(text) && text.length < 35) return false;
    if (/(quiz|test|exam|checkpoint)/i.test(text) && text.length < 35) return false;

    // 3. Must not be an interactive option, button, label, or choice
    let current = el;
    while (current && current !== document.body) {
      if (current.id === 'stealth-ex-container') return false;

      const style = window.getComputedStyle(current);
      if (style.cursor === 'pointer' || style.cursor === 'grab' || style.cursor === 'grabbing') {
        return false;
      }
      const tagName = current.tagName.toLowerCase();
      if (
        tagName === 'button' || 
        tagName === 'a' || 
        tagName === 'input' || 
        tagName === 'label' ||
        tagName === 'nav' ||
        tagName === 'footer' ||
        tagName === 'header' ||
        current.getAttribute('role') === 'button' ||
        current.getAttribute('role') === 'radio' ||
        current.getAttribute('role') === 'checkbox' ||
        current.getAttribute('role') === 'option' ||
        current.getAttribute('role') === 'tab' ||
        current.getAttribute('role') === 'tablist' ||
        current.getAttribute('role') === 'navigation'
      ) {
        return false;
      }
      
      const className = (current.className || '').toString().toLowerCase();
      if (
        className.includes('option') ||
        className.includes('choice') ||
        className.includes('btn') ||
        className.includes('button') ||
        className.includes('drag') ||
        className.includes('drop') ||
        className.includes('answer') ||
        className.includes('breadcrumb') ||
        className.includes('nav') ||
        className.includes('tab') ||
        className.includes('menu') ||
        className.includes('header') ||
        className.includes('footer')
      ) {
        return false;
      }
      current = current.parentElement;
    }

    // 4. Must look like a sentence or instruction (at least 2 words and contains letters)
    const words = text.split(/\s+/);
    if (words.length < 2) return false;
    if (!/[a-zA-Z]/.test(text)) return false;

    return true;
  });

  // Filter out any elements that are just wrappers around another valid question element
  return candidates.filter(el => {
    return !candidates.some(other => el !== other && el.contains(other));
  });
}

function scanForQuestions() {
  if (window.location.href !== lastLocationHref) {
    lastLocationHref = window.location.href;
    lastScannedText = '';
    window.StealthUI.clearBlocks();
  }

  const candidates = findQuestionElements();
  const visibleCandidates = [];
  
  candidates.forEach(el => {
    if (isElementVisible(el)) {
      const text = (el.innerText || '').trim();
      if (!visibleCandidates.some(c => c.text === text)) {
        visibleCandidates.push({ el, text });
      }
    }
  });

  if (visibleCandidates.length > 0) {
    // 1. First priority: Candidates that end with '?'
    let bestMatch = visibleCandidates.find(c => c.text.trim().endsWith('?'));

    // 2. Second priority: Candidates starting with question keywords
    if (!bestMatch) {
      bestMatch = visibleCandidates.find(c => 
        /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test(c.text.trim())
      );
    }

    // 3. Fallback to candidate containing a question mark anywhere
    if (!bestMatch) {
      bestMatch = visibleCandidates.find(c => c.text.includes('?'));
    }

    // Fallback to the candidate highest up in DOM (or main content area)
    if (!bestMatch) {
      bestMatch = visibleCandidates[0];
    }

    const text = bestMatch.text;

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
    
    // Add the block or bring the active question block to the top of the history list
    const cacheData = questionCache.get(text);
    window.StealthUI.addQABlock(cacheData.id, text, cacheData.answer);
  }
}

// Initial scan
setTimeout(scanForQuestions, 1000);

// Periodically check for dynamically added/removed questions (fallback)
setInterval(scanForQuestions, 200);

let lastScannedText = '';
let lastLocationHref = window.location.href;

// 1. Resilient Global Mutation Observer on document.body - scans instantly without debouncing delay
const observer = new MutationObserver(() => {
  const candidates = findQuestionElements();
  const visible = candidates.filter(isElementVisible);
  
  if (visible.length > 0) {
    let bestMatch = visible.find(el => {
      const txt = (el.innerText || '').trim();
      return txt.endsWith('?') || /^(which|what|why|how|when|where|who|select|choose|identify|match|true|false)\b/i.test(txt);
    }) || visible[0];

    const text = (bestMatch.innerText || '').trim();
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

// Listen for standard popstate navigation events to immediately reset UI
const handleNavigation = () => {
  lastScannedText = '';
  window.StealthUI.clearBlocks();
  scanForQuestions();
};

window.addEventListener('popstate', handleNavigation);

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
