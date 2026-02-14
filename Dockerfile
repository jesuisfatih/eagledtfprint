# Eagle Engine - All-in-One Container (eagledtfprint)
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pm2

# Copy monorepo contents
COPY accounts ./accounts
COPY admin ./admin
COPY backend ./backend
COPY shared ./shared
COPY package.json package-lock.json ./

# Install dependencies for each service
RUN cd /app/backend && npm install
RUN cd /app/admin && npm install
RUN cd /app/accounts && npm install
RUN mkdir -p /app/backend/uploads/invoices

# Generate Prisma client
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN cd /app/backend && npx prisma generate

# ── NEXT_PUBLIC env vars (baked at build time by Next.js) ──
ARG NEXT_PUBLIC_API_URL=https://api.eagledtfprint.com
ARG NEXT_PUBLIC_ADMIN_URL=https://app.eagledtfprint.com
ARG NEXT_PUBLIC_ACCOUNTS_URL=https://accounts.eagledtfprint.com
ARG NEXT_PUBLIC_COOKIE_DOMAIN=.eagledtfprint.com
ARG NEXT_PUBLIC_SHOPIFY_STORE_HANDLE=eagledtfprint
ARG NEXT_PUBLIC_SUPPORT_EMAIL=info@eagledtfprint.com
ARG NEXT_PUBLIC_BRAND_NAME=EAGLE SYSTEM
ARG NEXT_PUBLIC_SHOPIFY_INSTALL_URL=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_ACCOUNTS_URL=$NEXT_PUBLIC_ACCOUNTS_URL
ENV NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN
ENV NEXT_PUBLIC_SHOPIFY_STORE_HANDLE=$NEXT_PUBLIC_SHOPIFY_STORE_HANDLE
ENV NEXT_PUBLIC_SUPPORT_EMAIL=$NEXT_PUBLIC_SUPPORT_EMAIL
ENV NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME
ENV NEXT_PUBLIC_SHOPIFY_INSTALL_URL=$NEXT_PUBLIC_SHOPIFY_INSTALL_URL

# Build each service
RUN cd /app/backend && npm run build
RUN cd /app/admin && npm run build
RUN cd /app/accounts && npm run build

# PM2 ecosystem config
RUN echo '{\
  "apps": [\
    {"name":"eagle-api","cwd":"/app/backend","script":"node","args":"dist/src/main.js","env":{"NODE_ENV":"production","PORT":"4000"}},\
    {"name":"eagle-admin","cwd":"/app/admin","script":"npm","args":"start","env":{"NODE_ENV":"production","PORT":"3000"}},\
    {"name":"eagle-accounts","cwd":"/app/accounts","script":"npm","args":"start","env":{"NODE_ENV":"production","PORT":"3001"}}\
  ]\
}' > /app/ecosystem.config.json

EXPOSE 3000 3001 4000
CMD ["pm2-runtime", "/app/ecosystem.config.json"]
