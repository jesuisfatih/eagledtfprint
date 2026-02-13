---
description: Deploy Eagle DTF Print Engine to production server (DigitalOcean)
---

# 🦅 Eagle DTF Print Deployment

## ⛔ 1. STRICT PROHIBITIONS

1. **DO NOT** modify Docker resource limits
2. **DO NOT** touch other apps (customizerapp, ssactivewear, eagledtfsupply)
3. **DO NOT** use local Docker PostgreSQL for production data
4. **DO NOT** run PM2 on host level
5. **DO NOT** modify Caddy global settings

## 🔑 2. CONNECTION INFO

### SSH
- **Host IP:** `104.236.78.45` | **User:** `root` | **Port:** `22`
- **SSH Key:** `~/.ssh/appserver`

### Managed PostgreSQL
- **Host:** `private-db-postgresql-nyc3-64923-do-user-33221790-0.f.db.ondigitalocean.com`
- **Port:** `25060` | **User:** `doadmin` | **Database:** `eagle_print_db`

## 📂 3. PROJECT CONFIG

- **Dizin:** `/opt/apps/custom/factoryengine/eagledtfprint/`
- **Git Repo:** `https://github.com/jesuisfatih/eagle-engine-print`
- **Branch:** `main`

### Services & Ports
- `app.eagledtfprint.com` (Port 3000)
- `accounts.eagledtfprint.com` (Port 3001)
- `api.eagledtfprint.com` (Port 4000)

## 🛠️ 4. DEPLOYMENT STEPS

// turbo-all

1. Push local changes to GitHub:
```bash
cd c:\Users\mhmmd\Desktop\eagle-engine-print
git add -A && git commit -m "deploy: update" && git push origin main
```

2. SSH into server and update Docker:
```bash
ssh -i ~/.ssh/appserver root@104.236.78.45 "cd /opt/apps/custom/factoryengine/eagledtfprint/ && git pull origin main && docker compose build && docker compose up -d"
```

3. Rebuild inside container (if needed):
```bash
ssh -i ~/.ssh/appserver root@104.236.78.45 "docker exec factoryengine-dtfprint-app bash -c 'cd /app/backend && npx prisma db push && npm run build && pm2 restart all'"
```

## 📊 5. USEFUL COMMANDS
- **Status:** `ssh -i ~/.ssh/appserver root@104.236.78.45 "docker exec factoryengine-dtfprint-app pm2 status"`
- **Logs:** `docker logs -f factoryengine-dtfprint-app`
