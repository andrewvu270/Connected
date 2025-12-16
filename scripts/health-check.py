#!/usr/bin/env python3
"""
Connected Backend Health Check Script
Performs comprehensive health checks on the deployed backend
"""

import requests
import sys
import json
from datetime import datetime

def check_endpoint(url, name, expected_status=200):
    """Check if an endpoint is responding correctly"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == expected_status:
            print(f"✅ {name}: OK ({response.status_code})")
            return True
        else:
            print(f"❌ {name}: Failed ({response.status_code})")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ {name}: Error - {str(e)}")
        return False

def check_config(base_url):
    """Check configuration endpoint"""
    try:
        response = requests.get(f"{base_url}/config", timeout=10)
        if response.status_code == 200:
            config = response.json()
            print("📋 Configuration Status:")
            for key, value in config.items():
                status = "✅" if value else "❌"
                print(f"   {status} {key}: {value}")
            return all(config.values())
        else:
            print(f"❌ Config check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Config check error: {str(e)}")
        return False

def main():
    base_url = "http://localhost:8001"
    
    print("🏥 Connected Backend Health Check")
    print("=" * 40)
    print(f"🕐 Timestamp: {datetime.now().isoformat()}")
    print(f"🌐 Base URL: {base_url}")
    print()
    
    # Core health checks
    checks = [
        (f"{base_url}/health", "Health Endpoint"),
        (f"{base_url}/docs", "API Documentation"),
    ]
    
    results = []
    for url, name in checks:
        results.append(check_endpoint(url, name))
    
    print()
    
    # Configuration check
    config_ok = check_config(base_url)
    results.append(config_ok)
    
    print()
    print("📊 Summary:")
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All checks passed ({passed}/{total})")
        print("🎉 Backend is healthy and ready!")
        sys.exit(0)
    else:
        print(f"❌ Some checks failed ({passed}/{total})")
        print("🔧 Please review the issues above")
        sys.exit(1)

if __name__ == "__main__":
    main()