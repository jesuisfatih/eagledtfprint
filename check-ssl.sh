#!/bin/bash
echo "=== CADDY CERT STATUS ==="
docker exec caddy caddy list-certificates 2>/dev/null || echo "list-certificates not available"

echo ""
echo "=== CADDY LOGS (eagledtfprint related) ==="
docker logs caddy 2>&1 | grep -i "eagledtfprint" | tail -20

echo ""
echo "=== SSL TEST api.eagledtfprint.com ==="
curl -s -o /dev/null -w "HTTP: %{http_code} SSL: %{ssl_verify_result}" https://api.eagledtfprint.com 2>&1 || echo "CURL FAILED"

echo ""
echo "=== SSL TEST app.eagledtfprint.com ==="
curl -s -o /dev/null -w "HTTP: %{http_code} SSL: %{ssl_verify_result}" https://app.eagledtfprint.com 2>&1 || echo "CURL FAILED"

echo ""
echo "=== SSL TEST accounts.eagledtfprint.com ==="
curl -s -o /dev/null -w "HTTP: %{http_code} SSL: %{ssl_verify_result}" https://accounts.eagledtfprint.com 2>&1 || echo "CURL FAILED"

echo ""
echo "=== SSL TEST api.eagledtfsupply.com ==="
curl -s -o /dev/null -w "HTTP: %{http_code} SSL: %{ssl_verify_result}" https://api.eagledtfsupply.com 2>&1 || echo "CURL FAILED"
