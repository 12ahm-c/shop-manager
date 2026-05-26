// WhatsApp service
// Production: requires `axios` npm package
// Uses Meta (formerly Facebook) WhatsApp Cloud API

const https = require('https');

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

function getConfig() {
  return {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };
}

async function sendInvoice(phone, pdfUrl, invoiceNumber) {
  const config = getConfig();
  if (!config.token || !config.phoneNumberId) {
    console.log(`[WhatsApp] Dev mode: skipping send to ${phone} for invoice ${invoiceNumber}`);
    return null;
  }

  const body = JSON.stringify({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'document',
    document: { link: pdfUrl, filename: `Invoice_${invoiceNumber}.pdf` }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(`${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendTextMessage(phone, message) {
  const config = getConfig();
  if (!config.token || !config.phoneNumberId) {
    console.log(`[WhatsApp] Dev mode: skipping text to ${phone}`);
    return null;
  }

  const body = JSON.stringify({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: message }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(`${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { sendInvoice, sendTextMessage };
