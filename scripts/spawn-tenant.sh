#!/bin/bash

# Eagle Engine - Tenant Spawner Script
# Usage: ./spawn-tenant.sh {merchant_slug} {port_api} {port_admin}

TENANT_SLUG=$1
PORT_API=$2
PORT_ADMIN=$3

if [ -z "$TENANT_SLUG" ] || [ -z "$PORT_API" ] || [ -z "$PORT_ADMIN" ]; then
  echo "Usage: ./spawn-tenant.sh {merchant_slug} {port_api} {port_admin}"
  exit 1
fi

echo "🚀 Spawning new isolated instance for tenant: $TENANT_SLUG"

# 1. Create tenant-specific env file
cat <<EOF > .env.$TENANT_SLUG
NODE_ENV=production
TENANT_SLUG=$TENANT_SLUG
PORT_API=$PORT_API
PORT_ADMIN=$PORT_ADMIN
DATABASE_URL=postgresql://doadmin:HIDDEN@private-db-postgresql-nyc3-64923-do-user-33221790-0.f.db.ondigitalocean.com:25060/eagle_db_$TENANT_SLUG?sslmode=no-verify
# ... other envs
EOF

# 2. Run isolated container
docker run -d \
  --name factoryengine-tenant-$TENANT_SLUG \
  --restart unless-stopped \
  --memory="256m" \
  --cpus="0.2" \
  --env-file .env.$TENANT_SLUG \
  -p $PORT_API:$PORT_API \
  -p $PORT_ADMIN:$PORT_ADMIN \
  ghcr.io/jesuisfatih/eagledtfprint-app:latest

echo "✅ Tenant $TENANT_SLUG is now running!"
echo "📡 API: http://localhost:$PORT_API"
echo "📡 Admin: http://localhost:$PORT_ADMIN"
