let API_KEY = '';

async function loadApiKey() {
  try {
    const response = await fetch(chrome.runtime.getURL('src/background/config.json'));
    const config = await response.json();
    API_KEY = config.GROQ_API_KEY;
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
    return 'Please set your Groq API key in src/background/config.json';
  }

  // Cap context length to avoid token limits for very large pages
  const safeContext = context.length > 8000 ? context.substring(0, 8000) + '...' : context;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: 'You are an expert test solver. You will be provided with a specific question and the full text of the current webpage for context. Solve the specific question using the options or items visible in the context.\n\nYou MUST respond in valid JSON format containing two keys:\n1. "reasoning" (your step-by-step logic to determine the correct answer)\n2. "answer" (the EXACT raw text of the correct option as written on the page, without any additional formatting or explanation).\n\nDo not include markdown blocks outside the JSON.'
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
  const content = data.choices[0].message.content.trim();
  
  try {
    // Parse the JSON to extract just the raw answer for the UI
    const parsed = JSON.parse(content);
    return parsed.answer || content;
  } catch (e) {
    // Fallback if the model failed to output valid JSON
    return content;
  }
}
