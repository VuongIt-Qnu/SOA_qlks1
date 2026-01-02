#!/usr/bin/env python3
"""
Script to check health of all services
"""
import requests
import sys
from typing import Dict, List

SERVICES = {
    "Auth Service": "http://localhost:8001/health",
    "Customer Service": "http://localhost:8002/health",
    "Room Service": "http://localhost:8003/health",
    "Booking Service": "http://localhost:8004/health",
    "Payment Service": "http://localhost:8005/health",
    "Report Service": "http://localhost:8006/health",
    "Frontend": "http://localhost:3000"
}

DATABASES = {
    "auth_db": "localhost:3307",
    "customer_db": "localhost:3308",
    "room_db": "localhost:3309",
    "booking_db": "localhost:3310",
    "payment_db": "localhost:3311",
    "report_db": "localhost:3312"
}


def check_service(name: str, url: str) -> Dict:
    """Check if a service is running"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return {
                "name": name,
                "status": "✅ Running",
                "url": url,
                "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else "OK"
            }
        else:
            return {
                "name": name,
                "status": f"⚠️  Status {response.status_code}",
                "url": url,
                "response": None
            }
    except requests.exceptions.ConnectionError:
        return {
            "name": name,
            "status": "❌ Not Running",
            "url": url,
            "response": None
        }
    except requests.exceptions.Timeout:
        return {
            "name": name,
            "status": "⏱️  Timeout",
            "url": url,
            "response": None
        }
    except Exception as e:
        return {
            "name": name,
            "status": f"❌ Error: {str(e)}",
            "url": url,
            "response": None
        }


def check_database(name: str, host_port: str) -> Dict:
    """Check if database is accessible"""
    try:
        import pymysql
        host, port = host_port.split(':')
        connection = pymysql.connect(
            host=host,
            port=int(port),
            user='root',
            password='password',
            database=name,
            connect_timeout=5
        )
        connection.close()
        return {
            "name": name,
            "status": "✅ Connected",
            "host_port": host_port
        }
    except ImportError:
        return {
            "name": name,
            "status": "⚠️  pymysql not installed (pip install pymysql)",
            "host_port": host_port
        }
    except Exception as e:
        return {
            "name": name,
            "status": f"❌ Error: {str(e)}",
            "host_port": host_port
        }


def main():
    print("=" * 60)
    print("SOA Hotel Management System - Service Health Check")
    print("=" * 60)
    print()
    
    # Check services
    print("📡 Checking Services...")
    print("-" * 60)
    service_results = []
    for name, url in SERVICES.items():
        result = check_service(name, url)
        service_results.append(result)
        print(f"{result['status']} {result['name']}")
        if result['response']:
            print(f"   URL: {result['url']}")
            if isinstance(result['response'], dict):
                print(f"   Response: {result['response']}")
        print()
    
    # Check databases
    print("🗄️  Checking Databases...")
    print("-" * 60)
    db_results = []
    for name, host_port in DATABASES.items():
        result = check_database(name, host_port)
        db_results.append(result)
        print(f"{result['status']} {result['name']} ({result['host_port']})")
        print()
    
    # Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    
    running_services = sum(1 for r in service_results if "✅" in r['status'])
    total_services = len(service_results)
    
    running_dbs = sum(1 for r in db_results if "✅" in r['status'])
    total_dbs = len(db_results)
    
    print(f"Services: {running_services}/{total_services} running")
    print(f"Databases: {running_dbs}/{total_dbs} connected")
    print()
    
    if running_services == total_services and running_dbs == total_dbs:
        print("✅ All systems operational!")
        return 0
    else:
        print("⚠️  Some services or databases are not running")
        return 1


if __name__ == "__main__":
    sys.exit(main())

