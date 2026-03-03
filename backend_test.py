import requests
import sys
import json
import time
from datetime import datetime, timedelta

class OptionsBacktestingAPITester:
    def __init__(self, base_url="https://contract-analyzer-25.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_backtest_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Response Status: {response.status_code}")
            
            # Try to parse JSON response
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text[:200]}
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response_data and isinstance(response_data, dict):
                    print(f"   Response keys: {list(response_data.keys())}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response_data}")

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "/api/", 200)

    def test_register(self, name, email, password):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/api/auth/register",
            200,
            data={"name": name, "email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ Token acquired: {self.token[:20]}...")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ Token acquired: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/api/auth/me",
            200
        )
        return success and 'id' in response

    def test_get_indices(self):
        """Test get available indices"""
        success, response = self.run_test(
            "Get Indices",
            "GET",
            "/api/market/indices",
            200
        )
        return success and 'indices' in response

    def test_get_strategies(self):
        """Test get available strategies"""
        success, response = self.run_test(
            "Get Strategies",
            "GET",
            "/api/market/strategies",
            200
        )
        return success and 'strategies' in response

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "/api/dashboard/stats",
            200
        )
        return success and 'total_backtests' in response

    def test_create_backtest(self):
        """Test create and run backtest"""
        # Use a simple strategy for testing
        backtest_config = {
            "name": f"Test Backtest {datetime.now().strftime('%H%M%S')}",
            "config": {
                "strategy_type": "simple_call",
                "index": "NIFTY",
                "contract_type": "weekly",
                "start_date": "2024-01-01",
                "end_date": "2024-01-15",
                "lots": 1,
                "entry_time": "09:30",
                "exit_time": "15:15",
                "stop_loss_percent": None,
                "target_percent": None
            }
        }
        
        print(f"   Creating backtest with config: {json.dumps(backtest_config['config'], indent=2)}")
        
        success, response = self.run_test(
            "Create Backtest",
            "POST",
            "/api/backtest/run",
            200,
            data=backtest_config
        )
        
        if success and 'id' in response:
            self.created_backtest_id = response['id']
            print(f"   ✅ Backtest created with ID: {self.created_backtest_id}")
            
            # Verify backtest has expected fields
            required_fields = ['id', 'name', 'config', 'trades', 'statistics']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️ Missing fields in response: {missing_fields}")
                return False
            
            # Check if trades were generated
            trades_count = len(response.get('trades', []))
            print(f"   📊 Generated {trades_count} trades")
            
            # Check statistics
            stats = response.get('statistics', {})
            print(f"   📈 Total P&L: {stats.get('total_pnl', 'N/A')}")
            print(f"   📈 Win Rate: {stats.get('win_rate', 'N/A')}%")
            
            return True
        return False

    def test_get_backtests(self):
        """Test get user backtests"""
        success, response = self.run_test(
            "Get User Backtests",
            "GET",
            "/api/backtests",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} backtests")
            return True
        return False

    def test_get_backtest_by_id(self):
        """Test get specific backtest"""
        if not self.created_backtest_id:
            print("   ⚠️ Skipping - No backtest ID available")
            return True
            
        success, response = self.run_test(
            "Get Backtest by ID",
            "GET",
            f"/api/backtests/{self.created_backtest_id}",
            200
        )
        
        return success and 'id' in response

    def test_delete_backtest(self):
        """Test delete backtest"""
        if not self.created_backtest_id:
            print("   ⚠️ Skipping - No backtest ID available")
            return True
            
        success, response = self.run_test(
            "Delete Backtest",
            "DELETE",
            f"/api/backtests/{self.created_backtest_id}",
            200
        )
        
        return success and 'message' in response

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        original_token = self.token
        self.token = None  # Remove token
        
        success, response = self.run_test(
            "Unauthorized Access Test",
            "GET",
            "/api/auth/me",
            401,  # Expect 401 Unauthorized
            headers={'Authorization': 'Bearer invalid_token'}
        )
        
        self.token = original_token  # Restore token
        # For this test, success means we got 401 as expected
        return response.get('detail') == 'Invalid token'

def main():
    print("🚀 Starting Options Backtesting API Tests")
    print("=" * 60)
    
    # Initialize tester
    tester = OptionsBacktestingAPITester()
    
    # Generate unique test user
    timestamp = datetime.now().strftime('%H%M%S')
    test_user_name = f"Test User {timestamp}"
    test_email = f"test.user.{timestamp}@example.com"
    test_password = "TestPass123!"
    
    print(f"📧 Test user: {test_email}")
    
    try:
        # Test sequence
        tests = [
            # Basic API tests
            ("Root API", tester.test_root_endpoint),
            
            # Authentication tests
            ("User Registration", lambda: tester.test_register(test_user_name, test_email, test_password)),
            ("Get Current User", tester.test_get_me),
            
            # Market data tests
            ("Get Indices", tester.test_get_indices),
            ("Get Strategies", tester.test_get_strategies),
            
            # Dashboard tests
            ("Dashboard Stats", tester.test_dashboard_stats),
            
            # Backtest tests
            ("Create Backtest", tester.test_create_backtest),
            ("Get User Backtests", tester.test_get_backtests),
            ("Get Backtest by ID", tester.test_get_backtest_by_id),
            
            # Cleanup tests
            ("Delete Backtest", tester.test_delete_backtest),
            
            # Security tests
            ("Unauthorized Access", tester.test_unauthorized_access),
        ]
        
        failed_tests = []
        
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            try:
                if not test_func():
                    failed_tests.append(test_name)
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                failed_tests.append(test_name)
        
        # Print results
        print("\n" + "="*60)
        print("📊 TEST RESULTS")
        print("="*60)
        print(f"Tests Run: {tester.tests_run}")
        print(f"Tests Passed: {tester.tests_passed}")
        print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
        print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%" if tester.tests_run > 0 else "0%")
        
        if failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   - {test}")
        else:
            print(f"\n✅ All tests passed!")
        
        return 0 if not failed_tests else 1

    except Exception as e:
        print(f"\n💥 Critical error during testing: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())