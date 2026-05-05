using MockEcommerce.Api.Models;

namespace MockEcommerce.Api.Services;

/// <summary>
/// Defines operations for managing shopping cart items.
/// </summary>
public interface ICartService
{
    /// <summary>Returns all items currently in the cart.</summary>
    IEnumerable<CartItem> GetAll();

    /// <summary>
    /// Adds a product to the cart or increments its quantity if already present.
    /// </summary>
    /// <param name="item">The cart item to add.</param>
    /// <returns>The added or updated cart item.</returns>
    CartItem Add(CartItem item);

    /// <summary>
    /// Finds an existing cart item by product ID.
    /// </summary>
    /// <param name="productId">The product ID to look up.</param>
    /// <returns>The matching cart item, or <c>null</c> if not found.</returns>
    CartItem? GetByProductId(int productId);

    /// <summary>
    /// Replaces the quantity of an existing cart line.
    /// </summary>
    /// <param name="productId">The product ID whose line should be updated.</param>
    /// <param name="quantity">The new quantity (caller is responsible for range validation).</param>
    /// <returns>The updated cart item, or <c>null</c> if no line exists for the product.</returns>
    CartItem? UpdateQuantity(int productId, int quantity);

    /// <summary>
    /// Removes a cart item by product ID.
    /// </summary>
    /// <param name="productId">The product ID to remove.</param>
    /// <returns><c>true</c> if the item was found and removed; otherwise <c>false</c>.</returns>
    bool Remove(int productId);

    /// <summary>Removes all items from the cart.</summary>
    void Clear();
}
