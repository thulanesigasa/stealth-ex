window.StealthUI = {
  isClosed: false,
  isMinimized: false,
  
  createOverlay: function() {
    if (this.isClosed) return;
    
    let container = document.getElementById('stealth-ex-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'stealth-ex-container';
      
      const header = document.createElement('div');
      header.className = 'stealth-ex-header';
      
      const title = document.createElement('span');
      title.textContent = 'Stealth-Ex';
      
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
      header.appendChild(title);
      header.appendChild(controls);
      
      const content = document.createElement('div');
      content.id = 'stealth-ex-content';
      
      container.appendChild(header);
      container.appendChild(content);
      document.body.appendChild(container);
    }
  },
  
  toggleMinimize: function() {
    this.isMinimized = !this.isMinimized;
    const content = document.getElementById('stealth-ex-content');
    if (content) {
      content.style.display = this.isMinimized ? 'none' : 'flex';
    }
  },
  
  close: function() {
    this.isClosed = true;
    const container = document.getElementById('stealth-ex-container');
    if (container) {
      container.remove();
    }
  },
  
  clearBlocks: function() {
    if (this.isClosed) return;
    const content = document.getElementById('stealth-ex-content');
    if (content) {
      content.innerHTML = '';
    }
  },

  addQABlock: function(questionId, questionText, answerText) {
    if (this.isClosed) return;
    const content = document.getElementById('stealth-ex-content');
    if (!content) return;

    // If block already exists, bring it to the top (active question) and update it
    let block = document.getElementById(`qa-${questionId}`);
    if (block) {
      const aDiv = document.getElementById(`ans-${questionId}`);
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
    if (this.isClosed) return;
    const aDiv = document.getElementById(`ans-${questionId}`);
    if (aDiv) {
      aDiv.className = 'stealth-ex-answer';
      aDiv.textContent = answerText;
    }
  }
};