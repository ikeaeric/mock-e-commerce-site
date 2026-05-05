import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addToCart as apiAddToCart,
  clearCart as apiClearCart,
  fetchCart,
  removeFromCart as apiRemoveFromCart,
  updateCartItem as apiUpdateCartItem,
  type CartItem,
} from '../api';

export interface UseCartResult {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  loading: boolean;
  error: string | null;
  add: (productId: number, quantity?: number) => Promise<void>;
  update: (productId: number, quantity: number) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

function recompute(item: CartItem): CartItem {
  return { ...item, totalPrice: Number((item.unitPrice * item.quantity).toFixed(2)) };
}

export function useCart(): UseCartResult {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await Promise.resolve(fetchCart());
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    }
  }, []);

  useEffect(() => {
    Promise.resolve(fetchCart())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load cart'),
      )
      .finally(() => setLoading(false));
  }, []);

  const add = useCallback(async (productId: number, quantity = 1) => {
    try {
      const updated = await apiAddToCart({ productId, quantity });
      setItems((prev) => {
        const idx = prev.findIndex((c) => c.productId === productId);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to cart';
      setError(message);
      await refresh();
      throw new Error(message);
    }
  }, [refresh]);

  const update = useCallback(async (productId: number, quantity: number) => {
    try {
      const updated = await apiUpdateCartItem(productId, quantity);
      setItems((prev) => prev.map((c) => (c.productId === productId ? recompute(updated) : c)));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cart item';
      setError(message);
      await refresh();
      throw new Error(message);
    }
  }, [refresh]);

  const remove = useCallback(async (productId: number) => {
    try {
      await apiRemoveFromCart(productId);
      setItems((prev) => prev.filter((c) => c.productId !== productId));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove cart item';
      setError(message);
      await refresh();
      throw new Error(message);
    }
  }, [refresh]);

  const clear = useCallback(async () => {
    try {
      await apiClearCart();
      setItems([]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(message);
      await refresh();
      throw new Error(message);
    }
  }, [refresh]);

  const itemCount = useMemo(() => items.reduce((sum, c) => sum + c.quantity, 0), [items]);
  const subtotal = useMemo(
    () => Number(items.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0).toFixed(2)),
    [items],
  );

  return { items, itemCount, subtotal, loading, error, add, update, remove, clear, refresh };
}
