"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type FrameStyle,
  type Material,
  type PosterSize,
  priceCart,
} from "@ctrlp/shared";

export interface CartItem {
  /** Stable client id for list keys and removal. */
  key: string;
  assetId: string;
  previewUrl: string;
  fileName: string;
  widthPx: number | null;
  heightPx: number | null;
  size: PosterSize;
  material: Material;
  frameStyle: FrameStyle;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: Omit<CartItem, "key">) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  totals: ReturnType<typeof priceCart>;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "ctrlp.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore corrupt cart */
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [items, hydrated]);

  const add = useCallback((item: Omit<CartItem, "key">) => {
    setItems((prev) => [
      ...prev,
      { ...item, key: `${item.assetId}-${prev.length}-${item.size}-${item.frameStyle}` },
    ]);
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.max(1, Math.min(20, Math.floor(quantity) || 1));
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: q } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totals = useMemo(() => priceCart(items), [items]);
  const count = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, add, remove, setQuantity, clear, totals, count }),
    [items, add, remove, setQuantity, clear, totals, count],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
