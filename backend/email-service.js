const { Resend } = require('resend');
const crypto = require('crypto');
const EmailLog = require('./models/EmailLog');
const templates = require('./email-templates');

const FROM = 'OsanPrints <info@osanprints.com>';
const REPLY_TO = 'info@osanprints.com';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function sendEmail({ to, type, dedupeKey, subject, template, orderId, stripeEventId, productId, replyTo = REPLY_TO, marketing = false }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!validEmail(recipient)) {
    console.warn(`Skipping ${type} email: invalid recipient`);
    return { sent: false, skipped: true };
  }
  if (!resend) {
    console.warn(`Skipping ${type} email: RESEND_API_KEY is not configured`);
    return { sent: false, skipped: true };
  }

  let log;
  try {
    log = await EmailLog.create({ dedupeKey, recipient, type, orderId: orderId || null, stripeEventId: stripeEventId || null, productId: productId || null });
  } catch (error) {
    if (error?.code === 11000) {
      log = await EmailLog.findOne({ dedupeKey });
      if (!log || log.status === 'sent') return { sent: false, duplicate: true };
      log.status = 'pending';
      log.error = null;
      await log.save();
    } else {
      throw error;
    }
  }

  try {
    const result = await resend.emails.send({ from: FROM, to: [recipient], reply_to: replyTo, subject, html: template.html, text: template.text, headers: marketing ? { 'List-Unsubscribe': `<${process.env.FRONTEND_URL || 'https://osanprints.com'}/account/orders>` } : undefined });
    if (result?.error) throw new Error(result.error.message || 'Resend rejected the email');
    await EmailLog.findByIdAndUpdate(log._id, { status: 'sent', resendEmailId: result?.data?.id || null, sentAt: new Date() });
    return { sent: true, id: result?.data?.id || null };
  } catch (error) {
    await EmailLog.findByIdAndUpdate(log._id, { status: 'failed', error: String(error?.message || error).slice(0, 500) });
    console.error(`Resend ${type} email failed:`, error?.message || error);
    return { sent: false, error: true };
  }
}

async function sendOrderConfirmationEmail(order, stripeEventId) {
  return sendEmail({ to: order.userEmail, type: 'payment_success', dedupeKey: `payment-success:${stripeEventId || order.sessionId}`, subject: `Order ${order.trackingNumber} confirmed`, template: templates.paymentSuccess(order), orderId: order._id, stripeEventId });
}

async function sendPaymentFailedEmail(order, stripeEventId) {
  return sendEmail({ to: order.userEmail, type: 'payment_failed', dedupeKey: `payment-failed:${stripeEventId || order.sessionId}`, subject: `Payment issue with order ${order.trackingNumber}`, template: templates.paymentFailed(order), orderId: order._id, stripeEventId });
}

async function sendOrderStatusEmail(order, previousStatus) {
  const customerStatuses = new Set(['Paid', 'Payment Failed', 'Payment Pending', 'Design Review', 'In Production', 'Awaiting Print', 'Ready to Print', 'Shipped', 'Completed', 'Cancelled', 'Canceled']);
  if (!order.userEmail || !customerStatuses.has(order.status) || order.status === previousStatus) return { sent: false, skipped: true };
  return sendEmail({ to: order.userEmail, type: 'order_status', dedupeKey: `order-status:${order._id}:${order.status}`, subject: `Order ${order.trackingNumber} update`, template: templates.orderStatus(order), orderId: order._id });
}

async function sendNewProductEmail(user, product) {
  return sendEmail({ to: user.email, type: 'new_arrival', dedupeKey: `new-arrival:${product._id}:${user._id}`, subject: `New from ${product.name}`, template: templates.newArrival(product), productId: product._id, marketing: true });
}

async function sendRecommendationEmail(user, products) {
  return sendEmail({ to: user.email, type: 'recommendations', dedupeKey: `recommendations:${user._id}:${new Date().toISOString().slice(0, 10)}`, subject: 'Products picked for you', template: templates.recommendations(products), marketing: true });
}

async function sendContactInquiryEmail(inquiry) {
  return sendEmail({
    to: 'info@osanprints.com',
    type: 'contact_inquiry',
    dedupeKey: `contact-inquiry:${crypto.randomUUID()}`,
    subject: `Customer inquiry: ${inquiry.subject}`,
    template: templates.contactInquiry(inquiry),
    replyTo: inquiry.email,
  });
}

module.exports = { sendOrderConfirmationEmail, sendPaymentFailedEmail, sendOrderStatusEmail, sendNewProductEmail, sendRecommendationEmail, sendContactInquiryEmail };
