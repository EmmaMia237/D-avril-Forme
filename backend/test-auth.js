(async () => {
  const base = 'http://localhost:4000';
  async function post(path, body) {
    try {
      const res = await fetch(base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      console.log(`\n=== ${path} ===`);
      console.log('status:', res.status);
      console.log('headers:', Object.fromEntries(res.headers.entries()));
      try { console.log('body(json):', JSON.parse(text)); } catch (e) { console.log('body(text):', text); }
    } catch (err) {
      console.error('request failed', err);
    }
  }

  await post('/api/auth/register', { name: 'Node Tester', email: 'node-tester@example.com', password: 'nodepass', address: 'addr' });
  await post('/api/auth/login', { email: 'node-tester@example.com', password: 'nodepass' });
  await post('/api/auth/admin-login', { email: 'admin@yourdomain.com', password: 'changeme' });
})();
