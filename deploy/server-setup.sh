#!/bin/bash

# Eagle B2B Commerce Engine - Server Setup Script
# Ubuntu 22.04 LTS - Hetzner Cloud
# Run as: bash deploy/server-setup.sh

set -e

echo "🦅 Eagle B2B Engine - Server Setup"
echo "=================================="

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install build essentials
apt install -y build-essential

# Install PostgreSQL 16
echo "📦 Installing PostgreSQL 16..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-contrib-16

# Configure PostgreSQL
echo "🔐 Configuring PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE eagle_db;"
sudo -u postgres psql -c "CREATE USER eagle_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE eagle_db TO eagle_user;"
sudo -u postgres psql -c "ALTER DATABASE eagle_db OWNER TO eagle_user;"

# Install Redis 7
echo "📦 Installing Redis 7..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Install Caddy
echo "📦 Installing Caddy..."
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Setup PM2 startup
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# Create directories
echo "📁 Creating directories..."
mkdir -p /var/www/eagle
mkdir -p /var/www/eagle/cdn
mkdir -p /var/log/pm2
mkdir -p /var/log/caddy

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Clone repository
echo "📥 Cloning repository..."
cd /var/www/eagle
git clone https://github.com/jesuisfatih/eagle-engine.dev.git .

# Create .env file
echo "📝 Creating .env file..."
cat > /var/www/eagle/backend/.env << 'EOF'
NODE_ENV=production
PORT=4000
API_URL=https://api.eagledtfsupply.com
ADMIN_URL=https://app.eagledtfsupply.com
ACCOUNTS_URL=https://accounts.eagledtfsupply.com

DATABASE_URL="postgresql://eagle_user:CHANGE_THIS_PASSWORD@localhost:5432/eagle_db?schema=public"

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=CHANGE_THIS_TO_ANOTHER_RANDOM_STRING
JWT_REFRESH_EXPIRES_IN=30d

SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,write_products,read_customers,write_customers,read_orders,write_orders,write_price_rules,write_discounts
SHOPIFY_API_VERSION=2025-01

CDN_URL=https://cdn.eagledtfsupply.com

CORS_ORIGINS=https://app.eagledtfsupply.com,https://accounts.eagledtfsupply.com
EOF

# Install dependencies
echo "📦 Installing dependencies..."
cd /var/www/eagle/backend
npm install
npx prisma generate
npx prisma migrate deploy

cd /var/www/eagle/admin
npm install

cd /var/www/eagle/accounts
npm install

cd /var/www/eagle/snippet
npm install

# Build all
echo "🔨 Building applications..."
cd /var/www/eagle/backend
npm run build

cd /var/www/eagle/admin
npm run build

cd /var/www/eagle/accounts
npm run build

cd /var/www/eagle/snippet
npm run build
cp -r dist/* /var/www/eagle/cdn/

# Setup Caddy
echo "📝 Configuring Caddy..."
cat > /etc/caddy/Caddyfile << 'EOF'
app.eagledtfsupply.com {
    reverse_proxy localhost:3000
    encode gzip
    log {
        output file /var/log/caddy/app.log
    }
}

accounts.eagledtfsupply.com {
    reverse_proxy localhost:3001
    encode gzip
    log {
        output file /var/log/caddy/accounts.log
    }
}

api.eagledtfsupply.com {
    reverse_proxy localhost:4000
    encode gzip
    log {
        output file /var/log/caddy/api.log
    }
}

cdn.eagledtfsupply.com {
    root * /var/www/eagle/cdn
    file_server
    encode gzip
    header {
        Access-Control-Allow-Origin *
        Access-Control-Allow-Methods "GET, OPTIONS"
        Cache-Control "public, max-age=31536000"
    }
}
EOF

systemctl restart caddy

# Start PM2 apps
echo "🚀 Starting applications with PM2..."
cd /var/www/eagle
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update /var/www/eagle/backend/.env with real credentials"
echo "2. Set GitHub secrets: HETZNER_SSH_KEY"
echo "3. Configure DNS records:"
echo "   - app.eagledtfsupply.com → 5.78.148.183"
echo "   - accounts.eagledtfsupply.com → 5.78.148.183"
echo "   - api.eagledtfsupply.com → 5.78.148.183"
echo "   - cdn.eagledtfsupply.com → 5.78.148.183"
echo ""
echo "🔍 Check logs:"
echo "   pm2 logs"
echo "   pm2 monit"
echo ""




