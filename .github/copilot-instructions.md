# Mock E-commerce Site — AI Agent Instructions

This is a mock e-commerce repository used for educational/training purposes. It pairs a **React + TypeScript (Vite) frontend** with an **ASP.NET Core (.NET 10) Minimal API backend**. Several backend pieces are intentionally stubbed with `NotImplementedException` — see the "Implementation state" section.

---

## 1. Tech stack (authoritative)

### Frontend — `src/frontend/`
- **React 19** (`react`, `react-dom` `^19.2.4`) + **TypeScript** (`~6.0.2`)
- **Vite 8** (`vite ^8.0.4`) build tool / dev server
- **Plain CSS** in `App.css` and `index.css` (no Tailwind, no CSS-in-JS, no UI library)
- **ESLint 9** with `typescript-eslint` and `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Module type: ESM (`"type": "module"`)
- JSX: `react-jsx` (no need to import React for JSX)

### Backend — `src/backend/MockEcommerce.Api/`
- **ASP.NET Core Minimal API** on **.NET 10** (`<TargetFramework>net10.0</TargetFramework>`)
- Single NuGet dependency: `Microsoft.AspNetCore.OpenApi` (10.0.5) — exposes OpenAPI via `AddOpenApi()` / `MapOpenApi()`
- `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`
- Solution file: `src/backend/MockEcommerce.slnx` (new XML solution format)

### Testing
- **Frontend:** **Vitest 4** + **@testing-library/react 16** + **@testing-library/user-event 14** + **@testing-library/jest-dom 6** + **jsdom 29**. Vitest globals enabled (`globals: true`) — `describe`, `it`, `expect`, `vi`, `beforeEach`, etc. are available without imports.
- **Backend:** **xUnit 2.9** + **Microsoft.AspNetCore.Mvc.Testing 10.0.*** (uses `WebApplicationFactory<Program>` for integration tests) + `coverlet.collector` for coverage.

### Package manager / workspaces
- npm workspaces. The root `package.json` declares `"workspaces": ["src/frontend"]`. Run `npm install` once at the **root** — do not run it inside `src/frontend`.

---

## 2. Project layout

```
mock-e-commerce-site/
├── package.json                 # Root: npm workspaces + Vitest devDeps + test scripts
├── vitest.config.ts             # Frontend test config (jsdom, includes test/frontend/**)
├── tsconfig.json                # Root TS config (used by Vitest)
├── .editorconfig
├── README.md                    # Near-empty; do not rely on it
├── .github/
│   ├── CODEOWNERS               # Owner: @kranoz91
│   └── copilot-instructions.md  # ← This file
│   └── instructions/            # Topic-specific instruction files
├── src/
│   ├── frontend/                # React + Vite app (npm workspace named "frontend")
│   │   ├── package.json         # Frontend-only deps + scripts (dev, build, lint, preview)
│   │   ├── vite.config.ts       # Vite config — proxies /api → http://localhost:5063
│   │   ├── eslint.config.js
│   │   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   │   ├── index.html
│   │   ├── public/              # icons.svg, favicon.svg
│   │   └── src/
│   │       ├── main.tsx                  # Entrypoint — mounts <App /> in StrictMode
│   │       ├── App.tsx                   # Root component (cart state, notifications)
│   │       ├── App.css, index.css
│   │       ├── test-setup.ts             # Imports '@testing-library/jest-dom'
│   │       ├── api/index.ts              # fetch-based API client (BASE_URL = '/api')
│   │       ├── hooks/useProducts.ts      # Custom hook: loads products on mount
│   │       ├── types/index.ts            # Product, AddToCartRequest interfaces
│   │       ├── assets/                   # hero.png, react.svg, vite.svg
│   │       └── components/
│   │           ├── Header/{Header.tsx,index.ts}
│   │           ├── HeroBanner/{HeroBanner.tsx,index.ts}
│   │           ├── ProductCard/{ProductCard.tsx,index.ts}
│   │           └── ProductList/{ProductList.tsx,index.ts}
│   └── backend/
│       ├── MockEcommerce.slnx            # Solution (new .slnx XML format)
│       └── MockEcommerce.Api/
│           ├── MockEcommerce.Api.csproj  # net10.0, Microsoft.NET.Sdk.Web
│           ├── Program.cs                # DI registration, CORS, endpoint mapping
│           ├── appsettings.json, appsettings.Development.json
│           ├── Properties/launchSettings.json   # http: 5063, https: 7296
│           ├── Endpoints/
│           │   ├── ProductEndpoints.cs   # /api/products  (IMPLEMENTED)
│           │   └── CartEndpoints.cs      # /api/cart      (STUBBED)
│           ├── Models/
│           │   ├── Product.cs            # Id, Name, Description, Price, Category, Stock, ImageUrl
│           │   └── CartItem.cs           # ProductId, ProductName, UnitPrice, Quantity, TotalPrice (computed)
│           └── Services/
│               ├── IProductService.cs
│               ├── MockProductService.cs # IMPLEMENTED — hardcoded 5-product list
│               ├── ICartService.cs
│               └── InMemoryCartService.cs# STUBBED — all methods throw NotImplementedException
└── test/
    ├── frontend/                # Vitest tests (mirrors src/frontend/src layout)
    │   ├── App.test.tsx
    │   ├── hooks/useProducts.test.ts
    │   └── components/{Header,HeroBanner,ProductCard,ProductList}/*.test.tsx
    └── backend/
        └── MockEcommerce.Api.Tests/
            ├── MockEcommerce.Api.Tests.csproj
            ├── Endpoints/ProductEndpointTests.cs   # WebApplicationFactory integration tests
            └── Services/MockProductServiceTests.cs # Unit tests
```

**Key path conventions:**
- Frontend tests live under `test/frontend/` (NOT colocated with source). Vitest's `include` pattern is `test/frontend/**/*.{test,spec}.{ts,tsx}`.
- Each frontend component lives in its own folder with an `index.ts` barrel so imports look like `from '../components/ProductCard'`.

---

## 3. Implementation state — what works vs. what's stubbed

This is the most important quirk of this repo. **Reading these files: yes; relying on the cart actually working: no.**

### ✅ Implemented
- `GET /api/products` → returns all 5 hardcoded products (200 OK).
- `GET /api/products/{id:int}` → returns one product or 404. (`ProductEndpoints.cs`)
- `MockProductService.GetAll()` and `GetById(int)` (`MockProductService.cs`).
- The whole React frontend renders: `Header`, `HeroBanner`, `ProductList` of `ProductCard`s, with loading and error states, and a transient "added to cart" notification (3 s timeout).
- `useProducts` hook calls `fetchProducts()` on mount.

### ❌ Stubbed — throws `NotImplementedException`
All four cart **endpoint handlers** in `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs`:
- `GetCart` (`GET /api/cart`)
- `AddToCart` (`POST /api/cart`)
- `RemoveFromCart` (`DELETE /api/cart/{productId:int}`)
- `ClearCart` (`DELETE /api/cart`)

All five **methods** of `InMemoryCartService` in `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs`:
- `GetAll`, `GetByProductId`, `Add`, `Remove`, `Clear`

The cart routes **are** registered (via `app.MapCartEndpoints()` in `Program.cs`) and the OpenAPI metadata exists, but calling them at runtime returns HTTP 500. The frontend's "Add to cart" button will therefore display the "Failed to add item to cart." error notification when the backend is running.

### Notable detail
`InMemoryCartService` is registered as a **Singleton** (`Program.cs`) — there is a deliberate comment in the file: *"Registered as Singleton for demo purposes; all users share a single cart. Replace with a per-user scoped implementation when authentication is added."* It uses `private readonly Lock _lock = new();` (C# 13 `System.Threading.Lock` type) for thread safety, but the lock is not yet used because the methods throw.

---

## 4. Product catalog data (hardcoded)

The product list is a `static readonly List<Product>` in `src/backend/MockEcommerce.Api/Services/MockProductService.cs`. **There is no database.** Exactly **5 products** ship with the app:

| Id | Name                          | Price   | Category    | Stock | Image (placehold.co) |
| -- | ----------------------------- | ------- | ----------- | ----- | -------------------- |
| 1  | Wireless Headphones           | 79.99   | Electronics | 25    | `Headphones`         |
| 2  | Running Shoes                 | 59.99   | Footwear    | 40    | `Running+Shoes`      |
| 3  | Stainless Steel Water Bottle  | 24.99   | Accessories | 100   | `Water+Bottle`       |
| 4  | Mechanical Keyboard           | 109.99  | Electronics | 15    | `Keyboard`           |
| 5  | Yoga Mat                      | 34.99   | Sports      | 60    | `Yoga+Mat`           |

Prices are `decimal` (USD). Image URLs are all `https://placehold.co/300x300?text=…`. To add or edit catalog data, edit the `Products` field in `MockProductService.cs` — there is no seeding script, no JSON file, no DB migration.

---

## 5. How to run things

### Install
```bash
npm install        # at repo root — covers the workspace
```

### Frontend dev server
```bash
npm --workspace frontend run dev
# or: cd src/frontend && npm run dev
# Serves on http://localhost:5173
# Vite proxies /api/* to http://localhost:5063 (backend HTTP profile)
```

### Frontend build / lint / preview
```bash
npm --workspace frontend run build     # tsc -b && vite build
npm --workspace frontend run lint      # eslint .
npm --workspace frontend run preview
```

### Backend dev server
```bash
cd src/backend/MockEcommerce.Api
dotnet run                              # http://localhost:5063 (default "http" profile)
# Use the "https" profile for https://localhost:7296 + http://localhost:5063
```
CORS is configured to allow only `http://localhost:5173` (the Vite default).

### Tests — frontend (Vitest)
From the **repo root**:
```bash
npm test                  # runs `vitest run`
npm run test:frontend     # identical — runs `vitest run`
```
Both scripts are defined in the **root** `package.json`, not in `src/frontend/package.json`. The Vitest config (`vitest.config.ts`) is at the repo root; it sets `environment: 'jsdom'`, `globals: true`, loads `src/frontend/src/test-setup.ts`, and includes `test/frontend/**/*.{test,spec}.{ts,tsx}`. Coverage is available via `@vitest/coverage-v8`.

### Tests — backend (xUnit)
```bash
cd test/backend/MockEcommerce.Api.Tests
dotnet test
# Or from src/backend: dotnet test MockEcommerce.slnx
```
`Program.cs` ends with `public partial class Program { }` to make `WebApplicationFactory<Program>` work.

---

## 6. API surface (what the frontend talks to)

Frontend `BASE_URL = '/api'` (in `src/frontend/src/api/index.ts`). Calls are proxied by Vite to the backend in dev. The frontend uses `fetch` directly — no `axios`, no react-query, no SWR.

| Method | Path                   | Handler / Status                                 | Frontend caller        |
| ------ | ---------------------- | ------------------------------------------------ | ---------------------- |
| GET    | `/api/products`        | `ProductEndpoints.GetAll` — works                | `fetchProducts()`      |
| GET    | `/api/products/{id}`   | `ProductEndpoints.GetById` — works (200/404)     | `fetchProductById(id)` |
| GET    | `/api/cart`            | `CartEndpoints.GetCart` — **throws**             | (not called yet)       |
| POST   | `/api/cart`            | `CartEndpoints.AddToCart` — **throws**           | `addToCart(req)`       |
| DELETE | `/api/cart/{productId}`| `CartEndpoints.RemoveFromCart` — **throws**      | (not called yet)       |
| DELETE | `/api/cart`            | `CartEndpoints.ClearCart` — **throws**           | (not called yet)       |

`AddToCartRequest` is `record AddToCartRequest(int ProductId, int Quantity)` (defined at the bottom of `CartEndpoints.cs`). The frontend mirror is `interface AddToCartRequest { productId: number; quantity: number }` in `src/frontend/src/types/index.ts`.

`CartItem` (server) has `TotalPrice` as a **computed property** (`UnitPrice * Quantity`) — not settable. The frontend defines its own local `CartItem` interface inside `api/index.ts` (with `totalPrice` as a plain number returned by the server).

---

## 7. Frontend conventions / quirks

- Components are **named exports** (e.g., `export function Header(...)`), not default exports. Each component folder has an `index.ts` barrel that re-exports.
- `App.tsx` owns the cart state: `cartItemCount` (number) and `cartMessage` (string | null). The "added to cart" message auto-clears after **3000 ms** via a `setTimeout` stored in a `useRef` that's cleared on unmount.
- Notification region uses `role="status"`, looked up in tests via `getByRole('status')`.
- The Add-to-cart button has `aria-label` of either `"Add {name} to cart"` or `"Out of Stock"` (when `stock === 0`); tests select it via this label.
- BEM-ish CSS class naming: `header__inner`, `product-card__image`, `app__notification`, etc.
- Strict mode is on: `<App />` is wrapped in `<StrictMode>` in `main.tsx`.
- `useProducts` swallows non-`Error` rejections by returning the literal string `'Unknown error'` (covered by a test).

## 8. Backend conventions / quirks

- Minimal API style: endpoints registered as static extension methods (`MapProductEndpoints`, `MapCartEndpoints`) on `WebApplication`. Handlers are `internal static` methods on the static endpoint class, which makes them unit-testable.
- Return types use `TypedResults` and `Microsoft.AspNetCore.Http.HttpResults` (`Ok<T>`, `Results<…>`, `Created<T>`, `NoContent`, `NotFound`, `ValidationProblem`).
- Routes use route constraints: `/{id:int}`, `/{productId:int}`.
- `Program.cs` registers both services as **Singleton**: `IProductService → MockProductService`, `ICartService → InMemoryCartService`.
- OpenAPI is enabled (`AddOpenApi()` + `MapOpenApi()`). No Swagger UI; the OpenAPI document is served at `/openapi/v1.json` by default.
- `Program.cs` ends with `public partial class Program { }` so the test project can reference it as the generic argument to `WebApplicationFactory<Program>`.

---

## 9. When implementing the stubbed cart

If asked to fill in the cart implementation, the contract is already documented in XML doc comments:
- `ICartService.Add` should **add or increment quantity if a `CartItem` with the same `ProductId` already exists**.
- `Remove` returns `bool` (`true` if found+removed, else `false`).
- `Clear` removes everything.
- The `Lock _lock` field exists for synchronizing reads/writes across threads (use `lock (_lock) { … }`).
- Endpoint handler signatures already declare the expected response variants — e.g., `AddToCart` returns `Results<Created<CartItem>, Ok<CartItem>, NotFound<string>, ValidationProblem>`, implying:
  - 201 Created when a new line is added,
  - 200 OK when an existing line's quantity is incremented,
  - 404 NotFound (with a string body) when the product ID doesn't exist,
  - 400 ValidationProblem for invalid input (e.g., quantity ≤ 0).

There are **no existing tests for cart behavior**; only product tests exist (`ProductEndpointTests.cs`, `MockProductServiceTests.cs`).

---

## 10. Things this repo does NOT have

- No database, no ORM, no EF Core, no migrations.
- No authentication / authorization.
- No routing library on the frontend (no React Router). All `<a>` tags point to `/`.
- No state management library (no Redux, Zustand, Jotai). Cart count lives in `useState` inside `App.tsx`.
- No Docker / docker-compose, no CI workflows under `.github/workflows/`.
- No Storybook, no Playwright/Cypress, no E2E tests.
- No Tailwind, no CSS modules — just plain global CSS files.
- No `.env` files; the only config knob is the Vite proxy target.
- No production build pipeline that ties frontend + backend together; they are run independently.
