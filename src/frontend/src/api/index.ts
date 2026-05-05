import type { Product, AddToCartRequest } from '../types';

export interface CartItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export const MAX_CART_QTY = 5;

const BASE_URL = '/api';

async function parseError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && 'errors' in data && data.errors) {
      const messages: string[] = [];
      for (const value of Object.values(data.errors as Record<string, string[]>)) {
        if (Array.isArray(value)) messages.push(...value);
      }
      if (messages.length > 0) return messages.join(' ');
    }
    if (data && typeof data === 'object' && 'title' in data && typeof data.title === 'string') {
      return data.title;
    }
    if (typeof data === 'string') return data;
  } catch {
    return text;
  }
  return text;
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${BASE_URL}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function fetchProductById(id: number): Promise<Product> {
  const response = await fetch(`${BASE_URL}/products/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch product ${id}`);
  return response.json();
}

export async function fetchCart(): Promise<CartItem[]> {
  const response = await fetch(`${BASE_URL}/cart`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function addToCart(request: AddToCartRequest): Promise<CartItem> {
  const response = await fetch(`${BASE_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function updateCartItem(productId: number, quantity: number): Promise<CartItem> {
  const response = await fetch(`${BASE_URL}/cart/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function removeFromCart(productId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/cart/${productId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function clearCart(): Promise<void> {
  const response = await fetch(`${BASE_URL}/cart`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await parseError(response));
}
