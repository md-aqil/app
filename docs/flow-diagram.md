# WhatsApp Commerce Hub - Flow Diagrams

## 1. WhatsApp Checkout Flow

```mermaid
graph TD
    A[Customer sends message] --> B{Detect intent}
    B -->|Checkout keywords| C[Ask for customer name]
    B -->|Other message| D[General response]
    C --> E[Collect address line 1]
    E --> F[Collect address line 2]
    F --> G[Collect city]
    G --> H[Collect state]
    H --> I[Collect pincode]
    I --> J[Collect email]
    J --> K[Confirm cart items]
    K --> L{Customer confirmation}
    L -->|Yes| M[Ask payment method]
    L -->|No| N[Redirect to website]
    M --> O{Payment choice}
    O -->|Online| P[Create Shopify draft order]
    O -->|Cash on Delivery| Q[Create Shopify order]
    P --> R[Send payment link]
    Q --> S[Send order confirmation]
    R --> T[Wait for payment]
    S --> U[Order confirmed]
    T --> U
    U --> V[Reset session to idle]
```

## 2. Shopify Webhook Flow

```mermaid
graph TD
    A[Shopify sends webhook] --> B{Webhook type}
    B -->|orders/create| C[Save order to DB]
    C --> D{Customer phone available?}
    D -->|Yes| E[Send order confirmation]
    D -->|No| F[Skip WhatsApp notification]
    E --> G[End]
    F --> G
    B -->|orders/updated| H[Update order in DB]
    H --> I{Financial status pending?}
    I -->|Yes| J[Create draft order]
    J --> K[Send payment reminder]
    I -->|No| L[End]
    K --> L
    B -->|orders/paid| M[Update order status]
    M --> N[End]
    B -->|orders/fulfilled| O[Update order status]
    O --> P[Send shipment update]
    P --> Q[End]
    B -->|orders/cancelled| R[Update order status]
    R --> S[Send order cancelled]
    S --> Q
    B -->|customers/create| T[Save customer to DB]
    T --> U[End]
    B -->|customers/update| V[Update customer in DB]
    V --> U
```

## 3. System Architecture

```mermaid
graph TB
    A[WhatsApp Business API] --> B[WhatsApp Webhook Handler]
    C[Shopify Admin API] --> D[Shopify Webhook Handler]
    B --> E[Session Manager]
    D --> F[Order Processor]
    E --> G[(MongoDB)]
    F --> G
    E --> H[WhatsApp Template Sender]
    F --> H
    H --> A
    E --> I[Shopify Client]
    F --> I
    I --> C
    E --> J[Payment Gateway]
    F --> J
```

## 4. Conversation State Management

```mermaid
graph TD
    A[Idle] --> B{New message}
    B -->|Checkout intent| C[Asking Intent]
    C --> D[Collecting Customer Info]
    D --> E[Confirming Cart]
    E --> F{Confirmation}
    F -->|Yes| G[Asking Payment Method]
    F -->|No| H[Redirect to website]
    H --> A
    G --> I{Payment Choice}
    I -->|Online| J[Processing Payment]
    I -->|Cash on Delivery| K[Processing Payment]
    J --> L[Order Confirmed]
    K --> L
    L --> A
```

## 5. Error Handling and Retry Logic

```mermaid
graph TD
    A[API Request] --> B{Request successful?}
    B -->|Yes| C[Process response]
    B -->|No| D{Retry count < 3?}
    D -->|Yes| E[Wait with exponential backoff]
    E --> A
    D -->|No| F[Log error and fail]
    F --> G[Notify user of failure]
    C --> H[Success]
```

## Component Descriptions

### WhatsApp Webhook Handler
- Processes incoming WhatsApp messages
- Manages conversation flow states
- Integrates with session management
- Sends templated responses

### Shopify Webhook Handler
- Processes Shopify order events
- Updates database with order information
- Sends WhatsApp notifications based on events
- Handles customer data synchronization

### Session Manager
- Manages user conversation states
- Handles session timeout and cleanup
- Stores customer information during checkout
- Provides session persistence

### Shopify Client
- Wrapper for Shopify Admin API
- Handles authentication and requests
- Provides methods for orders, products, and webhooks
- Includes error handling and retry logic

### Payment Gateway
- Integrates with multiple payment providers
- Creates payment links for online payments
- Handles payment status updates
- Supports both Shopify and external payment processors

### WhatsApp Template Sender
- Sends templated WhatsApp messages
- Implements retry logic for failed sends
- Handles WhatsApp API errors
- Provides methods for different message types

## Data Flow

1. **WhatsApp Checkout Flow**:
   - Customer initiates conversation with checkout intent
   - System collects customer information step-by-step
   - Customer confirms cart items
   - Customer selects payment method
   - System creates order in Shopify
   - System sends payment link or order confirmation
   - Order status updates trigger WhatsApp notifications

2. **Shopify Webhook Flow**:
   - Shopify sends order event webhooks
   - System processes and stores order data
   - System sends WhatsApp notifications based on event type
   - Customer responses trigger further actions

## Error Handling

- All API calls include retry logic with exponential backoff
- WhatsApp "not in allowed list" errors are handled with specific user guidance
- Shopify API errors are logged and retried
- Database operations include proper error handling
- Session timeouts are managed automatically