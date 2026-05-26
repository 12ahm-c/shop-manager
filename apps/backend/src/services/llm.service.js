// LLM service — connects to OpenAI / Mistral / Ollama
// Requires LLM_PROVIDER and LLM_API_KEY environment variables

const https = require('https');

function getConfig() {
  return {
    provider: process.env.LLM_PROVIDER || 'openai',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'gpt-4o-mini'
  };
}

function buildEndpoint(provider) {
  switch (provider) {
    case 'openai':
      return {
        host: 'api.openai.com',
        path: '/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` }
      };
    case 'mistral':
      return {
        host: 'api.mistral.ai',
        path: '/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY}` }
      };
    default:
      return null;
  }
}

async function chat(messages, options = {}) {
  const config = getConfig();
  if (!config.apiKey) {
    return {
      role: 'assistant',
      content: 'L\'assistant IA n\'est pas configuré. Veuillez configurer LLM_API_KEY dans les variables d\'environnement.'
    };
  }

  const endpoint = buildEndpoint(config.provider);
  if (!endpoint) {
    return { role: 'assistant', content: `Provider "${config.provider}" non supporté.` };
  }

  const body = JSON.stringify({
    model: config.model,
    messages,
    temperature: options.temperature || 0.3,
    max_tokens: options.maxTokens || 500,
    timeout: options.timeout || 15000
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: endpoint.host,
      path: endpoint.path,
      method: 'POST',
      headers: {
        ...endpoint.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: options.timeout || 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ role: 'assistant', content: `Erreur LLM: ${parsed.error.message}` });
          } else {
            resolve(parsed.choices?.[0]?.message || { role: 'assistant', content: 'Pas de réponse.' });
          }
        } catch {
          resolve({ role: 'assistant', content: 'Erreur de communication avec le fournisseur LLM.' });
        }
      });
    });
    req.on('error', () => resolve({ role: 'assistant', content: 'Impossible de contacter le fournisseur LLM.' }));
    req.write(body);
    req.end();
  });
}

async function health() {
  const config = getConfig();
  if (!config.apiKey) {
    return { status: 'unconfigured', provider: config.provider };
  }
  const endpoint = buildEndpoint(config.provider);
  if (!endpoint) {
    return { status: 'unsupported_provider', provider: config.provider };
  }
  return { status: 'configured', provider: config.provider, model: config.model };
}

module.exports = { chat, health };
