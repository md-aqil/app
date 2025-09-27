// Payment Gateway Service
const config = require('../config');

class PaymentGateway {
  constructor() {
    this.stripe = config.payment.stripe;
    this.razorpay = config.payment.razorpay;
  }

  // Create a Stripe checkout session
  async createStripeCheckoutSession(lineItems, metadata = {}) {
    // This would integrate with Stripe API
    // For now, we'll return a mock session
    const sessionId = this.generateId();
    const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;
    
    return {
      id: sessionId,
      url: checkoutUrl,
      metadata
    };
  }

  // Create a Razorpay payment link
  async createRazorpayPaymentLink(amount, currency, customerInfo, metadata = {}) {
    // This would integrate with Razorpay API
    // For now, we'll return a mock payment link
    const paymentLinkId = this.generateId();
    const paymentLinkUrl = `https://rzp.io/i/${paymentLinkId}`;
    
    return {
      id: paymentLinkId,
      url: paymentLinkUrl,
      amount,
      currency,
      customer: customerInfo,
      metadata
    };
  }

  // Create a Shopify payment link (checkout URL)
  async createShopifyCheckoutUrl(shopifyClient, draftOrderId) {
    try {
      // Send invoice for draft order which creates a checkout URL
      const invoiceData = {
        // Empty invoice data will send a default invoice
      };
      
      const draftOrder = await shopifyClient.sendDraftOrderInvoice(draftOrderId, invoiceData);
      
      // The invoice_url is the checkout URL
      return {
        id: draftOrder.id,
        url: draftOrder.invoice_url,
        status: draftOrder.status
      };
    } catch (error) {
      console.error('Failed to create Shopify checkout URL:', error);
      throw error;
    }
  }

  // Generate a unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Validate payment method
  isValidPaymentMethod(method) {
    const validMethods = ['stripe', 'razorpay', 'shopify'];
    return validMethods.includes(method.toLowerCase());
  }
}

module.exports = PaymentGateway;