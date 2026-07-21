window.StealthUI = {
  createOverlay: function() {
    let container = document.getElementById('stealth-ex-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'stealth-ex-container';
      document.body.appendChild(container);
    }
  },
  
  clearBlocks: function() {
    const container = document.getElementById('stealth-ex-container');
    if (container) {
      container.innerHTML = '';
    }
  },

  addQABlock: function(questionId, questionText, answerText) {
    const container = document.getElementById('stealth-ex-container');
    if (!container) return;

    const block = document.createElement('div');
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
    container.appendChild(block);
  },

  updateAnswer: function(questionId, answerText) {
    const aDiv = document.getElementById(`ans-${questionId}`);
    if (aDiv) {
      aDiv.className = 'stealth-ex-answer';
      aDiv.textContent = answerText;
    }
  }
};