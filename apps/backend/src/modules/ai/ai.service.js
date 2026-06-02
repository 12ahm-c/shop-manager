const mongoose = require('mongoose');
const llmService = require('../../services/llm.service');
const Log = require('../admin/log.model');

const SYSTEM_PROMPT = `You are ShopBot, the AI assistant for ShopManager Pro, a retail management system.
You help store staff understand their sales, stock, customers, and finances.
Always answer in French. Be concise and use numbers when relevant.
You can query the database when the user asks about specific data.
Rules:
- Never expose other stores' data — always filter by storeId.
- Never reveal purchasePrice, profit, or sensitive financial data to employee role.
- If asked about something outside retail management, politely decline.`;

const SUGGESTIONS = {
  employee: [
    'Quel est mon total de ventes aujourd\'hui ?',
    'Quels sont mes produits les plus vendus ?',
    'Combien de clients avons-nous aujourd\'hui ?',
    'Affiche les alertes de stock critiques'
  ],
  admin: [
    'Quel est le chiffre d\'affaires du mois ?',
    'Quels sont les clients avec des dettes impayées ?',
    'Quelle est la marge bénéficiaire totale ?',
    'Montre-moi les produits en rupture de stock',
    'Quel est le solde total des caisses ?'
  ],
  accountant: [
    'Rapport de trésorerie du mois',
    'Analyse de rentabilité par catégorie',
    'Dettes fournisseurs vieillies',
    'Situation des comptes bancaires'
  ]
};

async function processChat(userMessage, user) {
  const startTime = Date.now();

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + `\nL'utilisateur a le rôle: ${user.role} et storeId: ${user.storeId}` },
    { role: 'user', content: userMessage }
  ];

  const response = await llmService.chat(messages, { temperature: 0.3, maxTokens: 500 });

  // Append audit log
  await Log.create({
    storeId: user.storeId,
    userId: user.id,
    action: 'settings_change',
    entity: 'Store',
    entityId: null,
    details: {
      aiQuery: userMessage,
      aiResponse: response.content?.substring(0, 500),
      duration: Date.now() - startTime
    }
  });

  return {
    query: userMessage,
    response: response.content,
    role: response.role,
    duration: Date.now() - startTime
  };
}

function getSuggestions(role) {
  return SUGGESTIONS[role] || SUGGESTIONS.employee;
}

module.exports = { processChat, getSuggestions };
