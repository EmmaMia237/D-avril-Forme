import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setAuthToken } from './lib/api-client';
import { Button } from './components/ui/button';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const storefrontUrl = (import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:5173")).replace(/\/$/, "") + "/";
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!(res.ok && data?.ok)) {
        setError(data?.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (data.token) {
        try {
          setAuthToken(data.token, remember);
        } catch (err) {}
      }

      try {
        const meRes = await apiFetch('/api/auth/me');
        const me = await meRes.json().catch(() => ({}));
        if (!meRes.ok || !me?.authenticated || !me?.admin) {
          setAuthToken(null as any);
          setError('Account is not authorized as admin.');
          setLoading(false);
          return;
        }
      } catch (err) {
        setError('Failed to verify admin session.');
        setAuthToken(null as any);
        setLoading(false);
        return;
      }

      toast.success('Signed in');
      // Use client navigation to avoid full page reloads and ensure the router handles the route
      navigate('/admin');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(circle at top left, rgba(255, 211, 204, 0.8), rgba(255, 241, 232, 0.72) 26%, rgba(244, 232, 228, 0.92) 62%, rgba(231, 211, 218, 0.9) 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-lg border border-[#f0d6d6] rounded-2xl shadow-[0_24px_80px_rgba(124,81,76,0.18)] p-8 transition-transform transform hover:scale-[1.005]">

          <div className="mb-7 flex justify-center">
            <div className="flex items-center justify-center rounded-[18px] border border-[#3b2724] bg-[#2d1f1c] p-2.5 shadow-[0_10px_24px_rgba(56,34,31,0.16)]">
              <img
                src="/images/logo.png"
                alt="D'avril Forme"
                className="h-14 w-auto max-w-full object-contain drop-shadow-[0_10px_18px_rgba(255,255,255,0.06)]"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>

          <h2 className="text-center text-2xl font-semibold text-[#2a1f1d] mb-1">D’avril Forme – Admin</h2>
          <p className="text-center text-sm text-[#6b4e4a] mb-6">Secure access to the management console</p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#473330]">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl bg-[#fff8f6] border border-[#e9d8d1] px-4 py-3 text-[#2b1f1d] placeholder:text-[#8a6f6a] focus:outline-none focus:ring-2 focus:ring-[#d88a7b] focus:border-[#d88a7b] transition-shadow shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                placeholder="you@yourcompany.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#473330]">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl bg-[#fff8f6] border border-[#e9d8d1] px-4 py-3 pr-12 text-[#2b1f1d] placeholder:text-[#8a6f6a] focus:outline-none focus:ring-2 focus:ring-[#d88a7b] focus:border-[#d88a7b] transition-shadow shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                  placeholder="Enter your password"
                />

                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#704c49] hover:text-[#2b1f1d]">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.97 0-9-4.03-9-9a9.97 9.97 0 012.12-5.5M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className="text-sm text-[#b64d4d]">{error}</div>}

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-[#5d433f]">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-[#dca9a1] bg-[#fff7f5] text-[#d88a7b]" />
                Remember me
              </label>

              <a href="#" className="text-sm text-[#5d433f] hover:text-[#2b1f1d]">Need help?</a>
            </div>

            <div className="flex gap-3 items-center pt-2">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-[#d88a7b] to-[#c97267] text-white hover:brightness-105 hover:shadow-[0_12px_28px_rgba(201,114,103,0.35)] transition-all" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
              <Button variant="ghost" type="button" onClick={() => { setEmail(''); setPassword(''); }} className="text-[#5d433f] hover:bg-[#f7eae7]">Clear</Button>
            </div>

            <div className="pt-4 border-t border-[#f0d9d5] mt-3">
              <div className="flex items-center justify-between text-xs text-[#6b4e4a] mt-3">
                <span>Need support? <a href="mailto:ops@avrilforme.com" className="text-[#3f2a29] underline">ops@avrilforme.com</a></span>
                <a href={storefrontUrl} className="text-[#3f2a29] underline">View storefront</a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
