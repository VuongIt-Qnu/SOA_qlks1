#!/bin/bash
# Test script for frontend functionality

echo "========================================"
echo "Testing Frontend Functionality"
echo "========================================"
echo ""

echo "[1/5] Checking Docker containers..."
docker-compose ps
echo ""

echo "[2/5] Testing API Gateway health..."
curl http://localhost:8000/health
echo ""
echo ""

echo "[3/5] Testing API Gateway root (no token)..."
curl http://localhost:8000/
echo ""
echo ""

echo "[4/5] Testing API Gateway redirect endpoint..."
curl http://localhost:8000/redirect
echo ""
echo ""

echo "[5/5] Testing Frontend..."
curl -I http://localhost:3000
echo ""

echo "========================================"
echo "Test completed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open browser: http://localhost:3000/user.html"
echo "2. Test login/register functionality"
echo "3. Test navigation based on user roles"
echo ""

