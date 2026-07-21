// Options page logic to save API Key
document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.local.set({ openai_api_key: apiKey }, () => {
    alert('API Key saved!');
  });
});

// Load existing key
chrome.storage.local.get(['openai_api_key'], (result) => {
  if (result.openai_api_key) {
    document.getElementById('apiKey').value = result.openai_api_key;
  }
});
