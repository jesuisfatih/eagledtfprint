# 🦅 Eagle Engine - DigitalOcean Infrastructure Documentation

> Son güncelleme: 2026-02-13
> Sunucu: DigitalOcean NYC3

## ⛔ KESİN YASAKLAR (STRICT PROHIBITIONS)

**Aşağıdaki kuralların ihlali sunucunun çökmesine ve diğer ticari uygulamaların durmasına neden olur:**

1.  **KAYNAK SINIRLARINI KALDIRMA:** `docker-compose.yml` içindeki `deploy.resources.limits` ayarlarını kesinlikle kaldırma veya yükseltme. Tüm Eagle projesi toplamda **%10 CPU ve %20 RAM** sınırına tabidir.
2.  **DİĞER UYGULAMALARA DOKUNMA:** Sunucuda çalışan `customizerapp` ve `ssactivewear` projelerine ait dizinlere ve container'lara kesinlikle müdahale etme.
3.  **LOKAL DB KULLANMA:** `factoryengine-eagledtf-db` container'ını prod verisi için kullanma (sadece proxy/dev amaçlıdır). Ana veriler **Managed PostgreSQL** üzerindedir.
4.  **HOST PM2:** Sunucunun kendisinde (SSH seviyesinde) PM2 çalıştırma. Sadece container içinde çalıştırılmalıdır.

---

## 1. Sunucu Bilgileri

| Bilgi | Değer |
|---|---|
| **Sağlayıcı** | DigitalOcean |
| **IP Adresi** | `104.236.78.45` |
| **SSH Key** | `~/.ssh/appserver` |
| **Root Dizin** | `/opt/apps/custom/factoryengine/eagledtftransfer/` |

---

## 2. Managed PostgreSQL (DigitalOcean)

| Bilgi | Değer |
|---|---|
| **Host (VPC)** | `private-db-postgresql-nyc3-64923-do-user-33221790-0.f.db.ondigitalocean.com` |
| **Port** | `25060` |
| **Database** | `eagle_db` |
| **Kullanıcı** | `doadmin` |
| **Şifre** | `[HIDDEN_IN_ENV]` |
| **Bağlantı URL** | `postgresql://doadmin:[HIDDEN]@...:25060/eagle_db?sslmode=no-verify` |

---

## 3. Docker Servisleri

**Dizin:** `/opt/apps/custom/factoryengine/eagledtftransfer/`

| Container | Rol | Port |
|---|---|---|
| `factoryengine-eagledtf-app` | API, Admin, Accounts (PM2) | 3000, 3001, 4000 |
| `factoryengine-eagledtf-dittofeed` | Campaigns Engine | 3010 |
| `factoryengine-eagledtf-db` | Postgres (Local) | 5432 |
| `factoryengine-eagledtf-clickhouse` | Analytics | 8123 |
| `factoryengine-eagledtf-temporal` | Workflow Engine | 7233 |

---

## 4. Domain & Reverse Proxy (Caddy)

**Yapılandırma:** `/opt/apps/caddy/Caddyfile`

- `app.eagledtfsupply.com` -> localhost:3000
- `accounts.eagledtfsupply.com` -> localhost:3001
- `api.eagledtfsupply.com` -> localhost:4000
- `campaigns.eagledtfsupply.com` -> localhost:3010

---

## 5. Deployment İşlemi

1. Lokal değişiklikleri GitHub (`master` branch) üzerine push et.
2. Sunucuya SSH ile bağlan: `ssh -i ~/.ssh/appserver root@104.236.78.45`.
3. Proje dizinine git: `cd /opt/apps/custom/factoryengine/eagledtftransfer/`.
4. `git pull origin master`.
5. `docker compose up -d`.
6. Log takibi: `docker logs -f factoryengine-eagledtf-app`.

---

## 6. PM2 (Container İçinde)

Container içine girerek PM2 yönetilebilir:
```bash
docker exec -it factoryengine-eagledtf-app pm2 status
docker exec -it factoryengine-eagledtf-app pm2 logs
```
