'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
<<<<<<< HEAD
    // Redirect to the dashboard since all features have been moved there
    router.push('/dashboard')
  }, [router])
=======
    loadIntegrations()
    loadCampaigns()
    loadOrders()
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

  const loadCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
    }
  }

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
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
          // Setup Shopify webhooks
          setupShopifyWebhooks()
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

  const setupShopifyWebhooks = async () => {
    try {
      const response = await fetch('/api/setup-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        toast.success('Shopify webhooks configured for order confirmations!')
      }
    } catch (error) {
      console.error('Failed to setup webhooks:', error)
    }
  }

  const sendCatalog = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product')
      return
    }

    const recipient = document.getElementById('recipient').value
    if (!recipient) {
      toast.error('Please enter recipient phone number')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/send-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: selectedProducts,
          recipient: recipient
        })
      })
      
      if (response.ok) {
        toast.success('Catalog sent successfully!')
        setSelectedProducts([])
        document.getElementById('recipient').value = ''
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

  const createCampaign = async (campaignData) => {
    try {
      setLoading(true)
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      })
      
      if (response.ok) {
        await loadCampaigns()
        toast.success('Campaign created successfully!')
        setShowCampaignDialog(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create campaign')
      }
    } catch (error) {
      console.error('Failed to create campaign:', error)
      toast.error('Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const sendCampaign = async (campaignId) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        await loadCampaigns()
        toast.success('Campaign sent successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send campaign')
      }
    } catch (error) {
      console.error('Failed to send campaign:', error)
      toast.error('Failed to send campaign')
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadCampaigns()
        toast.success('Campaign deleted successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete campaign')
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      toast.error('Failed to delete campaign')
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

  const CampaignDialog = () => {
    const [campaignForm, setCampaignForm] = useState({
      name: '',
      message: '',
      audience: 'all_customers',
      recipientPhones: '',
      scheduledAt: ''
    })

    const handleCreateCampaign = () => {
      if (!campaignForm.name || !campaignForm.message) {
        toast.error('Campaign name and message are required')
        return
      }

      const recipients = campaignForm.audience === 'custom' 
        ? campaignForm.recipientPhones.split(',').map(p => p.trim()).filter(p => p)
        : []

      createCampaign({
        ...campaignForm,
        recipients: recipients,
        status: campaignForm.scheduledAt ? 'scheduled' : 'draft'
      })
    }

    return (
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Create a marketing campaign to send to your customers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="Summer Sale Campaign"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="campaign-message">Message</Label>
              <Textarea
                id="campaign-message"
                placeholder="🌟 Summer Sale Alert! Get 30% off all products. Shop now!"
                value={campaignForm.message}
                onChange={(e) => setCampaignForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="audience">Audience</Label>
              <Select 
                value={campaignForm.audience} 
                onValueChange={(value) => setCampaignForm(prev => ({ ...prev, audience: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_customers">All Customers</SelectItem>
                  <SelectItem value="recent_buyers">Recent Buyers</SelectItem>
                  <SelectItem value="custom">Custom Phone Numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {campaignForm.audience === 'custom' && (
              <div>
                <Label htmlFor="recipient-phones">Phone Numbers</Label>
                <Textarea
                  id="recipient-phones"
                  placeholder="+1234567890, +1987654321"
                  value={campaignForm.recipientPhones}
                  onChange={(e) => setCampaignForm(prev => ({ ...prev, recipientPhones: e.target.value }))}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter phone numbers separated by commas
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreateCampaign} disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create & Send Now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

  const getCampaignStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-500', label: 'Draft' },
      scheduled: { color: 'bg-blue-500', label: 'Scheduled' },
      sent: { color: 'bg-green-500', label: 'Sent' },
      failed: { color: 'bg-red-500', label: 'Failed' }
    }
    
    const config = statusConfig[status] || statusConfig.draft
    
    return (
      <Badge variant="default" className={config.color}>
        {config.label}
      </Badge>
    )
  }
>>>>>>> parent of c18b7fa (added full function for sending order notification)

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to dashboard...</p>
    </div>
  )
}
