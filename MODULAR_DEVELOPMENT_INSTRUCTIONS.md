# Modular Development Instructions

## Core Principle
This project follows a highly modular architecture where each automation is独立 and separate from others. This ensures that individual components can be developed, tested, and maintained without affecting other parts of the system.

## Current Automations
1. **WhatsApp Checkout Automation**
2. **Shopify Order Automation**

These two automations must remain completely independent of each other.

## Development Guidelines

### Separation Requirements
- Each automation must have its own dedicated files and directories
- No direct dependencies between different automation modules
- Shared utilities should be generic and not specific to any single automation
- Each automation should have its own configuration settings

### Future Development
All future development must follow the same modular approach:
- Create separate modules for new functionality
- Ensure new modules don't directly depend on existing automation modules
- Maintain clear boundaries between different automation systems
- Use generic interfaces for communication between modules when necessary

## Benefits
- More flexible development process
- Easier to scale individual components
- Reduced risk of changes affecting unrelated functionality
- Simplified testing and debugging
- Better maintainability

## Implementation
When adding new features, always consider:
1. Which automation does this feature belong to?
2. Are there existing modules that can be reused?
3. How can this be implemented without affecting other automations?