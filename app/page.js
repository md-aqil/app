'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { 
  MessageCircle, 
  Store, 
  CreditCard, 
  Settings, 
  Send,
  Package,
  CheckCircle,
  AlertCircle,
  Plus,
  ExternalLink
} from 'lucide-react'

export default function App() {
  const [integrations, setIntegrations] = useState({
    whatsapp: { connected: false, data: {} },
    shopify: { connected: false, data: {} },
    stripe: { connected: false, data: {} }
  })
  
  const [products, setProducts] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [loading, setLoading] = useState(false)

  // Load integrations status on mount
  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations')
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data)
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
    }
  }

  const loadProducts = async () => {
    if (!integrations.shopify.connected) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const saveIntegration = async (type, data) => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      })
      
      if (response.ok) {
        await loadIntegrations()
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} integration saved successfully!`)
        if (type === 'shopify') {
          loadProducts()
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save integration')
      }
    } catch (error) {
      console.error('Failed to save integration:', error)
      toast.error('Failed to save integration')
    } finally {
      setLoading(false)
    }
  }

  const sendCatalog = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/send-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: selectedProducts,
          recipient: '+1234567890' // This would come from a form
        })
      })
      
      if (response.ok) {
        toast.success('Catalog sent successfully!')
        setSelectedProducts([])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send catalog')
      }
    } catch (error) {
      console.error('Failed to send catalog:', error)
      toast.error('Failed to send catalog')
    } finally {
      setLoading(false)
    }
  }

  const IntegrationForm = ({ type, integration }) => {
    const [formData, setFormData] = useState(integration.data || {})

    const handleSubmit = (e) => {
      e.preventDefault()
      saveIntegration(type, formData)
    }

    const getFields = () => {
      switch (type) {
        case 'whatsapp':
          return [
            { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '818391834688215' },
            { key: 'accessToken', label: 'Access Token', placeholder: 'Your WhatsApp Access Token', type: 'password' },
            { key: 'businessAccountId', label: 'Business Account ID', placeholder: '832073532824981' },
            { key: 'webhookVerifyToken', label: 'Webhook Verify Token', placeholder: 'your_verify_token' }
          ]
        case 'shopify':
          return [
            { key: 'shopDomain', label: 'Shop Domain', placeholder: 'your-shop.myshopify.com' },
            { key: 'accessToken', label: 'Access Token', placeholder: 'Your Shopify Access Token', type: 'password' },
            { key: 'apiKey', label: 'API Key', placeholder: 'Your Shopify API Key' },
            { key: 'apiSecret', label: 'API Secret', placeholder: 'Your Shopify API Secret', type: 'password' }
          ]
        case 'stripe':
          return [
            { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_test_...' },
            { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_test_...', type: 'password' },
            { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'whsec_...', type: 'password' }
          ]
        default:
          return []
      }
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {getFields().map(field => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={formData[field.key] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              required
            />
          </div>
        ))}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Integration'}
        </Button>
      </form>
    )
  }

  const getStatusBadge = (connected) => (
    connected ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Connected
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Connected
      </Badge>
    )
  )

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-green-600" />
              <h1 className="text-2xl font-bold">WhatsApp Commerce Hub</h1>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(integrations.whatsapp.connected)}
              {getStatusBadge(integrations.shopify.connected)}
              {getStatusBadge(integrations.stripe.connected)}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="integrations">
              <Settings className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="w-4 h-4 mr-2" />
              Send Catalog
            </TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                    WhatsApp Business
                  </CardTitle>
                  <CardDescription>
                    Connect your WhatsApp Business API to send messages and catalogs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {getStatusBadge(integrations.whatsapp.connected)}
                  </div>
                  <IntegrationForm type="whatsapp" integration={integrations.whatsapp} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="w-5 h-5 mr-2 text-blue-600" />
                    Shopify
                  </CardTitle>
                  <CardDescription>
                    Connect your Shopify store to sync products and orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {getStatusBadge(integrations.shopify.connected)}
                  </div>
                  <IntegrationForm type="shopify" integration={integrations.shopify} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                    Stripe
                  </CardTitle>
                  <CardDescription>
                    Accept payments through Stripe checkout links
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {getStatusBadge(integrations.stripe.connected)}
                  </div>
                  <IntegrationForm type="stripe" integration={integrations.stripe} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Shopify Products</h2>
              <Button onClick={loadProducts} disabled={loading || !integrations.shopify.connected}>
                {loading ? 'Loading...' : 'Refresh Products'}
              </Button>
            </div>

            {!integrations.shopify.connected ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Store className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg mb-2">Connect Shopify First</p>
                    <p className="text-muted-foreground">
                      Please configure your Shopify integration to load products
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium truncate">{product.title}</h3>
                        <Badge variant="outline">${product.price}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {product.description || 'No description available'}
                      </p>
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <Button
                        variant={selectedProducts.includes(product.id) ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (selectedProducts.includes(product.id)) {
                            setSelectedProducts(prev => prev.filter(id => id !== product.id))
                          } else {
                            setSelectedProducts(prev => [...prev, product.id])
                          }
                        }}
                      >
                        {selectedProducts.includes(product.id) ? 'Selected' : 'Select'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Send Catalog Tab */}
          <TabsContent value="send" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Product Catalog</CardTitle>
                <CardDescription>
                  Send selected products to customers via WhatsApp with payment links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient Phone Number</Label>
                  <Input
                    id="recipient"
                    placeholder="+1234567890"
                    className="mt-1"
                  />
                </div>
                
                <Separator />
                
                <div>
                  <p className="font-medium mb-2">Selected Products ({selectedProducts.length})</p>
                  {selectedProducts.length === 0 ? (
                    <p className="text-muted-foreground">No products selected</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedProducts.map(productId => {
                        const product = products.find(p => p.id === productId)
                        return product ? (
                          <div key={productId} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{product.title}</span>
                            <Badge variant="outline">${product.price}</Badge>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={sendCatalog} 
                  disabled={loading || selectedProducts.length === 0 || !integrations.whatsapp.connected}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send Catalog via WhatsApp'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}