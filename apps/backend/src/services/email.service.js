// Email service
// Production: requires `nodemailer` npm package

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // nodemailer not installed — dev fallback
}

function getTransporter() {
  if (!nodemailer) return null;
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return null;
  return nodemailer.createTransport(smtpUrl);
}

async function sendInvoice(email, pdfUrl, invoiceNumber) {
  if (!getTransporter()) {
    console.log(`[Email] Dev mode: skipping send to ${email} for invoice ${invoiceNumber}`);
    return null;
  }

  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@shopmanager.com',
    to: email,
    subject: `Invoice ${invoiceNumber}`,
    html: `<p>Dear customer,<br>Please find attached your invoice <strong>${invoiceNumber}</strong>.</p>`,
    attachments: pdfUrl ? [{ filename: `Invoice_${invoiceNumber}.pdf`, path: pdfUrl }] : []
  });
}

async function sendAdminAlert(email, subject, message) {
  if (!getTransporter()) {
    console.log(`[Email] Dev mode: skipping alert to ${email}`);
    return null;
  }

  const transporter = getTransporter();
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@shopmanager.com',
    to: email,
    subject: `[ShopManager] ${subject}`,
    html: `<p>${message}</p>`
  });
}

module.exports = { sendInvoice, sendAdminAlert };
