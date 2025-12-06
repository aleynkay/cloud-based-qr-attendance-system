# AttendAI - Anomaly Detection Service

Bu servis, attendance (devam takip) sistemindeki anormal durumları tespit etmek için AI algoritmaları kullanır.

## 🚀 Kurulum

1. Python virtual environment oluşturun (zaten mevcut):
```bash
cd ai-service
python -m venv ../venv
```

2. Virtual environment'ı aktifleştirin:
```bash
# Windows
..\venv\Scripts\activate

# Linux/Mac
source ../venv/bin/activate
```

3. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

## 🏃 Çalıştırma

```bash
python main.py
```

Servis `http://localhost:8000` adresinde çalışacaktır.

## 📡 API Endpoints

### 1. Health Check
```
GET /health
```

### 2. Anomali Tespiti
```
POST /detect-anomalies
```

**Request Body:**
```json
{
  "session_id": "optional-session-id",
  "student_id": "optional-student-id",
  "limit": 100
}
```

**Response:**
```json
{
  "message": "Anomali tespiti tamamlandı",
  "total_records": 50,
  "anomaly_count": 5,
  "anomaly_rate": "10.00%",
  "results": [
    {
      "record": {
        "studentId": "...",
        "studentName": "...",
        "lecture": "...",
        "timestamp": "..."
      },
      "anomaly": {
        "is_anomaly": true,
        "anomaly_score": 0.85,
        "anomaly_type": "time_anomaly",
        "reason": "...",
        "severity": "high"
      }
    }
  ]
}
```

## 🤖 Kullanılan Algoritmalar

1. **Time-based Anomaly Detection**: Normal ders saatleri dışında veya oturum zamanlamasına uygun olmayan yoklamaları tespit eder.

2. **Duplicate Detection**: Aynı öğrencinin aynı oturumda birden fazla yoklama almasını tespit eder.

3. **Statistical Anomaly Detection (Isolation Forest)**: İstatistiksel olarak sıra dışı yoklama paternlerini tespit eder.

## 🔧 Yapılandırma

Firebase veritabanı URL'i `main.py` dosyasındaki `FIREBASE_DB_URL` değişkeninde tanımlıdır.

Frontend'deki AI servis URL'i `public_web/firebase.js` dosyasındaki `AI_SERVICE_URL` değişkeninde tanımlıdır (varsayılan: `http://localhost:8000`).

