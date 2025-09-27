# WhatsApp Opt-in Requirement Guide

## Understanding the Error

When you see the error "Recipient phone number not in allowed list" or error code #131030, this is a WhatsApp Business API policy requirement that prevents spam and ensures users want to receive messages from businesses.

## Why This Happens

WhatsApp requires that customers opt-in to receive messages from your business before you can send them messages. This is done by having the customer send any message to your WhatsApp Business number first.

## How to Fix This Issue

### For Testing

1. **Send a message from the test phone**:
   - Take the phone number you're testing with
   - Send any message (like "Hi" or "Test") to your WhatsApp Business number
   - Wait for the message to be delivered (usually instant)

2. **Run the checkout process again**:
   - After sending the initial message, try the WhatsApp checkout again
   - The error should no longer appear

### For Real Customers

1. **Add opt-in instructions to your Shopify store**:
   - Place a notice on your product pages or cart page
   - Example text: "To complete your order via WhatsApp, please send any message to +1234567890 first to opt-in to our messages"

2. **Include opt-in information in your marketing**:
   - Add your WhatsApp Business number to your email signatures
   - Include it in your social media profiles
   - Encourage customers to message you with "Join" or similar keywords

3. **Use WhatsApp's Click to Chat feature**:
   - Create a link like `https://wa.me/1234567890?text=Join` for customers to easily opt-in
   - Place this link prominently on your website

## Best Practices

1. **Always inform customers about the opt-in requirement**:
   - Make it clear that they need to message you first
   - Provide clear instructions on how to do this

2. **Use a clear call-to-action**:
   - Instead of just showing the WhatsApp checkout button
   - Show both the opt-in button and checkout button
   - Only enable the checkout button after opt-in (when possible)

3. **Handle the error gracefully in your UI**:
   - Show a friendly message explaining the requirement
   - Provide a direct link to start the opt-in process

## Example Implementation

Here's how you can modify your Shopify theme to include opt-in instructions:

```html
<!-- Add this near your WhatsApp checkout button -->
<div class="whatsapp-optin-notice">
  <p>
    <strong>WhatsApp Checkout:</strong> 
    Before checking out via WhatsApp, please 
    <a href="https://wa.me/YOUR_WHATSAPP_NUMBER?text=Join" target="_blank">
      send any message to our WhatsApp number
    </a> 
    to opt-in to our messages.
  </p>
</div>

<!-- Your WhatsApp checkout button -->
<button id="whatsapp-checkout-button">Checkout via WhatsApp</button>
```

## Testing Checklist

- [ ] Send a message from test phone to WhatsApp Business number
- [ ] Confirm the message was received
- [ ] Run the checkout test again
- [ ] Verify the error no longer appears
- [ ] Check that the confirmation message is sent correctly

## Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Opt-in Best Practices](https://developers.facebook.com/docs/whatsapp/guides/opt-in)