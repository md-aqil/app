// Unified WhatsApp Template Messaging Utility
const config = require('../config');

class WhatsAppTemplateSender {
  constructor(phoneNumberId, accessToken) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.apiVersion = config.whatsapp.apiVersion;
    this.baseUrl = `${config.whatsapp.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  // Send a WhatsApp template message with retry logic
  async sendTemplate(to, templateName, components = [], retries = 3) {
    const messageData = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ''),
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: components
      }
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`WhatsApp API Error (Attempt ${attempt}):`, data);
          
          // Special handling for "Recipient phone number not in allowed list" error
          if (data?.error?.code === 131030) {
            throw new Error(`(#131030) Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in before you can message them.`);
          }
          
          throw new Error(data.error?.message || `WhatsApp API error: ${response.status} ${response.statusText}`);
        }

        // Additional validation that the message was accepted
        if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
          console.error('Unexpected WhatsApp API response:', data);
          throw new Error('WhatsApp API returned unexpected response format');
        }

        // Log successful message send
        console.log(`Successfully sent WhatsApp template "${templateName}" to ${to}`);
        
        return data;
      } catch (error) {
        console.error(`Failed to send WhatsApp template "${templateName}" to ${to} (Attempt ${attempt}):`, error.message);
        
        if (attempt === retries) {
          throw new Error(`Failed to send WhatsApp template after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // Send order confirmation template
  async sendOrderConfirmation(to, orderData) {
    const components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: orderData.customerName || "Customer"
          },
          {
            type: "text",
            text: orderData.orderNumber || "N/A"
          },
          {
            type: "text",
            text: orderData.brand || "Our Store"
          },
          {
            type: "text",
            text: orderData.items || "N/A"
          },
          {
            type: "text",
            text: orderData.eta || "1-3 business days"
          },
          {
            type: "text",
            text: orderData.status || "Confirmed"
          },
          {
            type: "text",
            text: orderData.trackUrl || "N/A"
          }
        ]
      }
    ];

    return await this.sendTemplate(to, "order_confirmation", components);
  }

  // Send payment reminder template
  async sendPaymentReminder(to, paymentData) {
    const components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: paymentData.customerName || "Customer"
          },
          {
            type: "text",
            text: paymentData.brand || "Our Store"
          },
          {
            type: "text",
            text: paymentData.orderId || "N/A"
          },
          {
            type: "text",
            text: paymentData.items || "N/A"
          },
          {
            type: "text",
            text: paymentData.amount || "N/A"
          },
          {
            type: "text",
            text: paymentData.paymentLink || "N/A"
          }
        ]
      }
    ];

    return await this.sendTemplate(to, "payment_reminder", components);
  }

  // Send shipment update template
  async sendShipmentUpdate(to, shipmentData) {
    const components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: shipmentData.customerName || "Customer"
          },
          {
            type: "text",
            text: shipmentData.orderId || "N/A"
          },
          {
            type: "text",
            text: shipmentData.brand || "Our Store"
          },
          {
            type: "text",
            text: shipmentData.courier || "N/A"
          },
          {
            type: "text",
            text: shipmentData.trackingId || "N/A"
          },
          {
            type: "text",
            text: shipmentData.eta || "1-3 business days"
          },
          {
            type: "text",
            text: shipmentData.trackUrl || "N/A"
          }
        ]
      }
    ];

    return await this.sendTemplate(to, "shipment_update", components);
  }

  // Send delivery feedback template
  async sendDeliveryFeedback(to, feedbackData) {
    const components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: feedbackData.customerName || "Customer"
          },
          {
            type: "text",
            text: feedbackData.orderId || "N/A"
          },
          {
            type: "text",
            text: feedbackData.brand || "Our Store"
          }
        ]
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: 0,
        parameters: [
          {
            type: "payload",
            text: `rating_${feedbackData.orderId}_5`
          }
        ]
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: 1,
        parameters: [
          {
            type: "payload",
            text: `rating_${feedbackData.orderId}_4`
          }
        ]
      }
    ];

    return await this.sendTemplate(to, "delivery_feedback", components);
  }

  // Send order cancelled template
  async sendOrderCancelled(to, cancelData) {
    const components = [
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: cancelData.customerName || "Customer"
          },
          {
            type: "text",
            text: cancelData.orderId || "N/A"
          },
          {
            type: "text",
            text: cancelData.reason || "N/A"
          }
        ]
      }
    ];

    return await this.sendTemplate(to, "order_cancelled", components);
  }

  // Send a simple text message
  async sendTextMessage(to, message) {
    // Validate inputs
    if (!to) {
      throw new Error('Recipient phone number is required');
    }
    
    if (!message) {
      throw new Error('Message content is required');
    }
    
    // Clean the phone number
    const cleanTo = to.replace(/\D/g, '');
    
    if (cleanTo.length < 10) {
      throw new Error('Invalid phone number format');
    }
    
    const messageData = {
      messaging_product: "whatsapp",
      to: cleanTo,
      type: "text",
      text: {
        body: message
      }
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      
      // Special handling for "Recipient phone number not in allowed list" error
      if (data?.error?.code === 131030) {
        throw new Error(`(#131030) Recipient phone number not in allowed list. The customer needs to send a message to your WhatsApp Business number first to opt-in before you can message them.`);
      }
      
      // Special handling for access token expiration
      if (data?.error?.code === 190) {
        throw new Error(`(#190) WhatsApp access token has expired. Please refresh your token in the integration settings.`);
      }
      
      // Create a more detailed error message
      let errorMessage = `WhatsApp API error: ${response.status} ${response.statusText}`;
      if (data?.error?.message) {
        errorMessage = `WhatsApp API Error: ${data.error.message}`;
      } else if (data?.message) {
        errorMessage = `WhatsApp API Error: ${data.message}`;
      }
      
      throw new Error(errorMessage);
    }

    // Additional validation that the message was accepted
    if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
      console.error('Unexpected WhatsApp API response:', data);
      throw new Error('WhatsApp API returned unexpected response format');
    }

    return data;
  }
}

module.exports = WhatsAppTemplateSender;