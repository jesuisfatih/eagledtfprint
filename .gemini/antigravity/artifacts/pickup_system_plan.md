# 🦅 Eagle Pickup System — Mimari Plan

## 📋 İş Akışı

### 1. Sipariş Alımı (Shopify Webhook)
- Müşteri Shopify'da DTF transfer / gang sheet siparişi verir
- DripApps eklentisi sipariş notlarına dosya URL'lerini yazar:
  - `_ul_upload_id`, `_ul_thumbnail`, `Uploaded File`, `Design Type`, `File Name`
  - Preview, Edit, Admin Edit, Print Ready File URL'leri
- Shopify webhook → Eagle API → OrderLocal oluşturulur
- **Otomatik**: Sipariş oluştuktan sonra `PickupOrder` kaydı da oluşturulur

### 2. Admin: Raf Atama (Admin Panel / Masaüstü App)
- Admin `/pickup` sayfasından veya masaüstü uygulamadan siparişleri görür
- Her siparişe bir **raf kodu** atar (örn: "A-3", "B-12")
- QR kodu otomatik oluşturulur ve siparişe bağlanır
- Masaüstü app aynı endpoint'leri kullanacak

### 3. Müşteri Pickup (QR Kiosk)
- Mağazada bir monitörde `accounts.eagledtfsupply.com/qrpickup` açılır
- Müşteri QR başka bir cihazda tarayabilir
- Token varsa direkt girer, yoksa email doğrulaması yapar
- QR'dan gelen bilgi ekranda gösterilir: raf lokasyonu

### 4. Bildirimler (Shopify Webhook → Dittofeed)
- Sipariş durumu "pickup_ready" olunca müşteriye email gönderilir

---

## 📦 Database Modelleri

### PickupShelf (Raf Tanımları)
```
id, merchantId, code (A-1, B-3...), name, description, isActive
```

### PickupOrder (Sipariş-Raf-QR Eşleştirme)
```
id, merchantId, orderId(OrderLocal), companyId, companyUserId
shelfId(PickupShelf), qrCode (unique), status
designFiles(JSON - parsed from order notes)
assignedAt, readyAt, pickedUpAt, notifiedAt
notes
```

### Status Akışı:
`pending → processing → ready → notified → picked_up → completed`

---

## 🔌 API Endpoints

### Pickup Orders — `/pickup/orders`
- `GET /` — tüm pickup order'ları listele (admin)
- `GET /:id` — tekil pickup order
- `POST /` — sipariş'ten pickup order oluştur
- `PATCH /:id/assign-shelf` — raf ata
- `PATCH /:id/status` — durum güncelle
- `GET /:id/qr` — QR kodu

### Pickup Shelves — `/pickup/shelves`
- `GET /` — tüm raflar
- `POST /` — yeni raf
- `PATCH /:id` — raf güncelle
- `DELETE /:id` — raf sil

### Pickup QR (Public) — `/pickup/scan`
- `POST /verify` — email doğrulama (token döner)
- `GET /:qrCode` — QR bilgisi (raf lokasyonu)

### Invoice Upload
- `POST /invoices/upload` — PDF dosya yükle

---

## 🖥️ Admin Panel Sayfaları
- `/pickup` — Dashboard (özet istatistikler, son siparişler)
- `/pickup/shelves` — Raf yönetimi (CRUD)

## 🛒 Accounts Panel Sayfaları
- `/qrpickup` — QR Scan kiosk ekranı (public route)

---

## 🔧 Masaüstü App (Gelecek)
- Aynı backend API endpoint'lerini kullanacak
- `/pickup/orders/:id/assign-shelf` ile raf atama
- QR kod yazdırma
