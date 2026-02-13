#!/bin/bash
# Fix merchant token from env variable and reset sync failures
# Run inside Docker container: docker exec factoryengine-eagledtf-app bash /app/backend/scripts/fix-token.sh

cd /app/backend

TOKEN="$SHOPIFY_ACCESS_TOKEN"
DOMAIN="$SHOPIFY_STORE_DOMAIN"

if [ -z "$TOKEN" ]; then
  echo "ERROR: SHOPIFY_ACCESS_TOKEN env variable not set"
  exit 1
fi

echo "Updating merchant token for $DOMAIN..."
echo "UPDATE merchants SET access_token = '$TOKEN' WHERE shop_domain = '$DOMAIN';" | npx prisma db execute --stdin

echo "Resetting sync failure counters..."
echo "UPDATE sync_states SET consecutive_failures = 0, last_error = NULL, status = 'idle';" | npx prisma db execute --stdin

echo "Restarting API..."
pm2 restart eagle-api

echo "Done! Token updated and sync reset."
