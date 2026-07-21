window.StealthUI = {
  createOverlay: function() {
    if (document.getElementById('stealth-ex-container')) return;

    const container = document.createElement('div');
    container.id = 'stealth-ex-container';
    document.body.appendChild(container);
  },

  addQABlock: function(questionId, questionText) {
    const container = document.getElementById('stealth-ex-container');
    if (!container) return;

    const block = document.createElement('div');
    block.className = 'stealth-ex-qa-block';
    block.id = `qa-${questionId}`;

    const qDiv = document.createElement('div');
    qDiv.className = 'stealth-ex-question';
    qDiv.textContent = questionText;

    const aDiv = document.createElement('div');
    aDiv.className = 'stealth-ex-loading';
    aDiv.id = `ans-${questionId}`;
    aDiv.textContent = 'Thinking...';

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