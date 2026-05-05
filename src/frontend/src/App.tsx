import { useEffect, useRef, useState } from 'react';
import type { Product } from './types';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ProductList } from './components/ProductList';
import { CartDrawer } from './components/CartDrawer';
import { useProducts } from './hooks/useProducts';
import { useCart } from './hooks/useCart';
import './App.css';

export function App() {
  const { products, loading, error } = useProducts();
  const cart = useCart();
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function showMessage(text: string) {
    setCartMessage(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCartMessage(null), 3000);
  }

  async function handleAddToCart(product: Product) {
    try {
      await cart.add(product.id, 1);
      showMessage(`"${product.name}" added to cart!`);
    } catch {
      showMessage('Failed to add item to cart.');
    }
  }

  async function handleUpdateQuantity(productId: number, quantity: number) {
    try {
      await cart.update(productId, quantity);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item.';
      showMessage(message);
    }
  }

  async function handleRemove(productId: number) {
    try {
      await cart.remove(productId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove item.';
      showMessage(message);
    }
  }

  async function handleClear() {
    try {
      await cart.clear();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cart.';
      showMessage(message);
    }
  }

  return (
    <div className="app">
      <Header cartItemCount={cart.itemCount} onCartClick={() => setIsCartOpen(true)} />
      <HeroBanner />

      <main className="app__main">
        <h1 className="app__section-heading">Our products</h1>

        {cartMessage && (
          <div className="app__notification" role="status">
            {cartMessage}
          </div>
        )}

        {loading && <p className="app__loading">Loading products…</p>}
        {error && <p className="app__error">Error: {error}</p>}
        {!loading && !error && (
          <ProductList products={products} onAddToCart={handleAddToCart} />
        )}
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart.items}
        itemCount={cart.itemCount}
        subtotal={cart.subtotal}
        error={cart.error}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
        onClear={handleClear}
      />
    </div>
  );
}
