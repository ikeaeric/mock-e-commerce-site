# Product catalog data

There is **no database**. The catalog is a `static readonly List<Product>` defined inline at the top of `src/backend/MockEcommerce.Api/Services/MockProductService.cs`. To change the catalog, edit that file — there is no JSON seed, no migration, no admin endpoint.

## The 5 products that ship with the app

| Id | Name                          | Price (USD) | Category    | Stock | Description                                                                |
| -- | ----------------------------- | ----------- | ----------- | ----- | -------------------------------------------------------------------------- |
| 1  | Wireless Headphones           | 79.99       | Electronics | 25    | Over-ear noise-cancelling wireless headphones with 30-hour battery life.    |
| 2  | Running Shoes                 | 59.99       | Footwear    | 40    | Lightweight breathable running shoes for all-terrain use.                   |
| 3  | Stainless Steel Water Bottle  | 24.99       | Accessories | 100   | Insulated 32 oz water bottle that keeps drinks cold for 24 hours.           |
| 4  | Mechanical Keyboard           | 109.99      | Electronics | 15    | Compact tenkeyless mechanical keyboard with Cherry MX Blue switches.        |
| 5  | Yoga Mat                      | 34.99       | Sports      | 60    | Non-slip 6mm thick yoga mat with carrying strap.                            |

- Total: **5 products**.
- Categories used: **Electronics** (×2), **Footwear**, **Accessories**, **Sports**.
- Prices are `decimal` (USD).
- All `imageUrl`s are placeholders of the form `https://placehold.co/300x300?text=…` (e.g. `Headphones`, `Running+Shoes`, `Water+Bottle`, `Keyboard`, `Yoga+Mat`).

## `Product` shape (`src/backend/MockEcommerce.Api/Models/Product.cs`)

```csharp
public class Product {
    public int    Id          { get; set; }
    public string Name        { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price      { get; set; }
    public string Category    { get; set; } = string.Empty;
    public int    Stock       { get; set; }
    public string ImageUrl    { get; set; } = string.Empty;
}
```

The frontend mirror (`src/frontend/src/types/index.ts`):
```ts
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl: string;
}
```

## `CartItem` shape (`src/backend/MockEcommerce.Api/Models/CartItem.cs`)

```csharp
public class CartItem {
    public int      ProductId   { get; set; }
    public string   ProductName { get; set; } = string.Empty;
    public decimal  UnitPrice   { get; set; }
    public int      Quantity    { get; set; }
    public decimal  TotalPrice => UnitPrice * Quantity;   // computed, not settable
}
```
`AddToCartRequest` is a record on the server: `record AddToCartRequest(int ProductId, int Quantity)` (declared at the bottom of `CartEndpoints.cs`).
