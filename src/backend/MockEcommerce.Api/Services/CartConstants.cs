namespace MockEcommerce.Api.Services;

/// <summary>Cart-related constants shared across the service and endpoint layers.</summary>
public static class CartConstants
{
    /// <summary>Maximum quantity allowed for any single product line in the cart.</summary>
    public const int MaxQuantityPerItem = 5;
}
