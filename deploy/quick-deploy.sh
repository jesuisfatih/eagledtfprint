#!/bin/bash
set -e

echo "🦅 Eagle B2B - Quick Deploy Script"
echo "===================================="

cd /var/www/eagle

# Backend Build
echo "📦 Building backend..."
cd backend
npm run build

# Admin Build
echo "📦 Building admin..."
cd ../admin
npm install --production
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.eagledtfsupply.com
EOF
npm run build

# Accounts Build
echo "📦 Building accounts..."
cd ../accounts
npm install --production
cat > .env.production.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.eagledtfsupply.com
EOF
npm run build

# Snippet Build
echo "📦 Building snippet..."
cd ../snippet
npm run build
mkdir -p /var/www/eagle/cdn
cp -r dist/* /var/www/eagle/cdn/

# Caddy Config
echo "⚙️ Configuring Caddy..."
cat > /etc/caddy/Caddyfile << 'EOF'
app.eagledtfsupply.com {
    reverse_proxy localhost:3000
    encode gzip
}

accounts.eagledtfsupply.com {
    reverse_proxy localhost:3001
    encode gzip
}

api.eagledtfsupply.com {
    reverse_proxy localhost:4000
    encode gzip
}

cdn.eagledtfsupply.com {
    root * /var/www/eagle/cdn
    file_server
    encode gzip
    header Access-Control-Allow-Origin *
}
EOF

systemctl reload caddy

# PM2 Start
echo "🚀 Starting PM2..."
cd /var/www/eagle
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment complete!"
echo "Check status: pm2 status"


