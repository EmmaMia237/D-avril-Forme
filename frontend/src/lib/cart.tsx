import React, { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "./shop-data";

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
      next[key] = entryValue.length > MAX_CUSTOMIZATION_TEXT ? entryValue.slice(0, MAX_CUSTOMIZATION_TEXT) : entryValue;
    } else if (typeof entryValue === "number" || typeof entryValue === "boolean" || entryValue == null) {
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
      const reduced = Array.isArray(value) ? value.slice(0, fallbackLimit).map((entry) => compactOrderSnapshot(entry)) : compactOrderSnapshot(value);
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

export function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const compacted = items.map(compactCartItem);
      storeJsonSafely(CART_STORAGE_KEY, compacted, 10);
    }
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
        currency: "usd",
        image: customization?.image || p.image,
        customization,
      };

      if (customization) {
        const orderSnapshot = {
          id: `AF-${Date.now()}`,
          customer: (typeof window !== "undefined" && window.localStorage.getItem("af_customer_current")) || "Guest customer",
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

  const removeItem = (cartId: string) => setItems((prev) => prev.filter((it) => it.cartId !== cartId));

  const updateQuantity = (cartId: string, quantity: number) => {
    const nextQuantity = Math.max(1, Math.min(99, Number(quantity) || 1));
    setItems((prev) =>
      prev.map((it) => (it.cartId === cartId ? { ...it, quantity: nextQuantity } : it)),
    );
  };

  const clear = () => setItems([]);

  const totalAmount = () => items.reduce((s, it) => s + it.price * it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, open, openCart, closeCart, addItem, updateQuantity, removeItem, clear, totalAmount }}>
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
