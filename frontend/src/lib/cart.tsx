import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Product } from "./shop-data";
import { apiFetch, getAuthToken } from "./api-client";

const CART_STORAGE_KEY = "af_cart_items";
const ORDER_STORAGE_KEY = "af_admin_order_snapshots";
const MAX_DATA_URL_LENGTH = 120000;
const MAX_CUSTOMIZATION_TEXT = 12000;

function sanitizeDataUrl(value?: string) {
  if (!value || typeof value !== "string") return undefined;
  if (value.startsWith("data:image")) {
    return value.length > MAX_DATA_URL_LENGTH ? undefined : value;
  }
  return value;
}

function sanitizeCustomization(value: any): any {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.slice(0, 5).map(sanitizeCustomization).filter(Boolean);
  if (typeof value !== "object") return value;

  const next: Record<string, any> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === "string") {
      next[key] =
        entryValue.length > MAX_CUSTOMIZATION_TEXT
          ? entryValue.slice(0, MAX_CUSTOMIZATION_TEXT)
          : entryValue;
    } else if (
      typeof entryValue === "number" ||
      typeof entryValue === "boolean" ||
      entryValue == null
    ) {
      next[key] = entryValue;
    } else if (typeof entryValue === "object") {
      const compact = sanitizeCustomization(entryValue);
      if (compact !== undefined) next[key] = compact;
    }
  });

  return Object.keys(next).length ? next : undefined;
}

function compactCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image: sanitizeDataUrl(item.image),
    customization: sanitizeCustomization(item.customization),
  };
}

function compactOrderSnapshot(order: any): any {
  if (!order || typeof order !== "object") return order;
  return {
    ...order,
    previewImage: sanitizeDataUrl(order.previewImage),
    customization: sanitizeCustomization(order.customization),
    items: typeof order.items === "string" ? order.items.slice(0, 180) : order.items,
  };
}

function storeJsonSafely(key: string, value: any, fallbackLimit = 10) {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return;
  } catch (err) {
    try {
      const existing = (() => {
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      const compacted = Array.isArray(existing)
        ? existing.slice(0, fallbackLimit).map((entry) => compactOrderSnapshot(entry))
        : [];
      const reduced = Array.isArray(value)
        ? value.slice(0, fallbackLimit).map((entry) => compactOrderSnapshot(entry))
        : compactOrderSnapshot(value);
      const payload = JSON.stringify(compacted.length ? compacted : reduced);
      window.localStorage.setItem(key, payload);
    } catch {
      window.localStorage.removeItem(key);
    }
  }
}

type CartItem = {
  cartId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
  image?: string;
  customization?: any;
  size?: string;
  color?: string;
};

type CartContextType = {
  items: CartItem[];
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (p: Product, qty?: number, customization?: any) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  removeItem: (cartId: string) => void;
  clear: () => void;
  totalAmount: () => number;
};

const CartContext = createContext<CartContextType | null>(null);

function normalizeCartItem(item: Partial<CartItem> | null | undefined): CartItem | null {
  if (!item || !item.productId) return null;
  const quantity = Number(item.quantity || 1);
  return {
    cartId: String(item.cartId || `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    productId: String(item.productId),
    name: String(item.name || "Custom item"),
    price: Number(item.price || 0),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    currency: item.currency || "gbp",
    image: item.image || "",
    customization: item.customization ?? undefined,
    size: item.size || "",
    color: item.color || "",
  };
}

function mergeCartItems(existing: CartItem[], incoming: CartItem[]) {
  const map = new Map<string, CartItem>();
  const all = [...existing, ...incoming].map((item) => normalizeCartItem(item)).filter(Boolean) as CartItem[];

  for (const item of all) {
    const key = `${item.productId}|${JSON.stringify(item.customization || null)}|${item.size || ""}|${item.color || ""}`;
    const current = map.get(key);
    if (current) {
      current.quantity += item.quantity;
      current.price = current.price || item.price;
      current.image = current.image || item.image;
      current.name = current.name || item.name;
      current.customization = current.customization || item.customization;
    } else {
      map.set(key, { ...item, cartId: item.cartId || `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
    }
  }

  return Array.from(map.values()).map((item) => ({
    ...item,
    quantity: Math.max(1, Number(item.quantity) || 1),
  }));
}

export async function fetchServerCart(): Promise<CartItem[]> {
  if (!getAuthToken()) return [];
  try {
    const response = await apiFetch("/api/cart");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(data.items)) return [];
    return data.items.map((item) => normalizeCartItem(item)).filter(Boolean) as CartItem[];
  } catch {
    return [];
  }
}

export async function syncCartToServer(nextItems: CartItem[]) {
  if (!getAuthToken()) return false;
  try {
    const response = await apiFetch("/api/cart/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: nextItems.map((item) => normalizeCartItem(item)).filter(Boolean) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Unable to sync cart");
    }
    return Array.isArray(data.items) ? data.items.map((item) => normalizeCartItem(item)).filter(Boolean) as CartItem[] : nextItems;
  } catch {
    return false;
  }
}

export function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeCartItem(item)).filter(Boolean) as CartItem[] : [];
  } catch {
    return [];
  }
}

export function readStoredOrders(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOrderSnapshot(order: any) {
  if (typeof window === "undefined") return;
  const existing = readStoredOrders();
  const next = [compactOrderSnapshot(order), ...existing.map(compactOrderSnapshot)].slice(0, 30);
  storeJsonSafely(ORDER_STORAGE_KEY, next, 10);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());
  const [open, setOpen] = useState(false);
  const hydratedFromServer = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const compacted = items.map(compactCartItem);
      storeJsonSafely(CART_STORAGE_KEY, compacted, 10);
    }
  }, [items]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let active = true;
    void (async () => {
      const serverItems = await fetchServerCart();
      if (!active) return;
      const localItems = readStoredCart();
      const merged = mergeCartItems(serverItems, localItems);
      setItems(merged);
      hydratedFromServer.current = true;
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!getAuthToken() || !hydratedFromServer.current) return;
    void syncCartToServer(items.map(compactCartItem));
  }, [items]);

  const openCart = () => setOpen(true);
  const closeCart = () => setOpen(false);

  const addItem = (p: Product, qty = 1, customization?: any) => {
    setItems((prev) => {
      if (!customization) {
        const idx = prev.findIndex((it) => !it.customization && it.productId === p.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + qty };
          return copy;
        }
      }

      const cartId = `${p.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const nextItem = {
        cartId,
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: qty,
        currency: "gbp",
        image: customization?.image || p.image,
        customization,
      };

      if (customization) {
        const orderSnapshot = {
          id: `AF-${Date.now()}`,
          customer:
            (typeof window !== "undefined" && window.localStorage.getItem("af_customer_current")) ||
            "Guest customer",
          status: "Awaiting Print",
          payment: "Pending",
          createdAt: new Date().toISOString(),
          items: `${p.name} x${qty}`,
          previewImage: customization.image || p.image,
          customization,
          productName: p.name,
        };
        writeOrderSnapshot(orderSnapshot);
      }

      return [...prev, nextItem];
    });
    setOpen(true);
  };

  const removeItem = (cartId: string) =>
    setItems((prev) => prev.filter((it) => it.cartId !== cartId));

  const updateQuantity = (cartId: string, quantity: number) => {
    const nextQuantity = Math.max(1, Math.min(99, Number(quantity) || 1));
    setItems((prev) =>
      prev.map((it) => (it.cartId === cartId ? { ...it, quantity: nextQuantity } : it)),
    );
  };

  const clear = () => setItems([]);

  const totalAmount = () => items.reduce((s, it) => s + it.price * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        open,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export type { CartItem };
