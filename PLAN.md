# PLAN — Implementing the Cart Feature

Sequenced implementation plan derived from `SPEC.md`. Order is **bottom-up**: shared models → service → endpoints → backend tests → frontend API → hook → UI → frontend tests → manual QA. Each step lists the exact files touched and a one-line acceptance check. Earlier steps are independently mergeable.

Tech reminders: backend = .NET 10 Minimal API + xUnit; frontend = React 19 + Vite 8 + Vitest. `npm test` (root) runs Vitest; `dotnet test` (in `test/backend/MockEcommerce.Api.Tests`) runs xUnit. `MAX_QTY = 5`.

---

## Phase 1 — Backend: shared constants & request DTOs

**Step 1.1 — Add `CartConstants.cs`**
- File: `src/backend/MockEcommerce.Api/Services/CartConstants.cs` (new).
- Body: `internal static class CartConstants { public const int MaxQuantityPerItem = 5; }`
- ✅ Compiles.

**Step 1.2 — Add `UpdateCartItemRequest` record**
- File: `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs` (existing, bottom of file beside `AddToCartRequest`).
- `public record UpdateCartItemRequest(int Quantity);`
- ✅ Compiles.

## Phase 2 — Backend: extend `ICartService`

**Step 2.1 — Add `UpdateQuantity` to `ICartService`**
- File: `src/backend/MockEcommerce.Api/Services/ICartService.cs`.
- Add: `CartItem? UpdateQuantity(int productId, int quantity);` (with XML doc comment per house style).
- ✅ Compiles; `InMemoryCartService` no longer satisfies the interface (next step).

## Phase 3 — Backend: implement `InMemoryCartService`

**Step 3.1 — Implement all five existing methods + the new one**
- File: `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs`.
- Use `lock (_lock)` around every body. Replace each `throw new NotImplementedException()`:
  - `GetAll()`: `lock(_lock) return _cart.ToList();` (snapshot copy).
  - `GetByProductId(int)`: `lock(_lock) return _cart.FirstOrDefault(c => c.ProductId == productId);`
  - `Add(CartItem item)`: under lock, find existing by `ProductId`. If found, `existing.Quantity += item.Quantity;` and return existing. Else `_cart.Add(item); return item;`.
  - `UpdateQuantity(int productId, int quantity)`: under lock, find existing; if null return null; else `existing.Quantity = quantity; return existing;`.
  - `Remove(int productId)`: under lock, find then `_cart.Remove(found); return true/false`.
  - `Clear()`: under lock, `_cart.Clear()`.
- ✅ `dotnet build` passes; existing product tests still pass.

## Phase 4 — Backend: implement endpoint handlers + register PUT

**Step 4.1 — `GetCart`**
- Replace `throw` with `TypedResults.Ok(cartService.GetAll());` (returns 200 + `[]` for empty cart).

**Step 4.2 — `AddToCart`**
- Validate `request.Quantity >= 1` and `<= MAX_QTY` → 400 ValidationProblem on failure (per SPEC §5).
- Look up product: `var product = productService.GetById(request.ProductId);` if null → `TypedResults.NotFound($"Product {request.ProductId} not found.")`.
- `var existing = cartService.GetByProductId(request.ProductId);`
- If `existing == null`: build snapshot `new CartItem { ProductId = product.Id, ProductName = product.Name, UnitPrice = product.Price, Quantity = request.Quantity }`, validate `request.Quantity <= MAX_QTY` (already done), call `cartService.Add(snapshot)`, return `TypedResults.Created($"/api/cart/{product.Id}", snapshot)`.
- Else: compute `newQty = existing.Quantity + request.Quantity`. If `newQty > MAX_QTY` → 400 ValidationProblem with key `"quantity"`, msg `$"Cannot exceed 5 per product. Currently {existing.Quantity} in cart; requested {request.Quantity}."` Else call `cartService.Add(new CartItem { ProductId = product.Id, ProductName = existing.ProductName, UnitPrice = existing.UnitPrice, Quantity = request.Quantity })` (the service increments) and return `TypedResults.Ok(updated)`.

**Step 4.3 — `UpdateQuantity` (NEW handler + route)**
- Add the handler (signature in SPEC §4.3). Validate `quantity` ∈ `[1, MAX_QTY]` → 400 ValidationProblem.
- `var updated = cartService.UpdateQuantity(productId, request.Quantity);` → if null → `TypedResults.NotFound($"Cart item for product {productId} not found.")` else `TypedResults.Ok(updated)`.
- Register inside `MapCartEndpoints`: `group.MapPut("/{productId:int}", UpdateQuantity).WithName("UpdateCartItemQuantity").WithSummary("Replaces the quantity of a cart line. 1 ≤ quantity ≤ 5.");`

**Step 4.4 — `RemoveFromCart`**
- `return cartService.Remove(productId) ? TypedResults.NoContent() : TypedResults.NotFound();`

**Step 4.5 — `ClearCart`**
- `cartService.Clear(); return TypedResults.NoContent();`

✅ `dotnet build` passes; manual `curl` against `http://localhost:5063` returns expected status codes for every endpoint.

## Phase 5 — Backend tests (xUnit)

All in `test/backend/MockEcommerce.Api.Tests/`. Use the same `WebApplicationFactory<Program>` pattern as `ProductEndpointTests.cs`. Each test class re-creates the factory so the singleton cart starts clean (xUnit creates one fixture per `IClassFixture<>` consumer; for tests within a class, call `DELETE /api/cart` in a constructor or `IAsyncLifetime.InitializeAsync`).

**Step 5.1 — `Services/InMemoryCartServiceTests.cs` (new)**
- Cover: `GetAll` empty + populated; `Add` new line + increment existing; `UpdateQuantity` existing → returns updated, not-existing → returns null; `Remove` true/false; `Clear`.
- Concurrency smoke: two parallel `Add` calls of qty 2 each → final qty == 4 (lock works).

**Step 5.2 — `Endpoints/CartEndpointTests.cs` (new)**
- Reset cart at the start of each test (`await _client.DeleteAsync("/api/cart")`).
- Tests:
  - `GetCart_EmptyCart_ReturnsOkAndEmptyArray`.
  - `AddToCart_NewProduct_ReturnsCreated`.
  - `AddToCart_ExistingProduct_ReturnsOkAndIncrements`.
  - `AddToCart_QuantityZero_Returns400`.
  - `AddToCart_QuantityAboveFive_Returns400`.
  - `AddToCart_PushesTotalAboveFive_Returns400AndDoesNotMutate`.
  - `AddToCart_NonExistentProduct_Returns404WithMessage`.
  - `UpdateQuantity_ExistingItem_Returns200WithUpdated`.
  - `UpdateQuantity_AboveFive_Returns400`.
  - `UpdateQuantity_Zero_Returns400`.
  - `UpdateQuantity_ItemNotInCart_Returns404`.
  - `UpdateQuantity_NonIntegerPath_Returns404` (route constraint).
  - `RemoveFromCart_Existing_Returns204`.
  - `RemoveFromCart_NotInCart_Returns404`.
  - `ClearCart_EmptyOrPopulated_Returns204`.

✅ `dotnet test` green.

## Phase 6 — Frontend: API client

**Step 6.1 — Extend `src/frontend/src/api/index.ts`**
- Export `MAX_CART_QTY = 5`.
- Export the `CartItem` interface (move from local to exported).
- Add `fetchCart`, `updateCartItem(productId, quantity)`, `removeFromCart(productId)`, `clearCart` per SPEC §8.1.
- Implement a shared `parseError(response)` that reads JSON and prefers `errors[*].join(' ')`, falls back to `await response.text()`, falls back to status text. All API funcs throw `new Error(message)` on non-2xx.

✅ `tsc -b` clean, no eslint warnings.

## Phase 7 — Frontend: cart hook

**Step 7.1 — Create `src/frontend/src/hooks/useCart.ts`**
- Implement per SPEC §8.2. State: `items`, `loading`, `error`, plus per-product `pending: Set<number>` for stepper disable (optional — can rely on a single `mutating` boolean to keep MVP small).
- `useEffect` mount: call `fetchCart()` once.
- Each mutation: try → patch local state from response → on error, set `error`, then call `refresh()` to resync.
- Memoize `itemCount` and `subtotal` with `useMemo`.

✅ Hook compiles; covered by Phase 9 tests.

## Phase 8 — Frontend: cart drawer + integration

**Step 8.1 — Create `CartDrawer` component**
- Folder: `src/frontend/src/components/CartDrawer/{CartDrawer.tsx,index.ts}`.
- Props: `{ isOpen: boolean; onClose: () => void; cart: UseCartResult }`.
- Render per SPEC §8.3: dialog semantics, backdrop, item rows with stepper (`−` disabled at qty 1, `+` disabled at qty 5), per-line "Remove" button, footer with subtotal/items count, disabled "Checkout".
- Keydown listener for `Escape` mounted only when `isOpen`.
- BEM-style classes: `cart-drawer`, `cart-drawer__backdrop`, `cart-drawer__panel`, `cart-drawer__item`, `cart-drawer__stepper`, `cart-drawer__footer`, `cart-drawer__total`.

**Step 8.2 — CSS**
- Append rules to `src/frontend/src/App.css` (existing global stylesheet — matches repo convention; no CSS modules).
- Right-anchored `position: fixed; top: 0; right: 0; height: 100vh; width: min(420px, 100vw); transform: translateX(100%); transition: transform 200ms ease-out;` toggled via `.cart-drawer--open { transform: translateX(0); }`.

**Step 8.3 — `Header` change**
- File: `src/frontend/src/components/Header/Header.tsx`.
- Add prop `onCartClick: () => void`. Wire `onClick={onCartClick}` on the existing `<button className="header__cart-button">`. Keep the existing `aria-label`.

**Step 8.4 — `App.tsx` integration**
- File: `src/frontend/src/App.tsx`.
- Replace local `cartItemCount` `useState` with `const cart = useCart();` and use `cart.itemCount`.
- Add `const [isCartOpen, setIsCartOpen] = useState(false);`.
- Pass `onCartClick={() => setIsCartOpen(true)}` to `<Header>`.
- Render `<CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} />` at the bottom of the tree.
- `handleAddToCart(product)` becomes `try { await cart.add(product.id, 1); setCartMessage(...) } catch (e) { setCartMessage(e.message ?? 'Failed to add item to cart.') }` — surfaces server errors (e.g. quantity > 5).

✅ `npm --workspace frontend run dev` shows the drawer, opens on icon click, closes on backdrop/Esc.

## Phase 9 — Frontend tests (Vitest)

All under `test/frontend/`. Mock `../../src/frontend/src/api` per existing patterns.

**Step 9.1 — `hooks/useCart.test.ts`**
- Initial fetch populates items.
- `add` increments locally; on rejected promise, `error` is set and a refresh occurs.
- `update`, `remove`, `clear` happy paths.
- `itemCount` and `subtotal` derive correctly from items.

**Step 9.2 — `components/CartDrawer/CartDrawer.test.tsx`**
- Hidden when `isOpen=false` (`role="dialog"` not in tree, OR has `aria-hidden`).
- Empty-state message renders when `items=[]`.
- Renders one row per item with name, line total, qty value.
- `+` button disabled at qty 5 (assert `aria-label` `Maximum 5 per item` and `toBeDisabled()`).
- `−` button disabled at qty 1.
- Clicking `+` calls `cart.update(id, qty+1)`.
- Clicking "Remove" calls `cart.remove(id)`.
- Clicking the backdrop calls `onClose`.
- Pressing `Escape` calls `onClose`.

**Step 9.3 — Update `App.test.tsx`**
- Mock `useCart` (instead of mocking `useProducts` for cart count). Adjust existing assertions for `cartItemCount` to read from the mocked hook.
- Add: clicking the header cart button opens the drawer (assert `dialog` becomes visible).

**Step 9.4 — Update `Header.test.tsx`**
- Add: click on cart button calls `onCartClick` prop.

✅ `npm test` green.

## Phase 10 — Manual QA + cleanup

**Step 10.1 — Smoke-test against running stack**
- Terminal A: `cd src/backend/MockEcommerce.Api && dotnet run`.
- Terminal B: `npm --workspace frontend run dev`.
- Open `http://localhost:5173`.
- Steps:
  1. Add Wireless Headphones × 5 (one click at a time). 6th attempt → error toast says `"Cannot exceed 5..."` and qty stays at 5.
  2. Open drawer; verify 5 × $79.99 = $399.95 line total and subtotal = $399.95.
  3. Decrement to 1 via `−`; subtotal = $79.99.
  4. Add Yoga Mat × 2; subtotal = $79.99 + $69.98 = $149.97.
  5. Click "Remove" on Yoga Mat; subtotal = $79.99.
  6. Click "Clear cart"; empty-state shows.
  7. Refresh page; cart stays empty (server is in-memory but consistent across page reloads).
  8. `curl -X PUT -H "Content-Type: application/json" -d '{"quantity":7}' http://localhost:5063/api/cart/1` → 400 with ProblemDetails.
  9. `curl -X PUT -H "Content-Type: application/json" -d '{"quantity":3}' http://localhost:5063/api/cart/999` → 404 `"Cart item for product 999 not found."`

**Step 10.2 — Lint / build**
- `npm --workspace frontend run lint`.
- `npm --workspace frontend run build`.
- `dotnet build src/backend/MockEcommerce.slnx`.

**Step 10.3 — Update `.github/copilot-instructions.md`**
- Move cart endpoints/service from "Stubbed" to "Implemented".
- Document the new `PUT /api/cart/{productId}` route and the `MAX_QTY = 5` rule.
- Note the `CartDrawer` component and the `useCart` hook.

---

## Sequencing rationale

1. **Constants & DTOs first** — every later step references `MAX_QTY` and `UpdateCartItemRequest`.
2. **Service before endpoints** — endpoints depend on `ICartService.UpdateQuantity`; service is testable in isolation.
3. **Endpoints before backend tests** — integration tests hit `/api/...` URLs.
4. **Backend complete before frontend** — the frontend hook can be exercised against a real running API for manual checks.
5. **API client → hook → component → app integration** — each layer wraps the previous; tests at each level mock just below it.
6. **Tests last in each tier** — keeps green/red cycles short; avoids rewriting tests as signatures shift mid-implementation.
7. **Manual QA last** — verifies cross-stack behavior (proxy, CORS, ProblemDetails parsing) that unit tests can't.

## Risk register

- **Singleton cart shared across users** — fine for demo; called out in SPEC §2 and existing source comment.
- **Race on increment-vs-MAX_QTY check** — endpoint reads via `GetByProductId` *outside* the service lock, then calls `Add` inside the lock. Two simultaneous adds could both pass the check and push qty above 5. **Mitigation:** move the "increment under cap" decision into a single atomic service method (`TryAddOrIncrement(item, max, out result)`) — a small follow-up if Phase 5 concurrency tests fail. Otherwise document as known limitation.
- **Decimal serialization** — `System.Text.Json` emits decimals as JSON numbers; React's `Number` is fine for prices ≤ $999.99. Format with `toFixed(2)` on display.
- **Drawer + StrictMode double-mount** — `useEffect` mount fetch will fire twice in dev only; `fetchCart` is idempotent so this is acceptable. No need to add an `AbortController` for the MVP.
