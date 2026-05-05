# Where things live

## Most-asked-about files
| Concept                              | Path                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Hardcoded product catalog (5 items)  | `src/backend/MockEcommerce.Api/Services/MockProductService.cs`                      |
| Product model (server)               | `src/backend/MockEcommerce.Api/Models/Product.cs`                                   |
| Cart item model (server)             | `src/backend/MockEcommerce.Api/Models/CartItem.cs` (`TotalPrice` is computed)       |
| Product HTTP endpoints               | `src/backend/MockEcommerce.Api/Endpoints/ProductEndpoints.cs`                       |
| Cart HTTP endpoints (STUBBED)        | `src/backend/MockEcommerce.Api/Endpoints/CartEndpoints.cs`                          |
| `IProductService` interface          | `src/backend/MockEcommerce.Api/Services/IProductService.cs`                         |
| `ICartService` interface             | `src/backend/MockEcommerce.Api/Services/ICartService.cs`                            |
| Cart service impl (STUBBED)          | `src/backend/MockEcommerce.Api/Services/InMemoryCartService.cs`                     |
| App composition / DI / CORS          | `src/backend/MockEcommerce.Api/Program.cs`                                          |
| Backend launch profiles / ports      | `src/backend/MockEcommerce.Api/Properties/launchSettings.json`                      |
| Solution file                        | `src/backend/MockEcommerce.slnx`                                                    |
| React entrypoint                     | `src/frontend/src/main.tsx`                                                         |
| Root component / cart UI state       | `src/frontend/src/App.tsx`                                                          |
| Frontend API client (`fetch`)        | `src/frontend/src/api/index.ts`                                                     |
| `useProducts` data hook              | `src/frontend/src/hooks/useProducts.ts`                                             |
| Frontend types (`Product`, `AddToCartRequest`) | `src/frontend/src/types/index.ts`                                         |
| Vite config + dev proxy              | `src/frontend/vite.config.ts`                                                       |
| Vitest config                        | `vitest.config.ts` (at repo **root**)                                               |
| Vitest setup (`jest-dom` import)     | `src/frontend/src/test-setup.ts`                                                    |
| Frontend component folders           | `src/frontend/src/components/{Header,HeroBanner,ProductCard,ProductList}/`          |
| Frontend tests                       | `test/frontend/**/*.test.{ts,tsx}`                                                  |
| Backend tests                        | `test/backend/MockEcommerce.Api.Tests/`                                             |
| Code owners                          | `.github/CODEOWNERS` (sole owner: `@kranoz91`)                                       |

## Frontend component layout
Each component lives in its own folder with a barrel `index.ts`:
```
src/frontend/src/components/
├── Header/        Header.tsx        index.ts
├── HeroBanner/    HeroBanner.tsx    index.ts
├── ProductCard/   ProductCard.tsx   index.ts
└── ProductList/   ProductList.tsx   index.ts
```
All exports are **named** (e.g. `export function Header`), not default.

## Tests mirror src layout
```
test/frontend/
├── App.test.tsx
├── hooks/useProducts.test.ts
└── components/
    ├── Header/Header.test.tsx
    ├── HeroBanner/HeroBanner.test.tsx
    ├── ProductCard/ProductCard.test.tsx
    └── ProductList/ProductList.test.tsx
```
```
test/backend/MockEcommerce.Api.Tests/
├── MockEcommerce.Api.Tests.csproj
├── Endpoints/ProductEndpointTests.cs   # WebApplicationFactory<Program> integration
└── Services/MockProductServiceTests.cs # Unit tests
```
