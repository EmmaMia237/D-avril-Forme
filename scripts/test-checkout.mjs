import 'dotenv/config';
import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/payment/create-checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: [{ name: 'Test Item', amount: 10.0, quantity: 1, currency: 'gbp' }],
        success_url: 'http://localhost:5174/',
        cancel_url: 'http://localhost:5174/',
      }),
    });
    const data = await res.json().catch(() => null);
    console.log('Status:', res.status);
    console.log('Body:', data);
  } catch (err) {
    console.error('Checkout test failed:', err);
  }
})();
