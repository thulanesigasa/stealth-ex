window.StealthUI = {
  isClosed: false,
  isMinimized: false,
  hostElement: null,
  shadowRoot: null,
  
  createOverlay: function() {
    if (this.isClosed) return;
    
    if (!this.hostElement) {
      // 1. Create Shadow Host element
      const host = document.createElement('div');
      host.id = 'stealth-ex-host';
      this.hostElement = host;
      
      // 2. Attach a CLOSED Shadow DOM root
      // In closed mode, host.shadowRoot evaluates to NULL on any webpage script inspecting DOM nodes!
      const shadow = host.attachShadow({ mode: 'closed' });
      this.shadowRoot = shadow;
      
      // 3. Inject CSS styles into the shadow root
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        #stealth-ex-container {
          position: fixed;
          top: 24px;
          right: 24px;
          width: 365px;
          max-height: 82vh;
          display: flex;
          flex-direction: column;
          /* True translucent frosted glass background */
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.03) 100%), rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(30px) saturate(210%);
          -webkit-backdrop-filter: blur(30px) saturate(210%);
          /* Metallic glass reflection border */
          border: 1px solid rgba(255, 255, 255, 0.28);
          /* Glossy specular top sheen */
          box-shadow: 
            0 30px 60px -12px rgba(0, 0, 0, 0.45), 
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2);
          border-radius: 22px;
          padding: 18px 20px;
          z-index: 2147483647;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #ffffff;
          pointer-events: auto;
          user-select: none;
          box-sizing: border-box;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .stealth-ex-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .stealth-ex-title-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #38bdf8;
          text-transform: uppercase;
          text-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
        }

        .stealth-ex-title-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        }

        .stealth-ex-controls {
          display: flex;
          gap: 6px;
        }

        .stealth-ex-controls button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #cbd5e1;
          cursor: pointer;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .stealth-ex-controls button:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        #stealth-ex-content {
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          padding-right: 4px;
        }

        #stealth-ex-content::-webkit-scrollbar {
          width: 5px;
        }
        #stealth-ex-content::-webkit-scrollbar-track {
          background: transparent;
        }
        #stealth-ex-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 10px;
        }
        #stealth-ex-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.45);
        }

        .stealth-ex-qa-block {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
          padding: 14px 16px;
          border-radius: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .stealth-ex-qa-block:first-child {
          border: 1px solid rgba(56, 189, 248, 0.5);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(15, 23, 42, 0.45);
          box-shadow: 
            0 8px 24px -6px rgba(56, 189, 248, 0.25),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.35);
        }

        .stealth-ex-question {
          font-weight: 600;
          font-size: 13.5px;
          line-height: 1.45;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .stealth-ex-answer {
          font-weight: 600;
          font-size: 13.5px;
          line-height: 1.5;
          color: #34d399;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          white-space: pre-wrap;
          background: rgba(16, 185, 129, 0.12);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(16, 185, 129, 0.35);
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          padding: 10px 14px;
          border-radius: 12px;
        }

        .stealth-ex-answer::before {
          content: '✔';
          font-size: 13.5px;
          color: #34d399;
        }

        .stealth-ex-loading {
          font-size: 12px;
          color: #cbd5e1;
          font-style: italic;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `;
      shadow.appendChild(style);

      // 4. Build overlay container inside the closed shadow root
      const container = document.createElement('div');
      container.id = 'stealth-ex-container';
      
      // Stop event propagation so user interactions inside overlay don't trigger host page event tracking!
      ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(evt => {
        container.addEventListener(evt, (e) => e.stopPropagation());
      });

      const header = document.createElement('div');
      header.className = 'stealth-ex-header';
      
      const titleBadge = document.createElement('div');
      titleBadge.className = 'stealth-ex-title-badge';
      
      const dot = document.createElement('div');
      dot.className = 'stealth-ex-title-dot';
      
      const title = document.createElement('span');
      title.textContent = 'Stealth-Ex';
      
      titleBadge.appendChild(dot);
      titleBadge.appendChild(title);
      
      const controls = document.createElement('div');
      controls.className = 'stealth-ex-controls';
      
      const scanBtn = document.createElement('button');
      scanBtn.innerHTML = '&#8635;'; // refresh symbol
      scanBtn.title = 'Scan Now';
      scanBtn.onclick = () => {
        if (typeof this.onScanRequested === 'function') {
          this.onScanRequested();
        }
      };
      
      const minBtn = document.createElement('button');
      minBtn.innerHTML = '&#9472;'; // simple line
      minBtn.title = 'Minimize';
      minBtn.onclick = () => this.toggleMinimize();
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&#10005;'; // X mark
      closeBtn.title = 'Close';
      closeBtn.onclick = () => this.close();
      
      controls.appendChild(scanBtn);
      controls.appendChild(minBtn);
      controls.appendChild(closeBtn);
      header.appendChild(titleBadge);
      header.appendChild(controls);
      
      const content = document.createElement('div');
      content.id = 'stealth-ex-content';
      
      container.appendChild(header);
      container.appendChild(content);
      shadow.appendChild(container);
      
      document.body.appendChild(host);
    }
  },
  
  toggleMinimize: function() {
    this.isMinimized = !this.isMinimized;
    if (this.shadowRoot) {
      const content = this.shadowRoot.getElementById('stealth-ex-content');
      if (content) {
        content.style.display = this.isMinimized ? 'none' : 'flex';
      }
    }
  },
  
  close: function() {
    this.isClosed = true;
    if (this.hostElement) {
      this.hostElement.remove();
      this.hostElement = null;
      this.shadowRoot = null;
    }
  },
  
  clearBlocks: function() {
    if (this.isClosed || !this.shadowRoot) return;
    const content = this.shadowRoot.getElementById('stealth-ex-content');
    if (content) {
      content.innerHTML = '';
    }
  },

  addQABlock: function(questionId, questionText, answerText) {
    if (this.isClosed || !this.shadowRoot) return;
    const content = this.shadowRoot.getElementById('stealth-ex-content');
    if (!content) return;

    // If block already exists, bring it to the top (active question) and update it
    let block = this.shadowRoot.getElementById(`qa-${questionId}`);
    if (block) {
      const aDiv = this.shadowRoot.getElementById(`ans-${questionId}`);
      if (aDiv && answerText) {
        aDiv.className = 'stealth-ex-answer';
        aDiv.textContent = answerText;
      }
      content.prepend(block);
      return;
    }

    block = document.createElement('div');
    block.className = 'stealth-ex-qa-block';
    block.id = `qa-${questionId}`;

    const qDiv = document.createElement('div');
    qDiv.className = 'stealth-ex-question';
    qDiv.textContent = questionText;

    const aDiv = document.createElement('div');
    aDiv.id = `ans-${questionId}`;
    
    if (answerText) {
      aDiv.className = 'stealth-ex-answer';
      aDiv.textContent = answerText;
    } else {
      aDiv.className = 'stealth-ex-loading';
      aDiv.textContent = 'Thinking...';
    }

    block.appendChild(qDiv);
    block.appendChild(aDiv);
    
    // Prepend to top so the newest question is always above the previous ones
    content.prepend(block);

    // Limit history log to the last 15 questions to keep it lightweight
    while (content.children.length > 15) {
      content.removeChild(content.lastChild);
    }
  },

  updateAnswer: function(questionId, answerText) {
    if (this.isClosed || !this.shadowRoot) return;
    const aDiv = this.shadowRoot.getElementById(`ans-${questionId}`);
    if (aDiv) {
      aDiv.className = 'stealth-ex-answer';
      aDiv.textContent = answerText;
    }
  }
};