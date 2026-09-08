const BRAND = 'OsanPrints';
const APP_URL = (process.env.FRONTEND_URL || 'https://osanprints.com').replace(/\/$/, '');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f7f3ef;font-family:Arial,sans-serif;color:#2f2925">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px">
      <div style="background:#241f1c;color:#fff;padding:20px 24px;font-size:24px;font-weight:700">${BRAND}</div>
      <main style="background:#fff;padding:28px 24px"><h1 style="font-size:24px;margin:0 0 20px">${escapeHtml(title)}</h1>${body}</main>
      <p style="font-size:12px;color:#746b65;text-align:center">You are receiving this email from ${BRAND}. Reply to info@osanprints.com for help.</p>
    </div></body></html>`;
}

function itemLines(items) {
  return (items || []).map((item) => `<li>${escapeHtml(item.name || 'Item')} &times; ${Number(item.quantity || 1)} — £${Number(item.price || 0).toFixed(2)}</li>`).join('');
}

function orderEmail(order, title, message) {
  const name = escapeHtml(order.userName || 'there');
  const lines = itemLines(order.items);
  return {
    html: layout(title, `<p>Hi ${name},</p><p>${message}</p><p><strong>Order:</strong> ${escapeHtml(order.trackingNumber)}</p><ul>${lines}</ul><p><strong>Total:</strong> £${Number(order.total || 0).toFixed(2)}</p><p><a href="${APP_URL}/account/orders">View your orders</a></p>`),
    text: `Hi ${order.userName || 'there'},\n\n${message}\nOrder: ${order.trackingNumber}\n${(order.items || []).map((item) => `${item.name} x ${item.quantity || 1} - £${Number(item.price || 0).toFixed(2)}`).join('\n')}\nTotal: £${Number(order.total || 0).toFixed(2)}\nView your orders: ${APP_URL}/account/orders`,
  };
}

function paymentSuccess(order) {
  return orderEmail(order, 'Your order is confirmed', 'Your payment was successful and your order is now being prepared.');
}

function paymentFailed(order) {
  return orderEmail(order, 'Payment unsuccessful', 'We could not complete your payment. Please try checkout again or contact us if you need help.');
}

function orderStatus(order) {
  return orderEmail(order, `Order update: ${order.status}`, `Your order status is now <strong>${escapeHtml(order.status)}</strong>.`);
}

function newArrival(product) {
  const image = product.images?.[0]?.url || product.previewPaths?.[0];
  const imageMarkup = image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" style="max-width:100%;height:220px;object-fit:cover">` : '';
  return {
    html: layout('New product you may like', `${imageMarkup}<h2>${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description || '')}</p><p><strong>£${Number(product.salePrice ?? product.price ?? 0).toFixed(2)}</strong></p><p><a href="${APP_URL}/product/${encodeURIComponent(product._id)}">View product</a> · <a href="${APP_URL}">Shop new arrivals</a></p><p style="font-size:12px"><a href="${APP_URL}/account/orders">Manage email preferences</a></p>`),
    text: `New from ${BRAND}: ${product.name}\n${product.description || ''}\n£${Number(product.salePrice ?? product.price ?? 0).toFixed(2)}\nView: ${APP_URL}/product/${product._id}\nManage preferences: ${APP_URL}/account/orders`,
  };
}

function recommendations(products) {
  const list = (products || []).map((product) => `<li><a href="${APP_URL}/product/${encodeURIComponent(product._id)}">${escapeHtml(product.name)}</a> — £${Number(product.salePrice ?? product.price ?? 0).toFixed(2)}</li>`).join('');
  return {
    html: layout('Products picked for you', `<p>Based on what you have purchased, these products may be a good fit:</p><ul>${list}</ul><p><a href="${APP_URL}">Continue shopping</a></p>`),
    text: `Products picked for you:\n${(products || []).map((product) => `${product.name} - ${APP_URL}/product/${product._id}`).join('\n')}`,
  };
}

function contactInquiry({ name, email, orderId, subject, message }) {
  return {
    html: layout(`Customer inquiry: ${subject}`, `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Order ID:</strong> ${escapeHtml(orderId || 'Not provided')}</p><p><strong>Subject:</strong> ${escapeHtml(subject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`),
    text: `Customer inquiry\n\nName: ${name}\nEmail: ${email}\nOrder ID: ${orderId || 'Not provided'}\nSubject: ${subject}\n\n${message}`,
  };
}

module.exports = { paymentSuccess, paymentFailed, orderStatus, newArrival, recommendations, contactInquiry };
