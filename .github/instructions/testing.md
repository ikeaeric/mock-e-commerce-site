# Running the test suites

This repo has **two independent** test suites: a Vitest one for the React frontend and an xUnit one for the .NET backend. They are not orchestrated together — there is no top-level "run everything" command.

## Frontend tests (Vitest)

**Run from the repository root:**
```bash
npm test                  # → runs `vitest run`
npm run test:frontend     # → identical alias
```

Both scripts are defined in the **root** `package.json`. They map to:
```json
"scripts": {
  "test:frontend": "vitest run",
  "test": "vitest run"
}
```

Coverage is available via the already-installed `@vitest/coverage-v8`:
```bash
npx vitest run --coverage
```
Watch mode (not in package.json scripts):
```bash
npx vitest        # watch mode
```

### Vitest configuration
File: `vitest.config.ts` (at repo root).
- `environment: 'jsdom'`
- `globals: true` — `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` are available without imports.
- `setupFiles: ['src/frontend/src/test-setup.ts']` — that file does `import '@testing-library/jest-dom'`.
- `include: ['test/frontend/**/*.{test,spec}.{ts,tsx}']` — tests live in `test/frontend/`, NOT colocated with source.
- Plugin: `@vitejs/plugin-react`.

### What's covered
`App.test.tsx`, `hooks/useProducts.test.ts`, and one test file per component under `test/frontend/components/`.

## Backend tests (xUnit)

**Run from the test project:**
```bash
cd test/backend/MockEcommerce.Api.Tests
dotnet test
```
Or from the backend folder using the solution:
```bash
cd src/backend
dotnet test MockEcommerce.slnx
```

### Test setup quirks
- **Test SDK / framework:** `Microsoft.NET.Test.Sdk 17.14.1`, `xunit 2.9.3`, `xunit.runner.visualstudio 3.1.4`.
- **Integration tests** use `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory<Program>`). For this to work, `Program.cs` ends with `public partial class Program { }` — do not remove that line.
- **Global usings:** the test csproj includes `<Using Include="Xunit" />`, so `[Fact]` works without `using Xunit;` at the top of test files.
- `Microsoft.AspNetCore.Mvc.Testing` is pinned at `10.0.*`.

### What's covered
- `ProductEndpointTests`: integration tests against `/api/products` (200/404 cases).
- `MockProductServiceTests`: unit tests for `GetAll` / `GetById` and a sanity check that every product has positive id, non-empty name, non-zero price, and non-empty category.
- **No tests exist for the cart** — `CartEndpoints` and `InMemoryCartService` are stubbed.

## Linting (frontend only)

```bash
npm --workspace frontend run lint     # eslint .
```
ESLint config: `src/frontend/eslint.config.js` (flat config, ESLint 9 + `typescript-eslint`).

## Building

Frontend:
```bash
npm --workspace frontend run build    # tsc -b && vite build
npm --workspace frontend run preview  # serve the production build
```
Backend:
```bash
cd src/backend/MockEcommerce.Api
dotnet build                          # or: dotnet run
```
