// Test for WhatsApp + Shopify Integration
const { triggerShopifyOrderStatusAutomation } = require('../lib/shopifyOrderAutomationTrigger');

// Mock database
const mockDb = {
  collection: jest.fn().mockReturnThis(),
  updateOne: jest.fn().mockResolvedValue({}),
  insertOne: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue({
    shopify: {
      shopDomain: 'test-shop.myshopify.com',
      accessToken: 'test-access-token'
    },
    whatsapp: {
      phoneNumberId: '123456789',
      accessToken: 'test-whatsapp-token'
    }
  })
};

// Mock ShopifyClient
jest.mock('../services/shopifyClient', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getOrder: jest.fn().mockResolvedValue({
        id: '123456789',
        order_number: '1001',
        customer: {
          first_name: 'John',
          last_name: 'Doe',
          phone: '+1234567890'
        },
        total_price: '99.99',
        currency: 'USD',
        financial_status: 'pending',
        fulfillment_status: 'pending',
        line_items: [
          {
            title: 'Test Product',
            quantity: 1
          }
        ],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      })
    };
  });
});

// Mock WhatsAppTemplateSender
jest.mock('../utils/sendWhatsAppTemplate', () => {
  return jest.fn().mockImplementation(() => {
    return {
      sendOrderConfirmation: jest.fn().mockResolvedValue({}),
      sendTextMessage: jest.fn().mockResolvedValue({})
    };
  });
});

describe('WhatsApp + Shopify Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should trigger Shopify Order Status Automation successfully', async () => {
    const integrations = {
      shopify: {
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-access-token'
      },
      whatsapp: {
        phoneNumberId: '123456789',
        accessToken: 'test-whatsapp-token'
      }
    };
    
    const shopifyOrderId = '123456789';
    const customerPhone = '+1234567890';
    
    const result = await triggerShopifyOrderStatusAutomation(
      mockDb,
      integrations,
      shopifyOrderId,
      customerPhone
    );
    
    expect(result.success).toBe(true);
    expect(result.orderId).toBe(shopifyOrderId);
    
    // Verify that the order was saved to database
    expect(mockDb.collection).toHaveBeenCalledWith('orders');
    expect(mockDb.collection().updateOne).toHaveBeenCalled();
    
    // Verify that order activity was logged
    expect(mockDb.collection).toHaveBeenCalledWith('order_activity_log');
    expect(mockDb.collection().insertOne).toHaveBeenCalled();
  });

  test('should handle missing customer phone number', async () => {
    const integrations = {
      shopify: {
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-access-token'
      },
      whatsapp: {
        phoneNumberId: '123456789',
        accessToken: 'test-whatsapp-token'
      }
    };
    
    const shopifyOrderId = '123456789';
    const customerPhone = null; // Missing phone number
    
    const result = await triggerShopifyOrderStatusAutomation(
      mockDb,
      integrations,
      shopifyOrderId,
      customerPhone
    );
    
    expect(result.success).toBe(true);
    expect(result.orderId).toBe(shopifyOrderId);
  });

  test('should handle errors gracefully', async () => {
    const integrations = {
      shopify: {
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-access-token'
      },
      whatsapp: {
        phoneNumberId: '123456789',
        accessToken: 'test-whatsapp-token'
      }
    };
    
    const shopifyOrderId = 'invalid-order-id';
    const customerPhone = '+1234567890';
    
    // Mock an error in getOrder
    const ShopifyClient = require('../services/shopifyClient');
    ShopifyClient.mockImplementation(() => {
      return {
        getOrder: jest.fn().mockRejectedValue(new Error('Order not found'))
      };
    });
    
    await expect(triggerShopifyOrderStatusAutomation(
      mockDb,
      integrations,
      shopifyOrderId,
      customerPhone
    )).rejects.toThrow('Order not found');
  });
});