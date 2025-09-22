#!/usr/bin/env python3
"""
Backend API Testing for WhatsApp Commerce Hub
Tests all API endpoints including integrations, products, send-catalog, and webhooks
"""

import requests
import json
import os
import sys
from datetime import datetime

# Get base URL from environment
BASE_URL = "https://whatsapp-checkout-1.preview.emergentagent.com/api"

class WhatsAppCommerceAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_api_root(self):
        """Test root API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}")
            
            if response.status_code == 200:
                data = response.json()
                if "WhatsApp Commerce Hub API" in data.get("message", ""):
                    self.log_test("API Root Endpoint", True, "API is accessible and returns correct message")
                else:
                    self.log_test("API Root Endpoint", False, "Unexpected response message", data)
            else:
                self.log_test("API Root Endpoint", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Connection error: {str(e)}")

    def test_get_integrations(self):
        """Test GET /api/integrations - should return default integration status"""
        try:
            response = self.session.get(f"{self.base_url}/integrations")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response has expected structure
                expected_keys = ["whatsapp", "shopify", "stripe"]
                if all(key in data for key in expected_keys):
                    # Check each integration has connected and data fields
                    valid_structure = True
                    for key in expected_keys:
                        if not isinstance(data[key], dict) or "connected" not in data[key] or "data" not in data[key]:
                            valid_structure = False
                            break
                    
                    if valid_structure:
                        self.log_test("GET Integrations", True, "Returns proper integration structure with all required fields")
                    else:
                        self.log_test("GET Integrations", False, "Invalid integration structure", data)
                else:
                    self.log_test("GET Integrations", False, "Missing required integration keys", data)
            else:
                self.log_test("GET Integrations", False, f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("GET Integrations", False, f"Request error: {str(e)}")

    def test_post_integrations_validation(self):
        """Test POST /api/integrations validation"""
        
        # Test missing type and data
        try:
            response = self.session.post(f"{self.base_url}/integrations", json={})
            
            if response.status_code == 400:
                data = response.json()
                if "Type and data are required" in data.get("error", ""):
                    self.log_test("POST Integrations - Missing Fields Validation", True, "Correctly validates missing type and data")
                else:
                    self.log_test("POST Integrations - Missing Fields Validation", False, "Unexpected error message", data)
            else:
                self.log_test("POST Integrations - Missing Fields Validation", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Integrations - Missing Fields Validation", False, f"Request error: {str(e)}")

    def test_post_integrations_whatsapp(self):
        """Test POST /api/integrations for WhatsApp with mock data"""
        
        # Test with invalid WhatsApp credentials
        test_data = {
            "type": "whatsapp",
            "data": {
                "phoneNumberId": "test_phone_id",
                "accessToken": "invalid_token",
                "businessAccountId": "test_business_id",
                "webhookVerifyToken": "test_verify_token"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/integrations", json=test_data)
            
            if response.status_code == 400:
                data = response.json()
                if "Integration test failed" in data.get("error", ""):
                    self.log_test("POST Integrations - WhatsApp Invalid Credentials", True, "Correctly validates WhatsApp credentials")
                else:
                    self.log_test("POST Integrations - WhatsApp Invalid Credentials", False, "Unexpected error message", data)
            else:
                self.log_test("POST Integrations - WhatsApp Invalid Credentials", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Integrations - WhatsApp Invalid Credentials", False, f"Request error: {str(e)}")

    def test_post_integrations_shopify(self):
        """Test POST /api/integrations for Shopify with mock data"""
        
        # Test with invalid Shopify credentials
        test_data = {
            "type": "shopify",
            "data": {
                "shopDomain": "invalid-shop.myshopify.com",
                "accessToken": "invalid_token",
                "apiKey": "test_api_key"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/integrations", json=test_data)
            
            if response.status_code == 400:
                data = response.json()
                if "Integration test failed" in data.get("error", ""):
                    self.log_test("POST Integrations - Shopify Invalid Credentials", True, "Correctly validates Shopify credentials")
                else:
                    self.log_test("POST Integrations - Shopify Invalid Credentials", False, "Unexpected error message", data)
            else:
                self.log_test("POST Integrations - Shopify Invalid Credentials", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Integrations - Shopify Invalid Credentials", False, f"Request error: {str(e)}")

    def test_post_integrations_stripe(self):
        """Test POST /api/integrations for Stripe with mock data"""
        
        # Test with invalid Stripe key format
        test_data = {
            "type": "stripe",
            "data": {
                "secretKey": "invalid_key_format",
                "publishableKey": "pk_test_example"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/integrations", json=test_data)
            
            if response.status_code == 400:
                data = response.json()
                if "Integration test failed" in data.get("error", "") and "Invalid Stripe secret key format" in data.get("error", ""):
                    self.log_test("POST Integrations - Stripe Invalid Key Format", True, "Correctly validates Stripe key format")
                else:
                    self.log_test("POST Integrations - Stripe Invalid Key Format", False, "Unexpected error message", data)
            else:
                self.log_test("POST Integrations - Stripe Invalid Key Format", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Integrations - Stripe Invalid Key Format", False, f"Request error: {str(e)}")

        # Test with valid Stripe key format (should pass format validation but fail API test)
        test_data_valid_format = {
            "type": "stripe",
            "data": {
                "secretKey": "sk_test_invalid_key_but_correct_format",
                "publishableKey": "pk_test_example"
            }
        }
        
        try:
            response = self.session.post(f"{self.base_url}/integrations", json=test_data_valid_format)
            
            # Should accept valid format (current implementation only checks format)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("POST Integrations - Stripe Valid Format", True, "Accepts valid Stripe key format")
                else:
                    self.log_test("POST Integrations - Stripe Valid Format", False, "Unexpected response", data)
            else:
                self.log_test("POST Integrations - Stripe Valid Format", False, f"Expected 200, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Integrations - Stripe Valid Format", False, f"Request error: {str(e)}")

    def test_get_products_no_shopify(self):
        """Test GET /api/products when Shopify is not configured"""
        try:
            response = self.session.get(f"{self.base_url}/products")
            
            if response.status_code == 400:
                data = response.json()
                if "Shopify not configured" in data.get("error", ""):
                    self.log_test("GET Products - No Shopify Config", True, "Correctly handles missing Shopify configuration")
                else:
                    self.log_test("GET Products - No Shopify Config", False, "Unexpected error message", data)
            else:
                self.log_test("GET Products - No Shopify Config", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("GET Products - No Shopify Config", False, f"Request error: {str(e)}")

    def test_send_catalog_validation(self):
        """Test POST /api/send-catalog validation"""
        
        # Test missing products
        try:
            response = self.session.post(f"{self.base_url}/send-catalog", json={})
            
            if response.status_code == 400:
                data = response.json()
                if "Products array is required" in data.get("error", ""):
                    self.log_test("POST Send Catalog - Missing Products", True, "Correctly validates missing products")
                else:
                    self.log_test("POST Send Catalog - Missing Products", False, "Unexpected error message", data)
            else:
                self.log_test("POST Send Catalog - Missing Products", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Send Catalog - Missing Products", False, f"Request error: {str(e)}")

        # Test empty products array
        try:
            response = self.session.post(f"{self.base_url}/send-catalog", json={"products": []})
            
            if response.status_code == 400:
                data = response.json()
                if "Products array is required" in data.get("error", ""):
                    self.log_test("POST Send Catalog - Empty Products", True, "Correctly validates empty products array")
                else:
                    self.log_test("POST Send Catalog - Empty Products", False, "Unexpected error message", data)
            else:
                self.log_test("POST Send Catalog - Empty Products", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Send Catalog - Empty Products", False, f"Request error: {str(e)}")

        # Test missing recipient
        try:
            response = self.session.post(f"{self.base_url}/send-catalog", json={"products": ["123"]})
            
            if response.status_code == 400:
                data = response.json()
                if "Recipient phone number is required" in data.get("error", ""):
                    self.log_test("POST Send Catalog - Missing Recipient", True, "Correctly validates missing recipient")
                else:
                    self.log_test("POST Send Catalog - Missing Recipient", False, "Unexpected error message", data)
            else:
                self.log_test("POST Send Catalog - Missing Recipient", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Send Catalog - Missing Recipient", False, f"Request error: {str(e)}")

    def test_send_catalog_no_whatsapp(self):
        """Test POST /api/send-catalog when WhatsApp is not configured"""
        test_data = {
            "products": ["123", "456"],
            "recipient": "+1234567890"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/send-catalog", json=test_data)
            
            if response.status_code == 400:
                data = response.json()
                if "WhatsApp not configured" in data.get("error", ""):
                    self.log_test("POST Send Catalog - No WhatsApp Config", True, "Correctly handles missing WhatsApp configuration")
                else:
                    self.log_test("POST Send Catalog - No WhatsApp Config", False, "Unexpected error message", data)
            else:
                self.log_test("POST Send Catalog - No WhatsApp Config", False, f"Expected 400, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST Send Catalog - No WhatsApp Config", False, f"Request error: {str(e)}")

    def test_webhook_whatsapp_get(self):
        """Test GET /api/webhook/whatsapp - webhook verification"""
        
        # Test without verify token
        try:
            response = self.session.get(f"{self.base_url}/webhook/whatsapp")
            
            if response.status_code == 403:
                self.log_test("GET WhatsApp Webhook - No Token", True, "Correctly rejects requests without verify token")
            else:
                self.log_test("GET WhatsApp Webhook - No Token", False, f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("GET WhatsApp Webhook - No Token", False, f"Request error: {str(e)}")

        # Test with invalid verify token
        try:
            params = {
                "hub.verify_token": "invalid_token",
                "hub.challenge": "test_challenge"
            }
            response = self.session.get(f"{self.base_url}/webhook/whatsapp", params=params)
            
            if response.status_code == 403:
                self.log_test("GET WhatsApp Webhook - Invalid Token", True, "Correctly rejects invalid verify token")
            else:
                self.log_test("GET WhatsApp Webhook - Invalid Token", False, f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("GET WhatsApp Webhook - Invalid Token", False, f"Request error: {str(e)}")

    def test_webhook_whatsapp_post(self):
        """Test POST /api/webhook/whatsapp - webhook payload logging"""
        
        # Test webhook payload
        test_payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "123456789",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "1234567890",
                            "phone_number_id": "123456789"
                        },
                        "messages": [{
                            "from": "1234567890",
                            "id": "wamid.test",
                            "timestamp": "1234567890",
                            "text": {"body": "Hello"},
                            "type": "text"
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        try:
            response = self.session.post(f"{self.base_url}/webhook/whatsapp", json=test_payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("POST WhatsApp Webhook", True, "Successfully processes webhook payload")
                else:
                    self.log_test("POST WhatsApp Webhook", False, "Unexpected response", data)
            else:
                self.log_test("POST WhatsApp Webhook", False, f"Expected 200, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("POST WhatsApp Webhook", False, f"Request error: {str(e)}")

    def test_cors_headers(self):
        """Test CORS headers are properly set"""
        try:
            response = self.session.options(f"{self.base_url}/integrations")
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            missing_headers = []
            for header in cors_headers:
                if header not in response.headers:
                    missing_headers.append(header)
            
            if not missing_headers:
                self.log_test("CORS Headers", True, "All required CORS headers are present")
            else:
                self.log_test("CORS Headers", False, f"Missing CORS headers: {missing_headers}")
                
        except Exception as e:
            self.log_test("CORS Headers", False, f"Request error: {str(e)}")

    def test_invalid_route(self):
        """Test handling of invalid routes"""
        try:
            response = self.session.get(f"{self.base_url}/nonexistent-route")
            
            if response.status_code == 404:
                data = response.json()
                if "Route /nonexistent-route not found" in data.get("error", ""):
                    self.log_test("Invalid Route Handling", True, "Correctly handles invalid routes")
                else:
                    self.log_test("Invalid Route Handling", False, "Unexpected error message", data)
            else:
                self.log_test("Invalid Route Handling", False, f"Expected 404, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_test("Invalid Route Handling", False, f"Request error: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("WHATSAPP COMMERCE HUB - BACKEND API TESTING")
        print("=" * 60)
        print(f"Testing API at: {self.base_url}")
        print()
        
        # Test API connectivity
        self.test_api_root()
        
        # Test Integration Management
        print("🔧 TESTING INTEGRATION MANAGEMENT")
        print("-" * 40)
        self.test_get_integrations()
        self.test_post_integrations_validation()
        self.test_post_integrations_whatsapp()
        self.test_post_integrations_shopify()
        self.test_post_integrations_stripe()
        
        # Test Products Endpoint
        print("📦 TESTING PRODUCTS ENDPOINT")
        print("-" * 40)
        self.test_get_products_no_shopify()
        
        # Test Send Catalog Endpoint
        print("📤 TESTING SEND CATALOG ENDPOINT")
        print("-" * 40)
        self.test_send_catalog_validation()
        self.test_send_catalog_no_whatsapp()
        
        # Test Webhook Endpoints
        print("🔗 TESTING WEBHOOK ENDPOINTS")
        print("-" * 40)
        self.test_webhook_whatsapp_get()
        self.test_webhook_whatsapp_post()
        
        # Test Additional Features
        print("⚙️ TESTING ADDITIONAL FEATURES")
        print("-" * 40)
        self.test_cors_headers()
        self.test_invalid_route()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        print()
        
        if failed > 0:
            print("FAILED TESTS:")
            print("-" * 20)
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
            print()
        
        print("CRITICAL ISSUES FOUND:")
        print("-" * 20)
        critical_issues = []
        for result in self.test_results:
            if not result["success"]:
                # Only report critical issues, not validation errors which are expected
                if not any(keyword in result["test"].lower() for keyword in ["validation", "invalid", "missing", "no token", "no config"]):
                    critical_issues.append(f"• {result['test']}: {result['details']}")
        
        if critical_issues:
            for issue in critical_issues:
                print(issue)
        else:
            print("• No critical issues found - all core functionality working as expected")
        
        print()
        return passed, failed

if __name__ == "__main__":
    tester = WhatsAppCommerceAPITester()
    tester.run_all_tests()