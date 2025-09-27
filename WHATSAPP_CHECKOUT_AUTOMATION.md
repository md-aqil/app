# WhatsApp Checkout Automation

## Overview

This document describes the enhanced WhatsApp checkout automation flow that guides customers through the entire purchasing process via WhatsApp messages.

## Automation Flow

When a customer clicks the "Checkout via WhatsApp" button on the website:

1. **Initial Notification**: The system saves the cart data and sends an initial message to the customer via WhatsApp to start the checkout process.

2. **Customer Information Collection**:
   - Collect customer's full name
   - Collect delivery address
   - Collect pincode

3. **Order Confirmation**: 
   - Display order summary to customer
   - Request confirmation to proceed

4. **Order Processing**:
   - Create draft order in Shopify
   - Generate payment link
   - Send payment link to customer

5. **Payment Confirmation**:
   - When customer pays, Shopify sends a webhook
   - System sends payment confirmation to customer

## Implementation Details

### API Endpoint

The WhatsApp checkout is triggered via the `/api/whatsapp-checkout` POST endpoint with the following payload:

```json
{
  "customerPhone": "+1234567890",
  "cartItems": [
    {
      "title": "Product Name",
      "price": "29.99",
      "quantity": 2
    }
  ],
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

### Conversation States

The WhatsApp webhook handler manages the conversation through these states:

- `checkout_collecting_name`: Collecting customer's full name
- `checkout_collecting_address`: Collecting delivery address
- `checkout_collecting_pincode`: Collecting pincode
- `checkout_confirming_order`: Confirming order details
- `checkout_processing_order`: Processing the order in Shopify

### Data Storage

Pending checkout data is stored in the `pending_whatsapp_checkouts` collection in MongoDB with the following structure:

```json
{
  "customerPhone": "+1234567890",
  "cartItems": [...],
  "customerInfo": {...},
  "createdAt": "2023-01-01T00:00:00.000Z",
  "status": "pending_whatsapp_confirmation"
}
```

## Testing

To test the WhatsApp checkout automation:

1. Run the test script: `node test-whatsapp-checkout-automation.js`
2. Send a WhatsApp message "checkout" to your WhatsApp Business number
3. Follow the conversation flow to provide your information
4. Confirm the order when prompted
5. Complete the payment using the provided link
6. Verify that payment confirmation is sent when the order is paid

## Troubleshooting

### Common Issues

1. **Customer not receiving messages**: Ensure the customer has opted in by sending a message to your WhatsApp Business number first.

2. **Order not created in Shopify**: Check that Shopify integration is properly configured with valid credentials.

3. **Payment link not working**: Verify that the Shopify draft order was created successfully and the invoice was sent.

### Logs

Check the console logs for detailed information about each step of the process:

- WhatsApp message sending
- Shopify API calls
- Database operations
- Error messages

## Future Enhancements

Possible improvements to the automation flow:

1. Add support for multiple payment methods
2. Implement order status updates (shipped, delivered)
3. Add customer feedback collection after delivery
4. Support for modifying cart items during the WhatsApp conversation