// Service Clients - HTTP clients for calling external services
// This simulates how you'd call other teams' services at Amazon

import fetch from 'node-fetch';

// Configuration
const MOCK_SERVICES_URL = process.env.MOCK_SERVICES_URL || 'http://mock-services:3004';

// =============================================================================
// USER SERVICE CLIENT (simulates calling identity team's service)
// =============================================================================

export class UserServiceClient {
  constructor(baseUrl = MOCK_SERVICES_URL) {
    this.baseUrl = baseUrl;
  }

  // Get current user profile from JWT token
  async getCurrentUser(authToken) {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`User service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error('Unable to authenticate user');
    }
  }

  // Get user profile by ID
  async getUserById(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        throw new Error(`User service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get user ${userId}:`, error);
      return null;
    }
  }

  // Get multiple users by IDs (for enrichment)
  async getUsersByIds(userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      const idsParam = userIds.join(',');
      const response = await fetch(`${this.baseUrl}/users?ids=${idsParam}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`User service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get users by IDs:', error);
      return [];
    }
  }
}

// =============================================================================
// PRODUCT SERVICE CLIENT (simulates calling catalog team's service)
// =============================================================================

export class ProductServiceClient {
  constructor(baseUrl = MOCK_SERVICES_URL) {
    this.baseUrl = baseUrl;
  }

  // Get product by ID
  async getProductById(productId) {
    try {
      const response = await fetch(`${this.baseUrl}/products/${productId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Product not found
        }
        throw new Error(`Product service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to get product ${productId}:`, error);
      return null;
    }
  }

  // Get multiple products by IDs (for enrichment)
  async getProductsByIds(productIds) {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const idsParam = productIds.join(',');
      const response = await fetch(`${this.baseUrl}/products/byIds?ids=${idsParam}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Product service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get products by IDs:', error);
      return [];
    }
  }

  // Search products
  async searchProducts(query, options = {}) {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (options.category) params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const response = await fetch(`${this.baseUrl}/products/search?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Product service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search products:', error);
      return { products: [], total: 0 };
    }
  }

  // Get all products with pagination
  async getAllProducts(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.search) params.append('search', options.search);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const response = await fetch(`${this.baseUrl}/products?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Product service error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get all products:', error);
      return { products: [], total: 0 };
    }
  }
}

// Create singleton instances
export const userServiceClient = new UserServiceClient();
export const productServiceClient = new ProductServiceClient();
