import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import AdminLayout from './admin';
import AdminLogin from './admin.login';
import AdminIndex from './admin.index';
import Orders from './admin.orders';
import OrderDetail from './admin.order';
import Designs from './admin.designs';
import Payments from './admin.payments';
import Customers from './admin.customers';
import Settings from './admin.settings';
import AdminOffers from './admin.offers';
import AdminCategories from './admin.categories';

import './styles.css';
import { registerSW } from './registerServiceWorker';

// Register service worker (production only)
try { registerSW(); } catch (e) { console.warn('SW register error', e); }

// Dev: suppress noisy React Router future-flag warnings in the console (benign)
if (typeof window !== 'undefined') {
  const _origWarn = console.warn.bind(console);
  console.warn = (...args) => {
    try {
      const first = args[0];
      if (typeof first === 'string' && first.includes('React Router Future Flag Warning')) return;
    } catch (e) {
      // ignore
    }
    _origWarn(...args);
  };
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin/login" replace /> },
  { path: '/admin/login', element: <AdminLogin /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminIndex /> },
      { path: 'designs', element: <Designs /> },
      { path: 'orders', element: <Orders /> },
      { path: 'orders/:id', element: <OrderDetail /> },
      { path: 'payments', element: <Payments /> },
      { path: 'customers', element: <Customers /> },
    { path: 'categories', element: <AdminCategories /> },
    { path: 'offers', element: <AdminOffers /> },
    { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/admin/login" replace /> },
], {
  future: { v7_startTransition: true, v7_relativeSplatPath: true },
});

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
