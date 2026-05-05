import { useEffect } from 'react';
import { MAX_CART_QTY, type CartItem } from '../../api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  error: string | null;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onClear: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  itemCount,
  subtotal,
  error,
  onUpdateQuantity,
  onRemove,
  onClear,
}: CartDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`}
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div
          className="cart-drawer__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className="cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-heading"
      >
        <header className="cart-drawer__header">
          <h2 id="cart-drawer-heading" className="cart-drawer__heading">
            Your cart
          </h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </header>

        {error && (
          <div className="cart-drawer__error" role="alert">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="cart-drawer__empty">
            <p>Your cart is empty.</p>
            <button type="button" className="cart-drawer__continue" onClick={onClose}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-drawer__list" aria-label="Cart items">
              {items.map((item) => (
                <li key={item.productId} className="cart-drawer__item">
                  <div className="cart-drawer__item-info">
                    <p className="cart-drawer__item-name">{item.productName}</p>
                    <p className="cart-drawer__item-price">
                      ${item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <div className="cart-drawer__stepper" role="group" aria-label={`Quantity for ${item.productName}`}>
                    <button
                      type="button"
                      className="cart-drawer__stepper-btn"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease quantity of ${item.productName}`}
                    >
                      −
                    </button>
                    <span className="cart-drawer__stepper-value" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="cart-drawer__stepper-btn"
                      onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= MAX_CART_QTY}
                      aria-label={
                        item.quantity >= MAX_CART_QTY
                          ? 'Maximum 5 per item'
                          : `Increase quantity of ${item.productName}`
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-drawer__item-total">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    className="cart-drawer__remove"
                    onClick={() => onRemove(item.productId)}
                    aria-label={`Remove ${item.productName} from cart`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <footer className="cart-drawer__footer">
              <div className="cart-drawer__summary">
                <p>Items: {itemCount}</p>
                <p className="cart-drawer__subtotal">
                  Subtotal: ${subtotal.toFixed(2)}
                </p>
              </div>
              <div className="cart-drawer__actions">
                <button
                  type="button"
                  className="cart-drawer__clear"
                  onClick={onClear}
                >
                  Clear cart
                </button>
                <button
                  type="button"
                  className="cart-drawer__checkout"
                  disabled
                  title="Checkout is not implemented yet."
                >
                  Checkout
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
