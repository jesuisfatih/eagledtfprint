#!/bin/bash
set -e

cd /var/www/eagle

# Database
echo "DB..."
cd backend
npx prisma db push --accept-data-loss --force-reset

# Build all
echo "Build backend..."
npm run build

echo "Build admin..."
cd ../admin
npm install
echo "NEXT_PUBLIC_API_URL=https://api.eagledtfsupply.com" > .env.production.local
npm run build

echo "Build accounts..."
cd ../accounts
npm install
echo "NEXT_PUBLIC_API_URL=https://api.eagledtfsupply.com" > .env.production.local
npm run build

echo "Build snippet..."
cd ../snippet
npm run build
mkdir -p /var/www/eagle/cdn
cp -r dist/* /var/www/eagle/cdn/

# Caddy
echo "Caddy..."
systemctl reload caddy

# PM2
echo "PM2..."
cd /var/www/eagle
pm2 delete all || true
pm2 start ecosystem.config.js
pm2 save
pm2 list

echo "DONE!"


