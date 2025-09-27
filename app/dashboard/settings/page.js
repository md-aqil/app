'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Eye, 
  EyeOff,
  Save,
  BookOpen,
  Play,
  ExternalLink,
  MessageCircle,
  Store,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState({
    whatsapp: {
      connected: false,
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      webhookVerifyToken: 'whatsapp_verify_token_123'
    },
    shopify: {
      connected: false,
      shopDomain: '',
      accessToken: '',
      webhookVerifyToken: 'shopify_webhook_verify_token'
    },
    stripe: {
      connected: false,
      secretKey: '',
      publishableKey: ''
    }
  })
  
  const [showAccessToken, setShowAccessToken] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('integrations') // 'integrations' or 'documentation'
  const [testPhoneNumber, setTestPhoneNumber] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({
    whatsapp: 'unknown',
    shopify: 'unknown',
    stripe: 'unknown'
  })

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/integrations')
        if (response.ok) {
          const data = await response.json()
          
          // Update state with fetched data
          setIntegrations(prev => ({
            whatsapp: {
              ...prev.whatsapp,
              connected: data.whatsapp.connected,
              phoneNumberId: data.whatsapp.data.phoneNumberId || '',
              businessAccountId: data.whatsapp.data.businessAccountId || '',
              webhookVerifyToken: data.whatsapp.data.webhookVerifyToken || 'whatsapp_verify_token_123'
            },
            shopify: {
              ...prev.shopify,
              connected: data.shopify.connected,
              shopDomain: data.shopify.data.shopDomain || '',
              webhookVerifyToken: data.shopify.data.webhookVerifyToken || 'shopify_webhook_verify_token'
            },
            stripe: {
              ...prev.stripe,
              connected: data.stripe.connected,
              publishableKey: data.stripe.data.publishableKey || ''
            }
          }))
          
          // Set connection status based on fetched data
          setConnectionStatus({
            whatsapp: data.whatsapp.connected ? 'connected' : 'disconnected',
            shopify: data.shopify.connected ? 'connected' : 'disconnected',
            stripe: data.stripe.connected ? 'connected' : 'disconnected'
          })
        } else {
          toast.error('Failed to load integration settings')
        }
      } catch (error) {
        console.error('Failed to load integrations:', error)
        toast.error('Failed to load integration settings')
      } finally {
        setLoading(false)
      }
    }

    loadIntegrations()
  }, [])

  const testConnection = async (type) => {
    try {
      setConnectionStatus(prev => ({ ...prev, [type]: 'testing' }))
      
      // Get the integration data
      const integrationData = integrations[type]
      
      // Validate required fields before testing
      if (type === 'whatsapp') {
        if (!integrationData.phoneNumberId || !integrationData.accessToken) {
          toast.error('Please fill in all required WhatsApp fields')
          setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
          return
        }
      } else if (type === 'shopify') {
        if (!integrationData.shopDomain || !integrationData.accessToken) {
          toast.error('Please fill in all required Shopify fields')
          setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
          return
        }
      } else if (type === 'stripe') {
        if (!integrationData.secretKey) {
          toast.error('Please fill in the Stripe secret key')
          setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
          return
        }
      }
      
      // Test the integration
      const response = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: integrationData })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message || `${type.charAt(0).toUpperCase() + type.slice(1)} connection test successful!`)
        setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }))
      } else {
        const error = await response.json()
        toast.error(`Failed to test ${type} connection: ${error.error || 'Unknown error'}`)
        setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
      }
    } catch (error) {
      console.error(`Failed to test ${type} connection:`, error)
      toast.error(`Failed to test ${type} connection: ${error.message}`)
      setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
    }
  }

  const handleSaveIntegration = async (type) => {
    try {
      setLoading(true)
      const integrationData = integrations[type]
      
      // Validate required fields
      if (type === 'whatsapp') {
        if (!integrationData.phoneNumberId) {
          toast.error('Please fill in the WhatsApp Phone Number ID')
          return
        }
      } else if (type === 'shopify') {
        if (!integrationData.shopDomain) {
          toast.error('Please fill in the Shopify Shop Domain')
          return
        }
      }
      
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: integrationData })
      })
      
      if (response.ok) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} integration saved successfully!`)
        // Update the connected status
        setIntegrations(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            connected: true
          }
        }))
        setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }))
      } else {
        const error = await response.json()
        toast.error(`Failed to save integration: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to save integration:', error)
      toast.error(`Failed to save integration: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const updateIntegrationField = (type, field, value) => {
    setIntegrations(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
    
    // Reset connection status when fields are changed
    if (connectionStatus[type] === 'connected') {
      setConnectionStatus(prev => ({ ...prev, [type]: 'disconnected' }))
    }
  }

  // Test WhatsApp checkout functionality
  const testWhatsAppCheckout = async () => {
    if (!testPhoneNumber) {
      toast.error('Please enter your WhatsApp number')
      return
    }

    if (!integrations.whatsapp.connected) {
      toast.error('Please connect your WhatsApp integration first')
      return
    }
    
    if (!integrations.shopify.shopDomain) {
      toast.error('Please configure your Shopify store domain first')
      return
    }

    try {
      setIsTesting(true)
      
      // Simulate a test checkout with sample data
      const testCartItems = [
        {
          title: 'Test Product',
          price: '29.99',
          quantity: 1,
          variant_id: '123456789',
          grams: 200
        },
        {
          title: 'Another Test Product',
          price: '19.99',
          quantity: 2,
          variant_id: '987654321',
          grams: 150
        }
      ]

      const testCustomerInfo = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        address1: '123 Test Street',
        city: 'Test City',
        province: 'Test State',
        country: 'Test Country',
        zip: '12345'
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://lcsw.dpdns.org'}/api/whatsapp-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerPhone: testPhoneNumber,
          cartItems: testCartItems,
          customerInfo: testCustomerInfo
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Redirect to WhatsApp with pre-filled message
          const message = encodeURIComponent(`Hello, I'd like to checkout my order.\n\nOrder ID: ${result.draftOrderId}\nPlease send me the payment link.`)
          window.open(`https://wa.me/${integrations.whatsapp.phoneNumberId}?text=${message}`, '_blank')
          toast.success('Test checkout initiated! Check your WhatsApp.')
        } else {
          toast.error(result.error || 'Failed to initiate test checkout')
        }
      } else {
        const error = await response.json()
        // Provide a more user-friendly error message for the opt-in requirement
        if (error.error && error.error.includes('131030')) {
          toast.error('Customer must opt-in first! Please send any message from your test phone to your WhatsApp Business number, then try again. This is a WhatsApp requirement to prevent spam.', {
            duration: 10000 // Show for 10 seconds
          })
        } else {
          toast.error(error.error || 'Failed to initiate test checkout')
        }
      }
    } catch (error) {
      console.error('Test checkout error:', error)
      toast.error(`Failed to initiate test checkout: ${error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  // Shopify documentation content
  const shopifyDocumentation = `<!-- WhatsApp Checkout Button Implementation -->
<script>
// Configuration - Replace with your actual values
const YOUR_WHATSAPP_NUMBER = '${integrations.whatsapp.phoneNumberId || '917210562014'}'; // e.g., 1234567890
const YOUR_SHOPIFY_STORE_URL = '${integrations.shopify.shopDomain || ''}'; // e.g., your-store.myshopify.com
const API_ENDPOINT = '${process.env.NEXT_PUBLIC_BASE_URL || 'https://lcsw.dpdns.org'}/api/whatsapp-checkout'; // Use environment variable

// WhatsApp Checkout Button Implementation
(function() {
  // Create the WhatsApp checkout button
  function initWhatsAppCheckout() {
    // Create the WhatsApp checkout button
    const button = document.createElement('button');
    button.id = 'whatsapp-checkout-button';
    button.textContent = 'Checkout via WhatsApp';
    button.style.cssText = \`
      background-color: #25D366;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: bold;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 10px 0;
    \`;
    
    // Add WhatsApp icon (using Unicode)
    const icon = document.createElement('span');
    icon.textContent = '💬';
    button.prepend(icon);
    
    // Add event listener
    button.addEventListener('click', handleWhatsAppCheckout);
    
    // Find a suitable place to insert the button (e.g., near the regular checkout button)
    const checkoutButtons = document.querySelectorAll('form[action^="/cart"] button[type="submit"], #checkout, .checkout-button');
    if (checkoutButtons.length > 0) {
      // Insert before the last checkout button
      const lastButton = checkoutButtons[checkoutButtons.length - 1];
      lastButton.parentNode.insertBefore(button, lastButton.nextSibling);
    } else {
      // Fallback: add to the cart form
      const cartForm = document.querySelector('form[action="/cart"]');
      if (cartForm) {
        cartForm.appendChild(button);
      }
    }
  }

  // Function to handle WhatsApp checkout
  async function handleWhatsAppCheckout() {
    try {
      // Get cart items
      const cartItems = await getCartItems();
      
      // Get customer info if available
      const customerInfo = getCustomerInfo();
      
      // Use the connected WhatsApp business number directly
      // We get this value from the configuration at the top of the script
      const customerPhone = YOUR_WHATSAPP_NUMBER;
      
      // Validate that Shopify store URL is configured
      if (!YOUR_SHOPIFY_STORE_URL) {
        alert('Please configure your Shopify store URL in the integration settings.');
        return;
      }
      
      // Send data to our API
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerPhone: customerPhone,
          cartItems: cartItems,
          customerInfo: customerInfo
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Redirect to WhatsApp with pre-filled message
        const message = encodeURIComponent(\`Hello, I'd like to checkout my order.\\n\\nOrder ID: \${result.draftOrderId}\\nPlease send me the payment link.\`);
        window.open(\`https://wa.me/\${YOUR_WHATSAPP_NUMBER}?text=\${message}\`, '_blank');
      } else {
        alert('Failed to process checkout: ' + result.error);
      }
    } catch (error) {
      console.error('WhatsApp checkout error:', error);
      alert('An error occurred during checkout. Please try again.');
    }
  }

  // Function to get cart items
  async function getCartItems() {
    // This would fetch the current cart items from Shopify
    // Implementation depends on your Shopify theme and available APIs
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();
      
      return cart.items.map(item => ({
        title: item.product_title,
        price: item.price / 100, // Convert cents to dollars
        quantity: item.quantity,
        variant_id: item.variant_id,
        grams: item.grams
      }));
    } catch (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }
  }

  // Function to get customer info
  function getCustomerInfo() {
    // Try to extract customer info from the page
    const customerInfo = {};
    
    // Try to get name from input fields
    const firstNameInput = document.querySelector('input[name="checkout[first_name]"], input[name="customer[first_name]"], #first_name');
    if (firstNameInput) customerInfo.firstName = firstNameInput.value;
    
    const lastNameInput = document.querySelector('input[name="checkout[last_name]"], input[name="customer[last_name]"], #last_name');
    if (lastNameInput) customerInfo.lastName = lastNameInput.value;
    
    // Try to get email
    const emailInput = document.querySelector('input[type="email"], input[name="checkout[email]"], input[name="customer[email]"], #email');
    if (emailInput) customerInfo.email = emailInput.value;
    
    // Try to get address
    const addressInput = document.querySelector('input[name="checkout[shipping_address][address1]"], #address1');
    if (addressInput) customerInfo.address1 = addressInput.value;
    
    const cityInput = document.querySelector('input[name="checkout[shipping_address][city]"], #city');
    if (cityInput) customerInfo.city = cityInput.value;
    
    const provinceInput = document.querySelector('input[name="checkout[shipping_address][province]"], #province');
    if (provinceInput) customerInfo.province = provinceInput.value;
    
    const countryInput = document.querySelector('input[name="checkout[shipping_address][country]"], #country');
    if (countryInput) customerInfo.country = countryInput.value;
    
    const zipInput = document.querySelector('input[name="checkout[shipping_address][zip]"], #zip');
    if (zipInput) customerInfo.zip = zipInput.value;
    
    return customerInfo;
  }

  // Function to get customer phone
  function getCustomerPhone() {
    // Try to extract phone number from input fields
    const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone"], #phone');
    for (const input of phoneInputs) {
      if (input.value) {
        return input.value;
      }
    }
    return null;
  }

  // Initialize when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhatsAppCheckout);
  } else {
    initWhatsAppCheckout();
  }
})();
</script>`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your integrations and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'integrations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('documentation')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'documentation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Shopify Documentation
          </button>
        </nav>
      </div>

      {activeTab === 'integrations' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* WhatsApp Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus.whatsapp === 'connected' ? 'bg-green-500' : 
                  connectionStatus.whatsapp === 'testing' ? 'bg-yellow-500' : 
                  connectionStatus.whatsapp === 'disconnected' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                WhatsApp Business
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp Business account to send and receive messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID <span className="text-red-500">*</span></Label>
                <Input
                  id="phoneNumberId"
                  value={integrations.whatsapp.phoneNumberId}
                  onChange={(e) => updateIntegrationField('whatsapp', 'phoneNumberId', e.target.value)}
                  placeholder="Your WhatsApp Phone Number ID (e.g., 818391834688215)"
                />
                <p className="text-sm text-gray-500">
                  This is your WhatsApp Business phone number ID from the Facebook Business Manager. 
                  You can find this in your WhatsApp Business API settings.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="accessToken"
                    type={showAccessToken ? "text" : "password"}
                    value={integrations.whatsapp.accessToken}
                    onChange={(e) => updateIntegrationField('whatsapp', 'accessToken', e.target.value)}
                    placeholder="Your WhatsApp Access Token"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Your permanent access token for the WhatsApp Business API. 
                  Generate this in your Facebook Developer account under WhatsApp Business settings.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input
                  id="businessAccountId"
                  value={integrations.whatsapp.businessAccountId}
                  onChange={(e) => updateIntegrationField('whatsapp', 'businessAccountId', e.target.value)}
                  placeholder="Your WhatsApp Business Account ID (e.g., 832073532824981)"
                />
                <p className="text-sm text-gray-500">
                  Your WhatsApp Business Account ID from Facebook Business Manager. 
                  This is required for sending catalog messages.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                <Input
                  id="webhookVerifyToken"
                  value={integrations.whatsapp.webhookVerifyToken}
                  onChange={(e) => updateIntegrationField('whatsapp', 'webhookVerifyToken', e.target.value)}
                  placeholder="Your WhatsApp Webhook Verify Token"
                />
                <p className="text-sm text-gray-500">
                  This token is used to verify webhook requests from WhatsApp. 
                  Set this to a random string and use the same value in your WhatsApp Business API webhook configuration.
                  Default: whatsapp_verify_token_123
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSaveIntegration('whatsapp')}
                  disabled={loading}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {integrations.whatsapp.connected ? 'Update Connection' : 'Connect WhatsApp'}
                </Button>
                <Button
                  onClick={() => testConnection('whatsapp')}
                  disabled={connectionStatus.whatsapp === 'testing' || !integrations.whatsapp.phoneNumberId}
                  variant="outline"
                  className="flex-1"
                >
                  {connectionStatus.whatsapp === 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shopify Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus.shopify === 'connected' ? 'bg-green-500' : 
                  connectionStatus.shopify === 'testing' ? 'bg-yellow-500' : 
                  connectionStatus.shopify === 'disconnected' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                Shopify
              </CardTitle>
              <CardDescription>
                Connect your Shopify store to sync products and orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopDomain">Shop Domain <span className="text-red-500">*</span></Label>
                <Input
                  id="shopDomain"
                  value={integrations.shopify.shopDomain}
                  onChange={(e) => updateIntegrationField('shopify', 'shopDomain', e.target.value)}
                  placeholder="your-shop.myshopify.com"
                />
                <p className="text-sm text-gray-500">
                  Your Shopify store domain. This is required for the WhatsApp checkout button to work properly. 
                  This is the URL you use to access your Shopify admin panel.
                  Example: mystore.myshopify.com
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopifyAccessToken">Access Token <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="shopifyAccessToken"
                    type="password"
                    value={integrations.shopify.accessToken}
                    onChange={(e) => updateIntegrationField('shopify', 'accessToken', e.target.value)}
                    placeholder="Your Shopify Access Token (Private App Password)"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Your Shopify Admin API access token (Private App Password). 
                  <strong> Note: This is NOT the API Key/Secret Key.</strong>
                  Create this in your Shopify Admin under Apps &gt; Manage private apps &gt; Create private app.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopifyWebhookVerifyToken">Webhook Verify Token</Label>
                <Input
                  id="shopifyWebhookVerifyToken"
                  value={integrations.shopify.webhookVerifyToken || ''}
                  onChange={(e) => updateIntegrationField('shopify', 'webhookVerifyToken', e.target.value)}
                  placeholder="Your Shopify Webhook Verify Token"
                />
                <p className="text-sm text-gray-500">
                  This token is used to verify webhook requests from Shopify. 
                  Set this to a random string and use the same value in your Shopify webhook configuration.
                  Default: shopify_webhook_verify_token
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSaveIntegration('shopify')}
                  disabled={loading || !integrations.shopify.shopDomain}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {integrations.shopify.connected ? 'Update Connection' : 'Connect Shopify'}
                </Button>
                <Button
                  onClick={() => testConnection('shopify')}
                  disabled={connectionStatus.shopify === 'testing' || !integrations.shopify.shopDomain}
                  variant="outline"
                  className="flex-1"
                >
                  {connectionStatus.shopify === 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
              
              {!integrations.shopify.shopDomain && (
                <div className="rounded-md bg-yellow-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Shop Domain Required</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Please enter your Shopify store domain to enable the WhatsApp checkout feature. 
                          The checkout button will not work without this configuration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus.stripe === 'connected' ? 'bg-green-500' : 
                  connectionStatus.stripe === 'testing' ? 'bg-yellow-500' : 
                  connectionStatus.stripe === 'disconnected' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
                Stripe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishableKey">Publishable Key</Label>
                <Input
                  id="publishableKey"
                  value={integrations.stripe.publishableKey}
                  onChange={(e) => updateIntegrationField('stripe', 'publishableKey', e.target.value)}
                  placeholder="pk_test_..."
                />
                <p className="text-sm text-gray-500">
                  Your Stripe publishable key for client-side operations. 
                  Find this in your Stripe Dashboard under Developers &gt; API keys.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="secretKey"
                    type={showSecretKey ? "text" : "password"}
                    value={integrations.stripe.secretKey}
                    onChange={(e) => updateIntegrationField('stripe', 'secretKey', e.target.value)}
                    placeholder="sk_test_..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Your Stripe secret key for server-side operations. 
                  Keep this secure and never expose it in client-side code.
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={() => handleSaveIntegration('stripe')}
                  disabled={loading}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {integrations.stripe.connected ? 'Update Connection' : 'Connect Stripe'}
                </Button>
                <Button
                  onClick={() => testConnection('stripe')}
                  disabled={connectionStatus.stripe === 'testing' || !integrations.stripe.secretKey}
                  variant="outline"
                  className="flex-1"
                >
                  {connectionStatus.stripe === 'testing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test WhatsApp Checkout */}
          <Card>
            <CardHeader>
              <CardTitle>Test WhatsApp Checkout</CardTitle>
              <CardDescription>
                Test your WhatsApp checkout integration with sample data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Your WhatsApp Number</Label>
                <Input
                  id="test-phone"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
                <p className="text-sm text-gray-500">
                  Enter your WhatsApp number with country code to test the checkout flow. 
                  You'll receive a message with a payment link.
                </p>
              </div>
              
              <Button 
                onClick={testWhatsAppCheckout}
                disabled={isTesting || !testPhoneNumber || !integrations.whatsapp.connected}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test WhatsApp Checkout
                  </>
                )}
              </Button>
              
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Before Testing</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Ensure WhatsApp Business integration is connected above</li>
                        <li>Make sure your webhook URLs are properly configured</li>
                        <li>Verify your Cloudflare tunnel is running (if using local development)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration - Enhanced and More Informative */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-blue-500" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure these URLs in your service providers to enable real-time updates and seamless integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">How Webhooks Work</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Webhooks allow external services to notify our system when events occur. 
                        Configure the URLs below in your service provider settings to receive real-time updates.
                        This enables automatic order processing, customer notifications, and inventory synchronization.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* WhatsApp Business Webhooks */}
                <Card className="border-2 border-green-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-green-700">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      WhatsApp Business Webhooks
                    </CardTitle>
                    <CardDescription>
                      For receiving incoming messages and status updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Webhook URL</Label>
                      <div className="flex">
                        <Input
                          readOnly
                          value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/api/webhook/whatsapp`}
                          className="flex-1 rounded-r-none bg-gray-50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-l-none border-l-0"
                          onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/api/webhook/whatsapp`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Configure this URL in your WhatsApp Business API settings to receive incoming messages and status updates.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Configuration Steps:
                      </h4>
                      <ol className="list-decimal list-inside text-sm text-green-700 space-y-1">
                        <li>Go to Facebook Business Manager</li>
                        <li>Navigate to WhatsApp Business settings</li>
                        <li>Find the Webhook Configuration section</li>
                        <li>Enter the URL above as your callback URL</li>
                        <li>Use your Webhook Verify Token: <code className="bg-green-100 px-1 rounded font-mono">{integrations.whatsapp.webhookVerifyToken || 'whatsapp_verify_token_123'}</code></li>
                      </ol>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Important Notes:</h4>
                      <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                        <li>Ensure your domain is publicly accessible</li>
                        <li>Test the webhook after configuration</li>
                        <li>Verify token must match exactly</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Shopify Webhooks - Enhanced and More Informative */}
                <Card className="border-2 border-blue-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-blue-700">
                      <Store className="h-5 w-5 mr-2" />
                      Shopify Webhooks
                    </CardTitle>
                    <CardDescription>
                      For receiving real-time order updates and customer information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="ml-2">
                          <h4 className="text-sm font-medium text-blue-800">Automatic Setup</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Webhooks are automatically configured when you save your Shopify integration settings. 
                            No manual setup required!
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Webhook URL</Label>
                      <div className="flex">
                        <Input
                          readOnly
                          value={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/api/webhook/shopify`}
                          className="flex-1 rounded-r-none bg-gray-50"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-l-none border-l-0"
                          onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/api/webhook/shopify`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        This URL receives real-time updates from Shopify for orders and customer information.
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Automatically Configured Webhooks:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">Order Events:</p>
                          <ul className="list-disc list-inside space-y-1 mt-1">
                            <li>orders/create</li>
                            <li>orders/updated</li>
                            <li>orders/paid</li>
                          </ul>
                        </div>
                        <div className="text-sm text-blue-700">
                          <p className="font-medium">Fulfillment & Customer Events:</p>
                          <ul className="list-disc list-inside space-y-1 mt-1">
                            <li>orders/fulfilled</li>
                            <li>orders/cancelled</li>
                            <li>customers/create</li>
                            <li>customers/update</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Manual Configuration (Optional):
                      </h4>
                      <p className="text-sm text-green-700 mb-2">
                        If you prefer to manually configure webhooks in Shopify:
                      </p>
                      <ol className="list-decimal list-inside text-sm text-green-700 space-y-1">
                        <li>Go to your Shopify Admin Dashboard</li>
                        <li>Navigate to Settings &gt; Notifications &gt; Webhooks</li>
                        <li>Click "Create webhook"</li>
                        <li>Select events you want to receive</li>
                        <li>Enter the URL above as the callback URL</li>
                        <li>Use your Webhook Verify Token: <code className="bg-green-100 px-1 rounded font-mono">{integrations.shopify.webhookVerifyToken || 'shopify_webhook_verify_token'}</code></li>
                      </ol>
                    </div>
                    
                    <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Webhook Status:</h4>
                      <div className="flex items-center text-sm text-yellow-700">
                        <div className={`w-3 h-3 rounded-full mr-2 ${integrations.shopify.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {integrations.shopify.connected ? (
                          <span>Webhooks will be automatically configured when you save Shopify settings</span>
                        ) : (
                          <span>Connect Shopify to enable automatic webhook configuration</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p className="font-medium">Verify Token:</p>
                        <code className="bg-yellow-100 px-2 py-1 rounded font-mono text-xs break-all">
                          {integrations.shopify.webhookVerifyToken || 'shopify_webhook_verify_token'}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Important Configuration Notes</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Public Accessibility:</strong> Webhooks require your domain to be publicly accessible. For local development, use Cloudflare Tunnel or ngrok.</li>
                        <li><strong>Automatic Shopify Setup:</strong> Shopify webhooks are automatically configured when you save your Shopify integration settings.</li>
                        <li><strong>Verify Tokens:</strong> The verify tokens must match exactly between your service provider and our system. You can find them in the integration sections above.</li>
                        <li><strong>Testing:</strong> After configuration, test your webhooks to ensure they're working properly. Check the webhook logs in your service provider's dashboard.</li>
                        <li><strong>Troubleshooting:</strong> If webhooks are not working, verify the URLs are accessible from the internet and the verify tokens match.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      ) : (
        // Documentation Tab
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Shopify Integration Documentation
              </CardTitle>
              <CardDescription>
                Complete guide to integrate WhatsApp checkout with your Shopify store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Implementation Steps</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>Connect your Shopify store in the Integrations tab above</li>
                    <li>Copy the JavaScript code below</li>
                    <li>Add it to your Shopify theme's <code className="bg-gray-100 px-1 rounded">theme.liquid</code> file</li>
                    <li>Test the integration by adding products to your cart and using the WhatsApp checkout button</li>
                  </ol>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900">WhatsApp Checkout Button Code</h3>
                    <Button
                      onClick={() => copyToClipboard(shopifyDocumentation)}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Code
                    </Button>
                  </div>
                  <div className="relative">
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
                      <code>{shopifyDocumentation}</code>
                    </pre>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Important Notes</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Replace <code>YOUR_WHATSAPP_NUMBER</code> with your actual WhatsApp Business number</li>
                          <li><code>YOUR_SHOPIFY_STORE_URL</code> will be automatically populated from your Shopify integration settings</li>
                          <li>Ensure your API endpoint is accessible from the internet (using Cloudflare Tunnel for local development)</li>
                          <li>Test the integration thoroughly before going live</li>
                          <li className="font-medium">The WhatsApp Checkout button code is working correctly and has been updated with the enhanced multi-step flow</li>
                          <li className="font-medium text-orange-700">Important: Customers must send a message to your WhatsApp Business number first to opt-in before you can message them (WhatsApp API requirement)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">How It Works</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-bold">1</span>
                        </div>
                        <h4 className="font-medium text-gray-900 ml-2">Customer Clicks Button</h4>
                      </div>
                      <p className="text-sm text-gray-500">
                        Customer adds items to cart and clicks "Checkout via WhatsApp" button
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-bold">2</span>
                        </div>
                        <h4 className="font-medium text-gray-900 ml-2">Data Collection</h4>
                      </div>
                      <p className="text-sm text-gray-500">
                        System collects cart items and customer information from the page
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-bold">3</span>
                        </div>
                        <h4 className="font-medium text-gray-900 ml-2">WhatsApp Conversation</h4>
                      </div>
                      <p className="text-sm text-gray-500">
                        Customer is redirected to WhatsApp with pre-filled order details
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-bold">4</span>
                        </div>
                        <h4 className="font-medium text-gray-900 ml-2">Order Processing</h4>
                      </div>
                      <p className="text-sm text-gray-500">
                        System creates order in Shopify and sends payment link via WhatsApp
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Testing the Integration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-900">1. Add to Cart</h4>
                      <p className="text-sm text-gray-500 mt-1">Add products to your Shopify cart</p>
                    </div>
                    <div className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-900">2. Checkout via WhatsApp</h4>
                      <p className="text-sm text-gray-500 mt-1">Click the new WhatsApp checkout button</p>
                    </div>
                    <div className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-gray-900">3. Complete Payment</h4>
                      <p className="text-sm text-gray-500 mt-1">Follow the WhatsApp conversation to complete payment</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-orange-800">WhatsApp Opt-in Requirement</h3>
                      <div className="mt-2 text-sm text-orange-700">
                        <p>
                          <strong>Important:</strong> Due to WhatsApp Business API policies, customers must first send a message 
                          to your WhatsApp Business number to opt-in before you can send them messages. This is a WhatsApp requirement 
                          to prevent spam and ensure users want to receive messages from businesses.
                        </p>
                        <p className="mt-2">
                          For testing, make sure to send a message from the test phone number to your WhatsApp Business number first, 
                          then try the checkout process.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-md">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Success!</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          Once configured correctly, customers can checkout via WhatsApp directly from your Shopify store. 
                          The system will automatically handle order creation, payment processing, and customer notifications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}