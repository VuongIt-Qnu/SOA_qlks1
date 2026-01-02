#!/bin/bash

# Script to check health of all services

echo "============================================================"
echo "SOA Hotel Management System - Service Health Check"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Services
declare -A SERVICES=(
    ["Auth Service"]="http://localhost:8001/health"
    ["Customer Service"]="http://localhost:8002/health"
    ["Room Service"]="http://localhost:8003/health"
    ["Booking Service"]="http://localhost:8004/health"
    ["Payment Service"]="http://localhost:8005/health"
    ["Report Service"]="http://localhost:8006/health"
    ["Frontend"]="http://localhost:3000"
)

# Databases
declare -A DATABASES=(
    ["auth_db"]="localhost:3307"
    ["customer_db"]="localhost:3308"
    ["room_db"]="localhost:3309"
    ["booking_db"]="localhost:3310"
    ["payment_db"]="localhost:3311"
    ["report_db"]="localhost:3312"
)

check_service() {
    local name=$1
    local url=$2
    
    if curl -s -f -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✅${NC} ${name} - Running"
        return 0
    else
        echo -e "${RED}❌${NC} ${name} - Not Running"
        return 1
    fi
}

check_database() {
    local name=$1
    local host_port=$2
    local host=$(echo $host_port | cut -d: -f1)
    local port=$(echo $host_port | cut -d: -f2)
    
    if timeout 2 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} ${name} (${host_port}) - Connected"
        return 0
    else
        echo -e "${RED}❌${NC} ${name} (${host_port}) - Not Connected"
        return 1
    fi
}

# Check services
echo "📡 Checking Services..."
echo "------------------------------------------------------------"
running_services=0
total_services=${#SERVICES[@]}

for name in "${!SERVICES[@]}"; do
    if check_service "$name" "${SERVICES[$name]}"; then
        ((running_services++))
    fi
done

echo ""
echo "🗄️  Checking Databases..."
echo "------------------------------------------------------------"
running_dbs=0
total_dbs=${#DATABASES[@]}

for name in "${!DATABASES[@]}"; do
    if check_database "$name" "${DATABASES[$name]}"; then
        ((running_dbs++))
    fi
done

# Summary
echo ""
echo "============================================================"
echo "Summary"
echo "============================================================"
echo "Services: ${running_services}/${total_services} running"
echo "Databases: ${running_dbs}/${total_dbs} connected"
echo ""

if [ $running_services -eq $total_services ] && [ $running_dbs -eq $total_dbs ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services or databases are not running${NC}"
    exit 1
fi

