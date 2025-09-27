// Enhanced WhatsApp Checkout Implementation
// This implementation follows the flow you described:
// 1. Customer clicks checkout button
// 2. Order details sent to admin/business account
// 3. Admin automation asks customer for additional info
// 4. Order created in Shopify based on responses

const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

class EnhancedWhatsAppCheckout {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connectToMongo() {
    if (!this.client) {
      this.client = new MongoClient(process.env.MONGO_URL);
      await this.client.connect();
      this.db = this.client.db(process.env.DB_NAME);
    }
    return this.db;
  }

  // Function to send message to admin/business account
  async notifyAdmin(db, orderDetails, customerPhone) {
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    const { whatsapp } = integrations;

    if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
      throw new Error("WhatsApp not configured");
    }

    // Format order summary for admin
    const orderSummary = `🛒 *New WhatsApp Checkout Request*

Customer Phone: ${customerPhone}

Items:
${orderDetails.cartItems.map(item => `• ${item.title} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total: ₹${orderDetails.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}

Customer will be contacted shortly to collect additional information.`;

    const messageData = {
      messaging_product: "whatsapp",
      to: whatsapp.phoneNumberId, // Send to admin/business account
      type: "text",
      text: {
        body: orderSummary
      }
    };

    // Save order details to database for later processing
    const orderRecord = {
      customerPhone: customerPhone,
      cartItems: orderDetails.cartItems,
      customerInfo: orderDetails.customerInfo || {},
      status: 'pending_admin_review',
      createdAt: new Date()
    };

    await db.collection('pending_orders').insertOne(orderRecord);

    // Send notification to admin
    const result = await this.sendWhatsAppMessage(
      whatsapp.phoneNumberId,
      whatsapp.accessToken,
      whatsapp.phoneNumberId,
      messageData
    );

    return {
      success: true,
      message: 'Admin notified successfully',
      orderRecordId: orderRecord._id
    };
  }

  // Function to initiate customer conversation
  async initiateCustomerConversation(db, customerPhone) {
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    const { whatsapp } = integrations;

    if (!whatsapp?.phoneNumberId || !whatsapp?.accessToken) {
      throw new Error("WhatsApp not configured");
    }

    const welcomeMessage = `🛍️ *WhatsApp Checkout - Order Processing*

Thank you for choosing WhatsApp checkout! 

Our team will collect the following information to process your order:
1. Delivery address
2. Payment method preference

Please reply with your full address to begin the process.`;

    const messageData = {
      messaging_product: "whatsapp",
      to: customerPhone.replace(/\D/g, ''),
      type: "text",
      text: {
        body: welcomeMessage
      }
    };

    const result = await this.sendWhatsAppMessage(
      whatsapp.phoneNumberId,
      whatsapp.accessToken,
      customerPhone,
      messageData
    );

    // Update order status
    await db.collection('pending_orders').updateOne(
      { customerPhone: customerPhone },
      { $set: { status: 'customer_contacted', contactedAt: new Date() } }
    );

    return result;
  }

  // Function to collect customer information
  async collectCustomerInfo(db, customerPhone, messageType, messageContent) {
    // Update customer info based on message type
    const updateData = {};
    
    switch(messageType) {
      case 'address':
        updateData['customerInfo.address'] = messageContent;
        updateData['status'] = 'address_collected';
        break;
      case 'payment_method':
        updateData['customerInfo.paymentMethod'] = messageContent;
        updateData['status'] = 'payment_method_collected';
        break;
      default:
        // Handle general messages
        updateData['customerInfo.lastMessage'] = messageContent;
    }

    await db.collection('pending_orders').updateOne(
      { customerPhone: customerPhone },
      { $set: updateData }
    );

    return { success: true, updatedFields: Object.keys(updateData) };
  }

  // Function to create Shopify order after collecting all info
  async createShopifyOrder(db, customerPhone) {
    const integrations = await db.collection('integrations').findOne({ userId: 'default' });
    const { whatsapp, shopify } = integrations;

    if (!shopify?.shopDomain || !shopify?.accessToken) {
      throw new Error("Shopify not configured");
    }

    // Get pending order
    const pendingOrder = await db.collection('pending_orders').findOne({ 
      customerPhone: customerPhone,
      status: 'payment_method_collected'
    });

    if (!pendingOrder) {
      throw new Error("No pending order found for this customer or information not complete");
    }

    // Calculate cart total
    const cartTotal = pendingOrder.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Create draft order in Shopify
    const draftOrderData = {
      draft_order: {
        line_items: pendingOrder.cartItems.map(item => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          grams: item.grams || 0,
          variant_id: item.variant_id || null
        })),
        customer: {
          first_name: pendingOrder.customerInfo.firstName || pendingOrder.customerInfo.name?.split(' ')[0] || '',
          last_name: pendingOrder.customerInfo.lastName || pendingOrder.customerInfo.name?.split(' ').slice(1).join(' ') || '',
          email: pendingOrder.customerInfo.email || '',
          phone: customerPhone
        },
        shipping_address: {
          first_name: pendingOrder.customerInfo.firstName || pendingOrder.customerInfo.name?.split(' ')[0] || '',
          last_name: pendingOrder.customerInfo.lastName || pendingOrder.customerInfo.name?.split(' ').slice(1).join(' ') || '',
          address1: pendingOrder.customerInfo.address || '',
          city: pendingOrder.customerInfo.city || '',
          province: pendingOrder.customerInfo.state || '',
          country: pendingOrder.customerInfo.country || 'India',
          zip: pendingOrder.customerInfo.zip || pendingOrder.customerInfo.pincode || ''
        },
        note: `WhatsApp checkout initiated by ${customerPhone}\nPayment Method: ${pendingOrder.customerInfo.paymentMethod || 'To be confirmed'}`,
        tags: 'whatsapp-checkout, automated',
        total_price: cartTotal.toFixed(2)
      }
    };

    // Create the draft order
    const draftOrder = await this.createShopifyDraftOrder(shopify.shopDomain, shopify.accessToken, draftOrderData);

    // Send confirmation to customer with proper order ID
    const confirmationMessage = `✅ *Order Confirmation*

Your order has been successfully created!

Order ID: #${draftOrder.id}
Total: $${cartTotal.toFixed(2)}

We'll send you a payment link shortly. If you have any questions, feel free to ask!`;

    const messageData = {
      messaging_product: "whatsapp",
      to: customerPhone.replace(/\D/g, ''),
      type: "text",
      text: {
        body: confirmationMessage
      }
    };

    await this.sendWhatsAppMessage(
      whatsapp.phoneNumberId,
      whatsapp.accessToken,
      customerPhone,
      messageData
    );

    // Update order status
    await db.collection('pending_orders').updateOne(
      { customerPhone: customerPhone },
      { $set: { 
          status: 'shopify_order_created', 
          shopifyOrderId: draftOrder.id,
          completedAt: new Date() 
        } 
      }
    );

    // Also save to main orders collection
    await db.collection('orders').insertOne({
      id: `shopify-${draftOrder.id}`,
      userId: 'default',
      shopifyOrderId: draftOrder.id.toString(),
      orderNumber: draftOrder.order_number,
      customerName: `${pendingOrder.customerInfo.firstName || pendingOrder.customerInfo.name?.split(' ')[0] || ''} ${pendingOrder.customerInfo.lastName || pendingOrder.customerInfo.name?.split(' ').slice(1).join(' ') || ''}`.trim(),
      customerEmail: pendingOrder.customerInfo.email || '',
      customerPhone: customerPhone,
      total: draftOrder.total_price,
      currency: 'INR',
      status: 'draft',
      lineItems: pendingOrder.cartItems,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      success: true,
      shopifyOrderId: draftOrder.id,
      message: 'Shopify order created successfully'
    };
  }

  // Helper functions
  async sendWhatsAppMessage(phoneNumberId, accessToken, to, messageData) {
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      throw new Error(data.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`);
    }
    
    return data;
  }

  async createShopifyDraftOrder(shopDomain, accessToken, draftOrderData) {
    const url = `https://${shopDomain}/admin/api/2023-10/draft_orders.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftOrderData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Shopify draft order creation failed:', data);
      throw new Error(JSON.stringify(data.errors || data));
    }
    
    return data.draft_order;
  }

  // Main checkout function that implements your desired flow
  async processCheckout(orderDetails) {
    try {
      const db = await this.connectToMongo();
      
      // Step 1: Notify admin/business account
      const adminNotification = await this.notifyAdmin(db, orderDetails, orderDetails.customerPhone);
      console.log('Admin notified:', adminNotification);
      
      // Step 2: Initiate conversation with customer
      const customerContact = await this.initiateCustomerConversation(db, orderDetails.customerPhone);
      console.log('Customer contacted:', customerContact);
      
      return {
        success: true,
        message: 'Checkout process initiated. Admin notified and customer contacted.',
        orderRecordId: adminNotification.orderRecordId
      };
    } catch (error) {
      console.error('Error in enhanced checkout process:', error);
      throw error;
    }
  }
}

// Export the class properly
module.exports = { EnhancedWhatsAppCheckout };

// Example usage:
/*
const { EnhancedWhatsAppCheckout } = require('./enhanced-whatsapp-checkout');

const checkout = new EnhancedWhatsAppCheckout();

const orderDetails = {
  customerPhone: '+917210562014',
  cartItems: [
    {
      title: 'Banarasi Silk With Dulha Dulhan Motif',
      price: 9999,
      quantity: 11,
      variant_id: 45528180686998,
      grams: 0
    }
  ],
  customerInfo: {}
};

checkout.processCheckout(orderDetails)
  .then(result => console.log('Checkout result:', result))
  .catch(error => console.error('Checkout error:', error));
*/