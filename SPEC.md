# SPEC — Cart View, Quantity Management, and Max-Qty Enforcement

**Status:** Draft (proposed)
**Owner:** TBD
**Touches:** `src/backend/MockEcommerce.Api/{Endpoints,Services}` and `src/frontend/src/{api,hooks,components,App.tsx}`

---

## 1. Goals

1. Users can open the cart from the existing header icon and **view all items** with name, image, unit price, quantity, and per-line total.
2. Users can **see the cart subtotal and item count** at a glance.
3. Users can **change the quantity** of any line item (1–5) and **remove** items, with all changes persisted to the backend.
4. **Maximum 5 units per product** is enforced server-side on **both** add and update; the limit is also enforced client-side for UX, but the server is authoritative.
5. A new endpoint **`PUT /api/cart/{productId}`** replaces the quantity of an existing line.

## 2. Non-goals

- Checkout, payment, or order placement.
- Per-user carts / authentication. (`InMemoryCartService` remains a process-wide singleton — see comment in source.)
- Stock decrement (the catalog `Stock` field is informational only and is **not** consulted by the cart for this iteration).
- Cart persistence across server restarts.
- Coupons, taxes, shipping, currency conversion. Subtotal == sum of line totals in USD.
- Routing changes (no React Router introduction).

## 3. Definitions

- **Line item:** one `CartItem` row keyed by `ProductId`. Quantity is always `1..=5`.
- **MAX_QTY = 5.** Defined as a single constant `CartConstants.MaxQuantityPerItem` in the backend; mirrored as `MAX_CART_QTY = 5` in `src/frontend/src/api/index.ts`.
- **Subtotal:** `sum(item.unitPrice * item.quantity)` over all line items, computed on the **frontend** from the `GET /api/cart` response. Server returns `TotalPrice` per line (computed property on `CartItem`).
- **ProblemDetails:** RFC 7807 JSON shape returned by ASP.NET Core's `TypedResults.ValidationProblem(...)` and `TypedResults.Problem(...)`.

---

## 4. API contract

All endpoints live under **`/api/cart`**. CORS already allows `http://localhost:5173`. JSON only. Numeric IDs and quantities are integers.

### 4.1 `GET /api/cart` — list cart items

| Aspect       | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Auth         | None                                                                                 |
| Request body | (none)                                                                               |
| 200 OK       | `CartItem[]` — empty array when cart is empty (NEVER 404)                            |
| Errors       | None expected                                                                        |

`CartItem` JSON shape (camelCase via default `System.Text.Json` serialization on minimal API):
```json
{
  "productId": 1,
  "productName": "Wireless Headphones",
  "unitPrice": 79.99,
  "quantity": 2,
  "totalPrice": 159.98
}
```

### 4.2 `POST /api/cart` — add to cart (or increment)

| Aspect       | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Request body | `AddToCartRequest { productId: int, quantity: int }`                                 |
| 201 Created  | New line added. `Location: /api/cart/{productId}`. Body: the new `CartItem`.         |
| 200 OK       | Existing line incremented. Body: the updated `CartItem`.                             |
| 400 ValidationProblem | Validation failed — see §6.                                                 |
| 404 NotFound (`string` body) | `productId` does not exist in the catalog. Body: `"Product {id} not found."` |

**Increment semantics (already-in-cart):**
- New quantity = `existing.quantity + request.quantity`.
- If new quantity > `MAX_QTY` → **reject the entire request** with **400 ValidationProblem**. **Do NOT silently cap.** Error key: `"quantity"`. Message: `"Cannot have more than 5 of the same product in the cart. Currently 3 in cart; requested to add 3."` (numbers vary). The cart is **not modified**.

### 4.3 `PUT /api/cart/{productId}` — replace line quantity (NEW)

| Aspect       | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Route        | `PUT /api/cart/{productId:int}`                                                      |
| Request body | `UpdateCartItemRequest { quantity: int }`                                            |
| 200 OK       | Body: the updated `CartItem`.                                                        |
| 400 ValidationProblem | `quantity < 1` or `quantity > MAX_QTY (5)`.                                 |
| 404 NotFound (`string` body) | `productId` is not currently in the cart. Body: `"Cart item for product {id} not found."` |

**PUT semantics:**
- PUT **replaces** quantity outright (does **not** add to it). E.g. `PUT /api/cart/1 {"quantity": 4}` sets the line to 4 even if it was previously 2 or 5.
- **PUT does NOT create.** If the product is not already in the cart, return **404**. Adding a new line is exclusively a `POST` operation.
- `quantity == 0` is **rejected** with 400; clients must use `DELETE /api/cart/{productId}` to remove a line. (Rationale: explicit > implicit; avoids accidental data loss from a client typo.)
- Whether the `productId` exists in the catalog is **not separately checked** — if the line is in the cart it was already verified at add-time. The 404 is purely about cart membership.

**Handler signature** to add to `CartEndpoints`:
```csharp
internal static Results<Ok<CartItem>, NotFound<string>, ValidationProblem> UpdateQuantity(
    int productId,
    UpdateCartItemRequest request,
    ICartService cartService);

public record UpdateCartItemRequest(int Quantity);
```

Registration in `MapCartEndpoints`:
```csharp
group.MapPut("/{productId:int}", UpdateQuantity)
    .WithName("UpdateCartItemQuantity")
    .WithSummary("Replaces the quantity of a cart line. 1 ≤ quantity ≤ 5.");
```

### 4.4 `DELETE /api/cart/{productId}` — remove a line

| Aspect       | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| 204 NoContent| Line was found and removed.                                                          |
| 404 NotFound | No line for `productId` was in the cart.                                             |

(Existing handler signature — no change.)

### 4.5 `DELETE /api/cart` — clear cart

| Aspect       | Value                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| 204 NoContent| Always (idempotent).                                                                 |

(Existing handler signature — no change.)

---

## 5. Validation rules

Applied in this order; first failure wins. Each emits **400 ValidationProblem** with one or more error keys unless otherwise noted.

| # | Rule                                                                                  | Error key   | Message                                                                |
|---|---------------------------------------------------------------------------------------|-------------|------------------------------------------------------------------------|
| 1 | `productId >= 1` (route constraint `:int` already filters non-numeric → 404)          | `productId` | `"productId must be a positive integer."`                              |
| 2 | `quantity >= 1`                                                                        | `quantity`  | `"quantity must be at least 1."`                                       |
| 3 | `quantity <= MAX_QTY (5)`                                                              | `quantity`  | `"quantity must not exceed 5."`                                        |
| 4 | (POST only) Resulting quantity (`existing.quantity + request.quantity`) `<= MAX_QTY`   | `quantity`  | `"Cannot exceed 5 per product. Currently {n} in cart; requested {m}."` |
| 5 | (POST only) `productId` exists in `IProductService.GetById(id)`                        | —           | **404 NotFound** with body `"Product {id} not found."`                 |

Rule 5 yields 404 (not 400) to match the pre-existing handler signature `NotFound<string>`.

Body is required on POST and PUT; a missing/`null`/malformed body yields the framework's default 400 (no body customization needed).

---

## 6. Error response format

Use ASP.NET Core's built-in helpers:

- **400 validation:** `TypedResults.ValidationProblem(new Dictionary<string, string[]> { ["quantity"] = ["quantity must not exceed 5."] })` → RFC 7807 JSON like:
  ```json
  {
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
    "title": "One or more validation errors occurred.",
    "status": 400,
    "errors": { "quantity": ["quantity must not exceed 5."] }
  }
  ```
- **404 with message:** `TypedResults.NotFound("Product 99 not found.")` → plain string body, `Content-Type: text/plain; charset=utf-8` (matches existing `NotFound<string>` signature).
- **404 without body:** `TypedResults.NotFound()` (used by `DELETE /{productId}` and `GET /products/{id}`).

The frontend treats any non-2xx as a failure and surfaces a user-readable message; for 400 it parses `.errors` and joins values; for 404 it shows the body string verbatim.

---

## 7. Service-layer contract (`ICartService`)

The interface in `src/backend/MockEcommerce.Api/Services/ICartService.cs` is unchanged for **GetAll / GetByProductId / Remove / Clear**. We **add** one method to support PUT:

```csharp
/// <summary>Replaces the quantity of an existing cart line. Returns null if the productId is not in the cart.</summary>
CartItem? UpdateQuantity(int productId, int quantity);
```

`Add(CartItem)` continues to mean "add or increment". The endpoint layer is responsible for enforcing MAX_QTY before calling `Add` (so the service stays a dumb store and is independently testable).

`InMemoryCartService` implementation must:
- Use the existing `private readonly Lock _lock = new();` for **all** mutating operations and for any read that publishes a snapshot (`GetAll` returns a `ToList()` copy under the lock to avoid `InvalidOperationException` from concurrent enumeration).
- `Add`: under lock, find existing by `ProductId`. If found, increment `Quantity` and update `UnitPrice`/`ProductName` from the incoming snapshot (or leave snapshot untouched — pick: **leave snapshot untouched**; the endpoint already writes from the catalog at first add). If not found, append.
- `UpdateQuantity`: under lock, find existing; if not found return `null`; else set `Quantity` and return the item.
- `Remove`: under lock, return `true` iff a line was removed.
- `Clear`: under lock, `_cart.Clear()`.

---

## 8. Frontend contract

### 8.1 New API client functions (`src/frontend/src/api/index.ts`)

```ts
export async function fetchCart(): Promise<CartItem[]>;
export async function updateCartItem(productId: number, quantity: number): Promise<CartItem>; // PUT
export async function removeFromCart(productId: number): Promise<void>;                       // DELETE /{id}
export async function clearCart(): Promise<void>;                                             // DELETE
```

Export the existing local `CartItem` interface from this file. Add `export const MAX_CART_QTY = 5;`.

Failures throw `Error` with a human-readable message. The functions must read the response body on non-2xx and prefer `errors[*]` joined, falling back to the response text, falling back to `${status} ${statusText}`.

### 8.2 New hook: `useCart` (`src/frontend/src/hooks/useCart.ts`)

```ts
interface UseCartResult {
  items: CartItem[];
  itemCount: number;       // sum of quantities
  subtotal: number;        // sum of totalPrice
  loading: boolean;
  error: string | null;
  add: (productId: number, quantity?: number) => Promise<void>;
  update: (productId: number, quantity: number) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

- Initial `useEffect` calls `fetchCart()` once on mount.
- Each mutating call optimistically updates local state on success (using the endpoint response for `add`/`update`, computing for `remove`/`clear`); on failure, sets `error` and rolls back via a `refresh()`.
- `itemCount` and `subtotal` are derived (memoized) from `items`.

### 8.3 New component: `CartDrawer` (`src/frontend/src/components/CartDrawer/`)

A right-anchored slide-out panel (no routing). Implementation choices:

- **Trigger:** clicking the existing `header__cart-button` toggles a boolean `isCartOpen` state that lives in `App.tsx`.
- **Open animation:** CSS `transform: translateX(100%)` ↔ `0` with `transition: transform 200ms ease-out`. No third-party animation lib.
- **Backdrop:** semi-transparent overlay; clicking it closes the drawer. `Esc` also closes (keydown listener attached only when open).
- **Accessibility:**
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on a heading "Your cart".
  - Focus is trapped to the drawer while open; on close, focus returns to the cart button.
  - The cart-icon button keeps its existing `aria-label="Shopping cart with N items"` and continues to be wired to `cartItemCount`.
- **Empty state:** "Your cart is empty." with a "Continue shopping" button that closes the drawer.
- **Populated state:** vertical list of line items, each showing:
  - Thumbnail (`product.imageUrl`, 64×64), name, unit price.
  - Quantity stepper: `−` button, numeric readout, `+` button.
    - `−` calls `update(productId, qty - 1)` if `qty > 1`; if `qty === 1`, the `−` button is **disabled** (use `Remove` to delete).
    - `+` calls `update(productId, qty + 1)`; **disabled when `qty === 5`**, with `aria-label="Maximum 5 per item"`.
    - During an in-flight call, both stepper buttons are disabled.
  - Line total (right-aligned): `$XX.XX`.
  - "Remove" button (`aria-label="Remove {name} from cart"`) calls `remove(productId)`.
- **Footer:**
  - "Items" count (= `itemCount`).
  - "Subtotal: $XX.XX" (from the hook).
  - "Clear cart" button (calls `clear()`, requires no confirmation in this iteration).
  - "Checkout" button — **disabled** with `title="Checkout is not implemented yet."` (out of scope per §2).
- **Error surface:** if a mutation fails, render an inline `role="alert"` strip at the top of the drawer with the error message; auto-clears after 4 s.

### 8.4 `App.tsx` integration

- Replace the local `cartItemCount` `useState` with `useCart().itemCount`.
- Keep the existing toast for "added to cart" success/failure (3 s auto-clear stays).
- Add `isCartOpen` state and pass an `onCartClick` to `<Header>` and an `isOpen`/`onClose` to `<CartDrawer>`.
- The existing `handleAddToCart(product)` becomes `cart.add(product.id, 1)`; on failure, surface the server's message (e.g. `"quantity must not exceed 5."` when already at 5).

### 8.5 `Header` change

- Add prop `onCartClick: () => void`. Wire it to the existing `<button className="header__cart-button">`. The visual badge already shows `cartItemCount` and stays as-is.

---

## 9. Edge cases

| # | Scenario                                                                  | Expected behavior                                                                                          |
|---|---------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| 1 | `POST /api/cart {productId: 1, quantity: 6}` on empty cart                | 400 ValidationProblem, key `quantity`, msg "quantity must not exceed 5."; cart unchanged.                  |
| 2 | `POST /api/cart {productId: 1, quantity: 3}` then again `{... quantity: 3}` | First → 201 (qty=3). Second → **400** (would be 6); cart stays at 3. NEVER silently caps to 5.            |
| 3 | `POST /api/cart {productId: 1, quantity: 0}` or `-1`                       | 400 ValidationProblem, key `quantity`, msg "quantity must be at least 1."                                  |
| 4 | `POST /api/cart {productId: 999, quantity: 1}`                             | 404 NotFound, body `"Product 999 not found."` (because catalog has 5 products, ids 1..5).                  |
| 5 | `POST /api/cart` with no body / malformed JSON                             | 400 (framework default).                                                                                   |
| 6 | `PUT /api/cart/1 {quantity: 7}`                                            | 400 ValidationProblem, "quantity must not exceed 5." Cart unchanged.                                       |
| 7 | `PUT /api/cart/1 {quantity: 0}`                                            | 400 ValidationProblem, "quantity must be at least 1." (Use DELETE to remove.)                              |
| 8 | `PUT /api/cart/1 {quantity: 3}` when product 1 is not in the cart          | 404 NotFound, body `"Cart item for product 1 not found."` PUT does not create.                             |
| 9 | `PUT /api/cart/abc {…}`                                                    | 404 (route constraint `:int` rejects non-integer paths).                                                   |
|10 | `PUT /api/cart/999 {quantity: 3}` (id not in catalog AND not in cart)      | 404 NotFound — same path as #8. We do not separately validate against the catalog on PUT.                  |
|11 | `DELETE /api/cart/1` when not in cart                                       | 404 NotFound (no body).                                                                                    |
|12 | `DELETE /api/cart/1` then `DELETE /api/cart/1` again                        | First 204, second 404. (Not idempotent for the missing case — by design.)                                  |
|13 | `DELETE /api/cart` on empty cart                                           | 204 NoContent (idempotent for clear).                                                                      |
|14 | `GET /api/cart` on empty cart                                              | 200 OK with body `[]`. NEVER 404.                                                                          |
|15 | Two simultaneous POSTs that would push quantity over 5                      | Service `Add` is under `lock`; second request reads the post-first-write state and is rejected with 400.  |
|16 | Frontend stepper `+` clicked when `qty === 5`                              | Button is disabled; if pressed via keyboard, no-op (the `disabled` attribute is set).                     |
|17 | Frontend stepper `−` clicked when `qty === 1`                              | Button is disabled. Removal goes through the explicit "Remove" button.                                    |
|18 | Backend mutation succeeds but response body fails to parse on the frontend | Hook calls `refresh()` to resync; surfaces "Could not refresh cart" if that also fails.                   |
|19 | User opens drawer with empty cart                                          | Empty-state copy + "Continue shopping" button.                                                            |
|20 | Catalog product price changes between adds                                  | The `unitPrice` snapshot from the **first** add is preserved on subsequent increments. (Documented above.) |

---

## 10. Constants and configuration

- `CartConstants.MaxQuantityPerItem = 5` in a new file `src/backend/MockEcommerce.Api/Services/CartConstants.cs`.
- `MAX_CART_QTY = 5` in `src/frontend/src/api/index.ts`.
- No environment variables, no config files. Changing the limit means editing both constants.

## 11. Out of scope (will not be built)

- Authentication, per-user carts, persistent storage.
- Stock decrement / "out of stock when 5 are added".
- Checkout, taxes, shipping, coupons.
- Cart summary endpoint that returns subtotal/totals server-side (frontend computes).
- Animations beyond the simple drawer slide.
- Mobile-specific layouts (drawer covers ≤480 px width with `width: 100%`).

## 12. Acceptance criteria

1. `npm test` passes including new tests for `useCart`, `CartDrawer`, and updated `App` tests.
2. `dotnet test` passes including new tests for `InMemoryCartService.UpdateQuantity` and all four cart endpoints (incl. PUT).
3. Manual: with both servers running, clicking the header cart icon opens a drawer; users can add to 5, fail to add a 6th, decrement, remove, clear, and see the subtotal update accordingly.
4. `lint` passes (`npm --workspace frontend run lint`).
