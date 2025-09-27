// Shopify API Client Wrapper
const config = require('../config');

class ShopifyClient {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = config.shopify.apiVersion;
    this.baseUrl = `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  // Make a request to Shopify API
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, mergedOptions);
      const contentType = response.headers.get('content-type');
      
      // Handle cases where response might not be JSON
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        // Create a more detailed error message
        let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`;
        
        if (data) {
          if (data.message) {
            errorMessage = `Shopify API Error: ${data.message}`;
          } else if (data.errors) {
            // Handle different error formats
            if (typeof data.errors === 'string') {
              errorMessage = `Shopify API Error: ${data.errors}`;
            } else if (typeof data.errors === 'object') {
              // Handle object errors (might be validation errors)
              const errorDetails = Object.keys(data.errors).map(key => {
                const value = data.errors[key];
                if (Array.isArray(value)) {
                  return `${key}: ${value.join(', ')}`;
                }
                return `${key}: ${value}`;
              }).join('; ');
              
              if (errorDetails) {
                errorMessage = `Shopify API Validation Error: ${errorDetails}`;
              } else {
                errorMessage = `Shopify API Error: ${JSON.stringify(data.errors)}`;
              }
            }
          }
        }
        
        console.error(`Shopify API request failed for ${url}:`, data);
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`Shopify API request failed for ${url}:`, error.message);
      // Preserve the original error but add context
      throw new Error(`Shopify API request failed: ${error.message}`);
    }
  }

  // Get all products
  async getProducts() {
    const response = await this.makeRequest('/products.json');
    return response.products.map(product => ({
      id: product.id.toString(),
      title: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200),
      price: product.variants[0]?.price || '0.00',
      image: product.images[0]?.src,
      handle: product.handle
    }));
  }

  // Get a specific product
  async getProduct(productId) {
    const response = await this.makeRequest(`/products/${productId}.json`);
    const product = response.product;
    
    return {
      id: product.id.toString(),
      title: product.title,
      description: product.body_html?.replace(/<[^>]*>/g, '').substring(0, 200),
      price: product.variants[0]?.price || '0.00',
      image: product.images[0]?.src,
      handle: product.handle,
      variants: product.variants.map(variant => ({
        id: variant.id.toString(),
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity
      }))
    };
  }

  // Get all orders
  async getOrders() {
    const response = await this.makeRequest('/orders.json?status=any');
    
    return response.orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.order_number,
      customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      customerEmail: order.customer?.email,
      customerPhone: order.customer?.phone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at)
    }));
  }

  // Get a specific order
  async getOrder(orderId) {
    const response = await this.makeRequest(`/orders/${orderId}.json`);
    const order = response.order;
    
    // Enhanced phone number extraction
    const customerPhone = this.extractCustomerPhone(order);
    
    return {
      id: order.id.toString(),
      orderNumber: order.order_number,
      customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      customerEmail: order.customer?.email,
      customerPhone: customerPhone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at),
      shippingAddress: order.shipping_address,
      billingAddress: order.billing_address
    };
  }

  // Create an order
  async createOrder(orderData) {
    const response = await this.makeRequest('/orders.json', {
      method: 'POST',
      body: JSON.stringify({ order: orderData })
    });
    
    const order = response.order;
    
    return {
      id: order.id.toString(),
      orderNumber: order.order_number,
      customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      customerEmail: order.customer?.email,
      customerPhone: order.customer?.phone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at)
    };
  }

  // Create a draft order
  async createDraftOrder(draftOrderData) {
    const response = await this.makeRequest('/draft_orders.json', {
      method: 'POST',
      body: JSON.stringify({ draft_order: draftOrderData })
    });
    
    return response.draft_order;
  }

  // Send invoice for a draft order
  async sendDraftOrderInvoice(draftOrderId, invoiceData) {
    const response = await this.makeRequest(`/draft_orders/${draftOrderId}/send_invoice.json`, {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
    
    return response.draft_order;
  }

  // Update an order
  async updateOrder(orderId, orderData) {
    const response = await this.makeRequest(`/orders/${orderId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ order: orderData })
    });
    
    const order = response.order;
    
    return {
      id: order.id.toString(),
      orderNumber: order.order_number,
      customerName: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      customerEmail: order.customer?.email,
      customerPhone: order.customer?.phone,
      total: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      lineItems: order.line_items || [],
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at || order.created_at)
    };
  }

  // Create a webhook
  async createWebhook(topic, address) {
    const response = await this.makeRequest('/webhooks.json', {
      method: 'POST',
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: 'json'
        }
      })
    });
    
    return response.webhook;
  }

  // Get all webhooks
  async getWebhooks() {
    const response = await this.makeRequest('/webhooks.json');
    return response.webhooks;
  }

  // Delete a webhook
  async deleteWebhook(webhookId) {
    await this.makeRequest(`/webhooks/${webhookId}.json`, {
      method: 'DELETE'
    });
  }

  // Get webhook delivery attempts
  async getWebhookDeliveryAttempts(webhookId) {
    const response = await this.makeRequest(`/webhooks/${webhookId}/delivery_attempts.json`);
    return response.delivery_attempts;
  }

  // Helper function to extract customer phone number with enhanced logic
  extractCustomerPhone(order) {
    // First try to get phone from customer object
    if (order.customer && order.customer.phone) {
      return order.customer.phone;
    }
    
    // Try to get phone from shipping address
    if (order.shipping_address && order.shipping_address.phone) {
      return order.shipping_address.phone;
    }
    
    // Try to get phone from billing address
    if (order.billing_address && order.billing_address.phone) {
      return order.billing_address.phone;
    }
    
    // Try to extract phone from shipping address name field if it contains a phone number
    if (order.shipping_address && order.shipping_address.name) {
      const phoneMatch = order.shipping_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        return phoneMatch[0].replace(/\s+/g, '');
      }
    }
    
    // Try to extract phone from billing address name field if it contains a phone number
    if (order.billing_address && order.billing_address.name) {
      const phoneMatch = order.billing_address.name.match(/[\+]?[\d\s\-\(\)]{10,}/);
      if (phoneMatch) {
        return phoneMatch[0].replace(/\s+/g, '');
      }
    }
    
    // Return null if no phone found
    return null;
  }

}

module.exports = ShopifyClient;