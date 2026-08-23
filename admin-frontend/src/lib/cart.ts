export function readStoredOrders() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem('af_orders');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}
