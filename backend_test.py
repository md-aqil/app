#!/usr/bin/env python3
"""
Enhanced WhatsApp Commerce Hub Backend API Tests
Testing campaign management, order management, and webhook functionality
"""

import requests
import json
import uuid
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name, success, details=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   Details: {details}")
    print()

def test_campaign_management():
    """Test Campaign Management endpoints"""
    print("=== TESTING CAMPAIGN MANAGEMENT ===")
    
    # Test 1: GET /api/campaigns - should return empty list initially
    try:
        response = requests.get(f"{BASE_URL}/campaigns", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            campaigns = response.json()
            if isinstance(campaigns, list):
                log_test("GET /api/campaigns - Empty list", True, f"Returned {len(campaigns)} campaigns")
            else:
                log_test("GET /api/campaigns - Empty list", False, f"Expected list, got {type(campaigns)}")
        else:
            log_test("GET /api/campaigns - Empty list", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("GET /api/campaigns - Empty list", False, f"Exception: {str(e)}")

    # Test 2: POST /api/campaigns - Create new campaign with different audiences
    test_campaigns = [
        {
            "name": "Welcome Campaign - All Customers",
            "message": "Welcome to our store! Check out our latest products.",
            "audience": "all_customers"
        },
        {
            "name": "Recent Buyers Campaign",
            "message": "Thank you for your recent purchase! Here are some recommendations.",
            "audience": "recent_buyers"
        },
        {
            "name": "Custom Audience Campaign",
            "message": "Special offer just for you!",
            "audience": "custom",
            "recipients": ["+1234567890", "+0987654321"]
        }
    ]
    
    created_campaign_ids = []
    
    for i, campaign_data in enumerate(test_campaigns):
        try:
            response = requests.post(f"{BASE_URL}/campaigns", 
                                   headers=HEADERS, 
                                   json=campaign_data, 
                                   timeout=10)
            if response.status_code == 200:
                campaign = response.json()
                if 'id' in campaign and campaign['name'] == campaign_data['name']:
                    created_campaign_ids.append(campaign['id'])
                    log_test(f"POST /api/campaigns - Create campaign {i+1}", True, 
                           f"Created campaign: {campaign['name']} with ID: {campaign['id']}")
                else:
                    log_test(f"POST /api/campaigns - Create campaign {i+1}", False, 
                           f"Missing ID or name mismatch in response: {campaign}")
            else:
                log_test(f"POST /api/campaigns - Create campaign {i+1}", False, 
                       f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            log_test(f"POST /api/campaigns - Create campaign {i+1}", False, f"Exception: {str(e)}")

    # Test 3: POST /api/campaigns - Validation test (missing required fields)
    try:
        invalid_campaign = {"name": "Invalid Campaign"}  # Missing message
        response = requests.post(f"{BASE_URL}/campaigns", 
                               headers=HEADERS, 
                               json=invalid_campaign, 
                               timeout=10)
        if response.status_code == 400:
            log_test("POST /api/campaigns - Validation", True, "Correctly rejected campaign without message")
        else:
            log_test("POST /api/campaigns - Validation", False, 
                   f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/campaigns - Validation", False, f"Exception: {str(e)}")

    # Test 4: GET /api/campaigns - Verify created campaigns
    try:
        response = requests.get(f"{BASE_URL}/campaigns", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            campaigns = response.json()
            if len(campaigns) >= len(created_campaign_ids):
                log_test("GET /api/campaigns - After creation", True, 
                       f"Found {len(campaigns)} campaigns (expected at least {len(created_campaign_ids)})")
            else:
                log_test("GET /api/campaigns - After creation", False, 
                       f"Expected at least {len(created_campaign_ids)} campaigns, got {len(campaigns)}")
        else:
            log_test("GET /api/campaigns - After creation", False, 
                   f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("GET /api/campaigns - After creation", False, f"Exception: {str(e)}")

    # Test 5: POST /api/campaigns/{id}/send - Test sending campaigns (should fail without WhatsApp config)
    if created_campaign_ids:
        campaign_id = created_campaign_ids[0]
        try:
            response = requests.post(f"{BASE_URL}/campaigns/{campaign_id}/send", 
                                   headers=HEADERS, 
                                   timeout=10)
            if response.status_code == 400:
                error_data = response.json()
                if "WhatsApp not configured" in error_data.get('error', ''):
                    log_test("POST /api/campaigns/{id}/send - No WhatsApp config", True, 
                           "Correctly rejected campaign send without WhatsApp configuration")
                else:
                    log_test("POST /api/campaigns/{id}/send - No WhatsApp config", False, 
                           f"Unexpected error: {error_data}")
            else:
                log_test("POST /api/campaigns/{id}/send - No WhatsApp config", False, 
                       f"Expected 400, got {response.status_code}: {response.text}")
        except Exception as e:
            log_test("POST /api/campaigns/{id}/send - No WhatsApp config", False, f"Exception: {str(e)}")

    # Test 6: POST /api/campaigns/{id}/send - Test with invalid campaign ID
    try:
        fake_id = str(uuid.uuid4())
        response = requests.post(f"{BASE_URL}/campaigns/{fake_id}/send", 
                               headers=HEADERS, 
                               timeout=10)
        if response.status_code == 404:
            log_test("POST /api/campaigns/{id}/send - Invalid ID", True, 
                   "Correctly returned 404 for non-existent campaign")
        else:
            log_test("POST /api/campaigns/{id}/send - Invalid ID", False, 
                   f"Expected 404, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/campaigns/{id}/send - Invalid ID", False, f"Exception: {str(e)}")

    # Test 7: DELETE /api/campaigns/{id} - Delete campaigns
    for i, campaign_id in enumerate(created_campaign_ids):
        try:
            response = requests.delete(f"{BASE_URL}/campaigns/{campaign_id}", 
                                     headers=HEADERS, 
                                     timeout=10)
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    log_test(f"DELETE /api/campaigns/{campaign_id} - Campaign {i+1}", True, 
                           f"Successfully deleted campaign {campaign_id}")
                else:
                    log_test(f"DELETE /api/campaigns/{campaign_id} - Campaign {i+1}", False, 
                           f"Success flag not set: {result}")
            else:
                log_test(f"DELETE /api/campaigns/{campaign_id} - Campaign {i+1}", False, 
                       f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            log_test(f"DELETE /api/campaigns/{campaign_id} - Campaign {i+1}", False, f"Exception: {str(e)}")

    # Test 8: DELETE /api/campaigns/{id} - Test with invalid campaign ID
    try:
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/campaigns/{fake_id}", 
                                 headers=HEADERS, 
                                 timeout=10)
        if response.status_code == 404:
            log_test("DELETE /api/campaigns/{id} - Invalid ID", True, 
                   "Correctly returned 404 for non-existent campaign")
        else:
            log_test("DELETE /api/campaigns/{id} - Invalid ID", False, 
                   f"Expected 404, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("DELETE /api/campaigns/{id} - Invalid ID", False, f"Exception: {str(e)}")

def test_order_management():
    """Test Order Management endpoints"""
    print("=== TESTING ORDER MANAGEMENT ===")
    
    # Test 1: GET /api/orders - should return empty list initially
    try:
        response = requests.get(f"{BASE_URL}/orders", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                log_test("GET /api/orders - Empty list", True, f"Returned {len(orders)} orders")
            else:
                log_test("GET /api/orders - Empty list", False, f"Expected list, got {type(orders)}")
        else:
            log_test("GET /api/orders - Empty list", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("GET /api/orders - Empty list", False, f"Exception: {str(e)}")

def test_shopify_webhook_setup():
    """Test Shopify Webhook Setup endpoints"""
    print("=== TESTING SHOPIFY WEBHOOK SETUP ===")
    
    # Test 1: POST /api/setup-webhooks - should fail without Shopify configuration
    try:
        response = requests.post(f"{BASE_URL}/setup-webhooks", headers=HEADERS, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if "Shopify not configured" in error_data.get('error', ''):
                log_test("POST /api/setup-webhooks - No Shopify config", True, 
                       "Correctly rejected webhook setup without Shopify configuration")
            else:
                log_test("POST /api/setup-webhooks - No Shopify config", False, 
                       f"Unexpected error: {error_data}")
        else:
            log_test("POST /api/setup-webhooks - No Shopify config", False, 
                   f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/setup-webhooks - No Shopify config", False, f"Exception: {str(e)}")

def test_shopify_webhook_processing():
    """Test Shopify webhook processing"""
    print("=== TESTING SHOPIFY WEBHOOK PROCESSING ===")
    
    # Test 1: POST /api/webhook/shopify - Test processing Shopify order webhook
    sample_shopify_order = {
        "id": 12345678901234567890,
        "order_number": 1001,
        "name": "#1001",
        "created_at": "2024-01-15T10:30:00Z",
        "total_price": "99.99",
        "currency": "USD",
        "fulfillment_status": "pending",
        "customer": {
            "id": 987654321,
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890"
        },
        "line_items": [
            {
                "id": 111111111,
                "title": "Test Product",
                "quantity": 1,
                "price": "99.99"
            }
        ]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/webhook/shopify", 
                               headers=HEADERS, 
                               json=sample_shopify_order, 
                               timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                log_test("POST /api/webhook/shopify - Process order", True, 
                       "Successfully processed Shopify order webhook")
            else:
                log_test("POST /api/webhook/shopify - Process order", False, 
                       f"Success flag not set: {result}")
        else:
            log_test("POST /api/webhook/shopify - Process order", False, 
                   f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("POST /api/webhook/shopify - Process order", False, f"Exception: {str(e)}")

    # Test 2: Verify order was created in database by checking GET /api/orders
    time.sleep(1)  # Give a moment for the order to be processed
    try:
        response = requests.get(f"{BASE_URL}/orders", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            orders = response.json()
            if len(orders) > 0:
                # Check if our test order is in the list
                test_order_found = False
                for order in orders:
                    if (order.get('shopifyOrderId') == str(sample_shopify_order['id']) or 
                        order.get('customerEmail') == sample_shopify_order['customer']['email']):
                        test_order_found = True
                        break
                
                if test_order_found:
                    log_test("GET /api/orders - After webhook", True, 
                           f"Found test order in database (total orders: {len(orders)})")
                else:
                    log_test("GET /api/orders - After webhook", False, 
                           f"Test order not found in {len(orders)} orders")
            else:
                log_test("GET /api/orders - After webhook", False, 
                       "No orders found after webhook processing")
        else:
            log_test("GET /api/orders - After webhook", False, 
                   f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("GET /api/orders - After webhook", False, f"Exception: {str(e)}")

    # Test 3: POST /api/webhook/shopify - Test with invalid/incomplete data
    invalid_order = {
        "id": 99999999999999999999,
        "total_price": "50.00"
        # Missing customer data
    }
    
    try:
        response = requests.post(f"{BASE_URL}/webhook/shopify", 
                               headers=HEADERS, 
                               json=invalid_order, 
                               timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                log_test("POST /api/webhook/shopify - Invalid data", True, 
                       "Webhook endpoint handles invalid data gracefully")
            else:
                log_test("POST /api/webhook/shopify - Invalid data", False, 
                       f"Unexpected response: {result}")
        else:
            log_test("POST /api/webhook/shopify - Invalid data", False, 
                   f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("POST /api/webhook/shopify - Invalid data", False, f"Exception: {str(e)}")

def test_integration_features():
    """Test enhanced integration features"""
    print("=== TESTING ENHANCED INTEGRATION FEATURES ===")
    
    # Test 1: Verify integrations endpoint still works
    try:
        response = requests.get(f"{BASE_URL}/integrations", headers=HEADERS, timeout=10)
        if response.status_code == 200:
            integrations = response.json()
            required_keys = ['whatsapp', 'shopify', 'stripe']
            if all(key in integrations for key in required_keys):
                log_test("GET /api/integrations - Structure", True, 
                       "Integration structure includes all required services")
            else:
                log_test("GET /api/integrations - Structure", False, 
                       f"Missing required keys. Got: {list(integrations.keys())}")
        else:
            log_test("GET /api/integrations - Structure", False, 
                   f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("GET /api/integrations - Structure", False, f"Exception: {str(e)}")

    # Test 2: Test integration validation (should still work)
    try:
        invalid_integration = {
            "type": "whatsapp",
            "data": {
                "phoneNumberId": "invalid",
                "accessToken": "invalid_token"
            }
        }
        response = requests.post(f"{BASE_URL}/integrations", 
                               headers=HEADERS, 
                               json=invalid_integration, 
                               timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if "Integration test failed" in error_data.get('error', ''):
                log_test("POST /api/integrations - Validation", True, 
                       "Integration validation still works correctly")
            else:
                log_test("POST /api/integrations - Validation", False, 
                       f"Unexpected error: {error_data}")
        else:
            log_test("POST /api/integrations - Validation", False, 
                   f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/integrations - Validation", False, f"Exception: {str(e)}")

def test_error_handling():
    """Test error handling for missing integrations"""
    print("=== TESTING ERROR HANDLING ===")
    
    # Test 1: Products endpoint without Shopify
    try:
        response = requests.get(f"{BASE_URL}/products", headers=HEADERS, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if "Shopify not configured" in error_data.get('error', ''):
                log_test("GET /api/products - No Shopify", True, 
                       "Correctly handles missing Shopify configuration")
            else:
                log_test("GET /api/products - No Shopify", False, 
                       f"Unexpected error: {error_data}")
        else:
            log_test("GET /api/products - No Shopify", False, 
                   f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("GET /api/products - No Shopify", False, f"Exception: {str(e)}")

    # Test 2: Send catalog without WhatsApp
    try:
        catalog_data = {
            "products": ["test-product-1"],
            "recipient": "+1234567890"
        }
        response = requests.post(f"{BASE_URL}/send-catalog", 
                               headers=HEADERS, 
                               json=catalog_data, 
                               timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            if "WhatsApp not configured" in error_data.get('error', ''):
                log_test("POST /api/send-catalog - No WhatsApp", True, 
                       "Correctly handles missing WhatsApp configuration")
            else:
                log_test("POST /api/send-catalog - No WhatsApp", False, 
                       f"Unexpected error: {error_data}")
        else:
            log_test("POST /api/send-catalog - No WhatsApp", False, 
                   f"Expected 400, got {response.status_code}: {response.text}")
    except Exception as e:
        log_test("POST /api/send-catalog - No WhatsApp", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("🚀 Starting Enhanced WhatsApp Commerce Hub Backend Tests")
    print(f"Base URL: {BASE_URL}")
    print("=" * 60)
    
    # Run all test suites
    test_campaign_management()
    test_order_management()
    test_shopify_webhook_setup()
    test_shopify_webhook_processing()
    test_integration_features()
    test_error_handling()
    
    print("=" * 60)
    print("✅ Enhanced Backend Testing Complete!")
    print("\nKey Test Areas Covered:")
    print("• Campaign Management (CRUD operations)")
    print("• Order Management (GET endpoint)")
    print("• Shopify Webhook Setup and Processing")
    print("• Enhanced Integration Features")
    print("• Error Handling for Missing Configurations")
    print("• Campaign Audience Targeting")
    print("• Webhook Processing and Order Confirmation Flow")

if __name__ == "__main__":
    main()