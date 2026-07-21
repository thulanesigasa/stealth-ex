document.addEventListener('DOMContentLoaded', () => {
  const reloadBtn = document.getElementById('reloadBtn');
  if (reloadBtn) {
    reloadBtn.onclick = () => {
      chrome.runtime.reload();
    };
  }
});
