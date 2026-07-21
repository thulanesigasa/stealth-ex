importScripts('config.js');
const API_KEY = CONFIG.OPENAI_API_KEY;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_answer') {
    handleQuestion(request.question).then(answer => {
      sendResponse({ answer });
    }).catch(err => {
      console.error(err);
      sendResponse({ answer: 'Error fetching answer: ' + err.message });
    });
    return true; // Indicates async response
  }
});

async function handleQuestion(question) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return 'Please set your OpenAI API key in src/background/index.js';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You must output ONLY the answer to the user\'s question. You must not read back the question, and you must not provide any explanation or context. Just the direct answer.'
        },
        {
          role: 'user',
          content: question
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error('API request failed: ' + err);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
