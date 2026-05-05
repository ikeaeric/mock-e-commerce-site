using Microsoft.AspNetCore.Http.HttpResults;
using MockEcommerce.Api.Models;
using MockEcommerce.Api.Services;

namespace MockEcommerce.Api.Endpoints;

/// <summary>
/// Maps shopping cart endpoints under <c>/api/cart</c>.
/// </summary>
public static class CartEndpoints
{
    /// <summary>Registers cart-related routes on the given endpoint route builder.</summary>
    public static void MapCartEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("api/cart")
            .WithTags("Cart");

        group.MapGet("/", GetCart)
            .WithName("GetCart")
            .WithSummary("Returns all items currently in the cart.");

        group.MapPost("/", AddToCart)
            .WithName("AddToCart")
            .WithSummary("Adds a product to the cart or increments quantity if already present.");

        group.MapPut("/{productId:int}", UpdateQuantity)
            .WithName("UpdateCartItemQuantity")
            .WithSummary("Replaces the quantity of an existing cart line. 1 ≤ quantity ≤ 5.");

        group.MapDelete("/{productId:int}", RemoveFromCart)
            .WithName("RemoveFromCart")
            .WithSummary("Removes a single product from the cart by its product ID.");

        group.MapDelete("/", ClearCart)
            .WithName("ClearCart")
            .WithSummary("Removes all items from the cart.");
    }

    /// <summary>Returns all items currently in the cart.</summary>
    internal static Ok<IEnumerable<CartItem>> GetCart(ICartService cartService)
    {
        return TypedResults.Ok(cartService.GetAll());
    }

    /// <summary>Adds a product to the cart or increments quantity if already present.</summary>
    internal static Results<Created<CartItem>, Ok<CartItem>, NotFound<string>, ValidationProblem> AddToCart(
        AddToCartRequest request,
        IProductService productService,
        ICartService cartService)
    {
        if (request.Quantity < 1)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["quantity"] = ["quantity must be at least 1."]
            });
        }

        if (request.Quantity > CartConstants.MaxQuantityPerItem)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["quantity"] = [$"quantity must not exceed {CartConstants.MaxQuantityPerItem}."]
            });
        }

        var product = productService.GetById(request.ProductId);
        if (product is null)
        {
            return TypedResults.NotFound($"Product {request.ProductId} not found.");
        }

        var existing = cartService.GetByProductId(request.ProductId);
        if (existing is null)
        {
            var newItem = new CartItem
            {
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = product.Price,
                Quantity = request.Quantity
            };
            cartService.Add(newItem);
            return TypedResults.Created($"/api/cart/{product.Id}", newItem);
        }

        var newQty = existing.Quantity + request.Quantity;
        if (newQty > CartConstants.MaxQuantityPerItem)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["quantity"] = [$"Cannot exceed {CartConstants.MaxQuantityPerItem} per product. Currently {existing.Quantity} in cart; requested to add {request.Quantity}."]
            });
        }

        var increment = new CartItem
        {
            ProductId = product.Id,
            ProductName = existing.ProductName,
            UnitPrice = existing.UnitPrice,
            Quantity = request.Quantity
        };
        var updated = cartService.Add(increment);
        return TypedResults.Ok(updated);
    }

    /// <summary>Replaces the quantity of an existing cart line.</summary>
    internal static Results<Ok<CartItem>, NotFound<string>, ValidationProblem> UpdateQuantity(
        int productId,
        UpdateCartItemRequest request,
        ICartService cartService)
    {
        if (request.Quantity < 1)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["quantity"] = ["quantity must be at least 1."]
            });
        }

        if (request.Quantity > CartConstants.MaxQuantityPerItem)
        {
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["quantity"] = [$"quantity must not exceed {CartConstants.MaxQuantityPerItem}."]
            });
        }

        var updated = cartService.UpdateQuantity(productId, request.Quantity);
        if (updated is null)
        {
            return TypedResults.NotFound($"Cart item for product {productId} not found.");
        }

        return TypedResults.Ok(updated);
    }

    /// <summary>Removes a single product from the cart by its product ID.</summary>
    internal static Results<NoContent, NotFound> RemoveFromCart(int productId, ICartService cartService)
    {
        return cartService.Remove(productId)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }

    /// <summary>Removes all items from the cart.</summary>
    internal static NoContent ClearCart(ICartService cartService)
    {
        cartService.Clear();
        return TypedResults.NoContent();
    }
}

/// <summary>Request body for adding a product to the cart.</summary>
public record AddToCartRequest(int ProductId, int Quantity);

/// <summary>Request body for replacing the quantity of an existing cart line.</summary>
public record UpdateCartItemRequest(int Quantity);
