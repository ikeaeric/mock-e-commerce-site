# Tech stack — at a glance

## Frontend (`src/frontend/`)
- **React 19.2.4** + **TypeScript ~6.0.2** + **Vite 8** (ESM, JSX runtime: `react-jsx`).
- Plain CSS in `App.css` / `index.css`. **No** Tailwind, **no** CSS-in-JS, **no** UI component library.
- ESLint 9 (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- Network: native `fetch` only. **No** axios / react-query / SWR.
- Routing: **none** (no React Router). Anchors all point to `/`.
- State management: **none** beyond `useState` / `useRef` / `useEffect` in `App.tsx`.
- Vite dev server: **http://localhost:5173**. Proxy: `/api/*` → `http://localhost:5063` (configured in `src/frontend/vite.config.ts`).

## Backend (`src/backend/MockEcommerce.Api/`)
- **ASP.NET Core Minimal API on .NET 10** (`<TargetFramework>net10.0</TargetFramework>`).
- Single NuGet package: `Microsoft.AspNetCore.OpenApi 10.0.5`.
- C# with `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`.
- Solution: `src/backend/MockEcommerce.slnx` (new XML `.slnx` format).
- HTTP profile: `http://localhost:5063` (default). HTTPS profile: `https://localhost:7296`.
- CORS: only `http://localhost:5173` allowed.
- DI lifetime for both services: **Singleton**.
- OpenAPI exposed at `/openapi/v1.json` (no Swagger UI).
- **No database** (catalog is hardcoded in C#). **No authentication.**

## Testing
- **Frontend:** **Vitest 4** + `@testing-library/react 16` + `@testing-library/user-event 14` + `@testing-library/jest-dom 6` + `jsdom 29`. Vitest globals (`describe`/`it`/`expect`/`vi`) are enabled — no imports needed.
- **Backend:** **xUnit 2.9.3** + `Microsoft.AspNetCore.Mvc.Testing 10.0.*` (uses `WebApplicationFactory<Program>` for in-process integration tests) + `coverlet.collector` for coverage.

## Tooling / package management
- **npm workspaces.** Root `package.json` declares `"workspaces": ["src/frontend"]`. Run `npm install` once at the **root** — never inside `src/frontend/`.
- The root `package.json` defines the `test` and `test:frontend` scripts (both `vitest run`); component scripts (`dev`, `build`, `lint`, `preview`) live in `src/frontend/package.json`.
