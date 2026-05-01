import { useEffect, useState } from "react";

export type CartItem = {
  listing_id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  price: number;
  qty: number;
  unit: string | null;
  image_url: string | null;
};

const KEY = "tp_consumer_cart";
const EVENT = "tp_consumer_cart_changed";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(EVENT));
}

export function getCart(): CartItem[] {
  return read();
}

export function getCartQty(listingId: string): number {
  return read().find((c) => c.listing_id === listingId)?.qty ?? 0;
}

export function addToCart(item: Omit<CartItem, "qty"> & { qty?: number }, deltaQty = 1) {
  const cart = read();
  const existing = cart.find((c) => c.listing_id === item.listing_id);
  if (existing) {
    existing.qty += deltaQty;
  } else {
    cart.push({ ...item, qty: item.qty ?? deltaQty });
  }
  write(cart);
}

export function setCartQty(listingId: string, qty: number) {
  const cart = read();
  const idx = cart.findIndex((c) => c.listing_id === listingId);
  if (idx === -1) return;
  if (qty <= 0) cart.splice(idx, 1);
  else cart[idx].qty = qty;
  write(cart);
}

export function useCartQty(listingId: string): number {
  const [qty, setQty] = useState<number>(() => getCartQty(listingId));
  useEffect(() => {
    const update = () => setQty(getCartQty(listingId));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [listingId]);
  return qty;
}

export function removeFromCart(listingId: string) {
  const cart = read().filter((c) => c.listing_id !== listingId);
  write(cart);
}

export function clearShopCart(shopId: string) {
  const cart = read().filter((c) => c.shop_id !== shopId);
  write(cart);
}

export function getCartByShop(): Record<string, CartItem[]> {
  const cart = read();
  const byShop: Record<string, CartItem[]> = {};
  for (const item of cart) {
    if (!byShop[item.shop_id]) byShop[item.shop_id] = [];
    byShop[item.shop_id].push(item);
  }
  return byShop;
}

export function useCart(): CartItem[] {
  const [cart, setCart] = useState<CartItem[]>(() => read());
  useEffect(() => {
    const update = () => setCart(read());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return cart;
}

export function useCartCount(): number {
  const cart = useCart();
  return cart.reduce((s, c) => s + c.qty, 0);
}