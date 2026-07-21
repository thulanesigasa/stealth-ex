let API_KEY = '';

async function loadApiKey() {
  try {
    const response = await fetch(chrome.runtime.getURL('src/background/config.json'));
    const config = await response.json();
    API_KEY = config.OPENAI_API_KEY;
  } catch (err) {
    console.error('Failed to load API key from config.json:', err);
  }
}

// Initial load
loadApiKey();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_answer') {
    handleQuestion(request.question, request.context).then(answer => {
      sendResponse({ answer });
    }).catch(err => {
      console.error(err);
      sendResponse({ answer: 'Error fetching answer: ' + err.message });
    });
    return true; // Indicates async response
  }
});

async function handleQuestion(question, context = '') {
  if (!API_KEY) {
    await loadApiKey();
  }
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return 'Please set your OpenAI API key in src/background/config.json';
  }

  // Cap context length to avoid token limits for very large pages
  const safeContext = context.length > 8000 ? context.substring(0, 8000) + '...' : context;

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
          content: 'You are an expert test solver. You will be provided with a specific question and the full text of the current webpage for context. Solve the specific question using the options or items visible in the context. You must output the answers (whether multiple choice options, match pairs, or ordered lists) EXACTLY as they are written on the page, preserving their exact wording and capitalization. Do not rephrase, summarize, or explain. Output ONLY the raw answer.'
        },
        {
          role: 'user',
          content: `Question to solve: ${question}\n\n--- Page Context ---\n${safeContext}`
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
