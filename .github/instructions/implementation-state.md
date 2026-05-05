# Implementation state — what's done vs. stubbed

This repo intentionally ships with the **shopping cart half stubbed out**. Catalog browsing works end-to-end; cart operations don't.

## ✅ Implemented and working

### Backend
- `GET /api/products` → returns the full hardcoded list (5 products, 200 OK).
- `GET /api/products/{id:int}` → returns one product or 404.
- `MockProductService.GetAll()` and `MockProductService.GetById(int)` (`src/backend/MockEcommerce.Api/Services/MockProductService.cs`).
- DI wiring, CORS for `http://localhost:5173`, OpenAPI document.

### Frontend
- App shell renders: `Header` (with cart-count badge), `HeroBanner`, "Our products" heading, `ProductList` of `ProductCard`s.
- `useProducts` hook fetches the catalog on mount and exposes `{ products, loading, error }`.
- Loading state ("Loading products…"), error state ("Error: ..."), empty state ("No products available.").
- Clicking the per-card "+" button calls `addToCart({ productId, quantity: 1 })` and optimistically increments the in-memory `cartItemCount` and shows a transient `role="status"` notification that auto-clears after **3000 ms**.

## ❌ Stubbed — these throw `NotImplementedException` at runtime

### `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs`
All four cart handlers throw — the routes are mapped, OpenAPI metadata exists, but every call returns HTTP 500:
- `GetCart`            → `GET    /api/cart`
- `AddToCart`          → `POST   /api/cart`
- `RemoveFromCart`     → `DELETE /api/cart/{productId:int}`
- `ClearCart`          → `DELETE /api/cart`

### `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs`
All five `ICartService` methods throw:
- `GetAll`, `GetByProductId`, `Add`, `Remove`, `Clear`

The class declares `private readonly Lock _lock = new();` (C# 13 `System.Threading.Lock`) for future thread-safety, but it's unused while the methods throw. The service is registered as a **Singleton**, so once implemented all clients will share **one global cart** (intentional — there's a code comment noting it should become per-user when auth is added).

## Practical effect on the running app

When both servers are running:
1. Browsing the storefront works — all 5 products load and render.
2. Clicking "Add to cart" sends `POST /api/cart` → backend throws → frontend catches the rejection in `App.handleAddToCart` and shows the message **"Failed to add item to cart."** in the `role="status"` region.
3. The in-memory `cartItemCount` only increments on the **success** path, so on the running stub it stays at 0.

## What's not present at all

- No database, no EF Core, no migrations, no seeding script.
- No authentication / authorization / users.
- No checkout, payments, orders, inventory mutation, or stock decrement.
- No frontend routing (no React Router); all `<a>` tags href `/`.
- No CI workflow (`.github/workflows/` does not exist).
- No Dockerfile / docker-compose.
- No E2E tests (no Playwright / Cypress) and no Storybook.
- No `.env` files; only the Vite proxy target is configurable.

## Existing test coverage

Frontend tests cover: `App` (rendering states, add-to-cart success + failure notifications), `useProducts` (loading/success/error/non-Error rejection), `ProductCard`, `ProductList`, `Header`, `HeroBanner`.

Backend tests cover **only products** (`ProductEndpointTests`, `MockProductServiceTests`). **There are zero tests for cart endpoints or `InMemoryCartService`** — they will need to be written alongside any cart implementation.
