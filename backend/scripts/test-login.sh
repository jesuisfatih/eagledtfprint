#!/bin/bash
# Test admin login
apt-get update -qq > /dev/null 2>&1
apt-get install -y -qq curl > /dev/null 2>&1

echo "=== Testing admin-login ==="
curl -s -X POST http://localhost:4000/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"mhmmdadgzl@outlook.com","password":"12991453Mm++"}'

echo ""
echo "=== Testing accounts login ==="
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mhmmdadgzl@outlook.com","password":"12991453Mm++"}'
