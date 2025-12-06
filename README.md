# AttendAI - Cloud Tabanlı Rol Tabanlı Devam Takip Sistemi

Bu proje, Firebase tabanlı, rol tabanlı girişi olan bir attendance (devam takip) sistemidir. AI algoritmaları kullanarak anomali tespiti yapar.

## 🎯 Özellikler

- ✅ Firebase Authentication ile rol tabanlı giriş (Öğretmen/Öğrenci)
- ✅ QR kod ile yoklama alma
- ✅ Öğretmen paneli ile yoklama oturumu oluşturma
- ✅ **AI tabanlı anomali tespiti** (yeni!)
  - Zaman bazlı anomali tespiti
  - Duplicate (tekrar) yoklama tespiti
  - İstatistiksel anomali tespiti (Isolation Forest)

## 📁 Proje Yapısı

```
cloud_qr_project/
├── public_web/          # Frontend (HTML, JS)
│   ├── index.html      # Giriş sayfası
│   ├── teacher.html    # Öğretmen paneli (AI anomali tespiti dahil)
│   ├── qr.html         # Öğrenci QR tarayıcı
│   └── firebase.js     # Firebase entegrasyonu ve AI servis çağrıları
├── ai-service/          # AI Anomaly Detection Servisi
│   ├── main.py         # FastAPI servisi
│   ├── requirements.txt
│   └── README.md
└── README.md
```

## 🚀 Kurulum ve Çalıştırma

### 1. Frontend (Web Uygulaması)

Frontend için özel bir kurulum gerekmez. Sadece bir web sunucusu ile çalıştırın:

```bash
cd public_web
# Python ile basit HTTP sunucusu
python -m http.server 8080
```

Veya herhangi bir web sunucusu kullanabilirsiniz (Live Server, VS Code extension, vb.)

### 2. AI Servisi

```bash
cd ai-service

# Virtual environment aktifleştir (Windows)
..\venv\Scripts\activate

# Gerekli paketleri yükle
pip install -r requirements.txt

# Servisi başlat
python main.py
```

AI servisi `http://localhost:8000` adresinde çalışacaktır.

## 📖 Kullanım

### Öğretmen Olarak Giriş

1. `index.html` sayfasından "Öğretmen" rolü ile kaydolun veya giriş yapın
2. `teacher.html` sayfasına yönlendirileceksiniz
3. Ders adını girin ve "Yoklama Oturumu BAŞLAT" butonuna tıklayın
4. QR kod oluşturulacak, öğrenciler bu QR kodu tarayarak yoklama alabilir

### AI Anomali Tespiti

1. Öğretmen panelinde "AI Anomali Tespiti" bölümüne gidin
2. (Opsiyonel) Belirli bir oturum ID'si girebilirsiniz
3. "Anomali Tespiti Yap" butonuna tıklayın
4. Tespit edilen anomaliler listelenecektir:
   - **Yüksek Risk**: Duplicate yoklama, çok erken/geç yoklama
   - **Orta Risk**: Normal saatler dışında yoklama, istatistiksel anomali
   - **Düşük Risk**: Normal kayıtlar

### Öğrenci Olarak Giriş

1. `index.html` sayfasından "Öğrenci" rolü ile kaydolun veya giriş yapın
2. `qr.html` sayfasına yönlendirileceksiniz
3. Kamera izni verin
4. Öğretmenin oluşturduğu QR kodu tarayın
5. Yoklama otomatik olarak kaydedilecektir

## 🔧 Yapılandırma

### Firebase Yapılandırması

Firebase yapılandırması `public_web/firebase.js` dosyasında tanımlıdır. Kendi Firebase projenizi kullanmak için bu dosyayı güncelleyin.

### AI Servis URL'i

AI servis URL'i `public_web/firebase.js` dosyasındaki `AI_SERVICE_URL` değişkeninde tanımlıdır (varsayılan: `http://localhost:8000`).

## 🤖 AI Anomali Tespiti Algoritmaları

### 1. Time-based Anomaly Detection
- Normal ders saatleri (08:00-18:00) dışında yoklama tespiti
- Oturum başlangıcından çok erken/geç yoklama tespiti

### 2. Duplicate Detection
- Aynı öğrencinin aynı oturumda birden fazla yoklama alması

### 3. Statistical Anomaly Detection
- Isolation Forest algoritması ile istatistiksel anomali tespiti
- Saat, dakika ve haftanın günü bazlı patern analizi

## 📝 Notlar

- AI servisi çalışmadan frontend çalışabilir, ancak anomali tespiti özelliği kullanılamaz
- Production ortamında CORS ayarlarını güvenli hale getirin
- Firebase güvenlik kurallarını production için yapılandırın

## 🛠️ Teknolojiler

- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Realtime Database)
- **AI Service**: FastAPI, scikit-learn, pandas, numpy
- **QR Code**: html5-qrcode, qrcodejs

