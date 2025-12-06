from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import httpx
import json

app = FastAPI(title="AttendAI - Anomaly Detection Service")

# CORS ayarları (frontend'den erişim için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production'da spesifik domain'ler eklenmeli
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase yapılandırması
FIREBASE_DB_URL = "https://cloudproject-19452-default-rtdb.firebaseio.com"

# ==========================================================
# 📊 VERİ MODELLERİ
# ==========================================================
class AttendanceRecord(BaseModel):
    studentId: str
    studentName: str
    lecture: str
    timestamp: str

class AnomalyResult(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    anomaly_type: str
    reason: str
    severity: str  # "low", "medium", "high"

class DetectionRequest(BaseModel):
    session_id: Optional[str] = None
    student_id: Optional[str] = None
    limit: Optional[int] = 100

# ==========================================================
# 🔥 FIREBASE VERİ ÇEKME
# ==========================================================
async def fetch_attendance_data(session_id: Optional[str] = None, student_id: Optional[str] = None) -> List[Dict]:
    """Firebase'den attendance verilerini çeker"""
    try:
        url = f"{FIREBASE_DB_URL}/katilimlar.json"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        if not data:
            return []
        
        records = []
        for session_id_key, students in data.items():
            if not students:
                continue
            
            # Belirli bir session_id filtresi
            if session_id and session_id_key != session_id:
                continue
            
            for student_id_key, record in students.items():
                # Belirli bir student_id filtresi
                if student_id and student_id_key != student_id:
                    continue
                
                if isinstance(record, dict):
                    record['sessionId'] = session_id_key
                    records.append(record)
        
        return records
    except Exception as e:
        print(f"Firebase veri çekme hatası: {e}")
        return []

async def fetch_session_data(session_id: str) -> Optional[Dict]:
    """Belirli bir yoklama oturumunun bilgilerini çeker"""
    try:
        url = f"{FIREBASE_DB_URL}/yoklamalar/{session_id}.json"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        
        return data
    except Exception as e:
        print(f"Session veri çekme hatası: {e}")
        return None

# ==========================================================
# 🤖 ANOMALY DETECTION ALGORİTMALARI
# ==========================================================
def detect_time_anomaly(record: Dict, session_data: Optional[Dict] = None) -> Optional[AnomalyResult]:
    """Zaman bazlı anomali tespiti"""
    try:
        record_time = datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00'))
        record_hour = record_time.hour
        record_minute = record_time.minute
        
        # Normal ders saatleri (08:00 - 18:00 arası)
        if record_hour < 8 or record_hour >= 18:
            return AnomalyResult(
                is_anomaly=True,
                anomaly_score=0.8,
                anomaly_type="time_anomaly",
                reason=f"Yoklama normal ders saatleri dışında alındı (Saat: {record_hour:02d}:{record_minute:02d})",
                severity="high"
            )
        
        # Session başlangıç zamanı ile karşılaştırma
        if session_data and 'startTime' in session_data:
            try:
                session_start = datetime.fromisoformat(session_data['startTime'].replace('Z', '+00:00'))
                time_diff = (record_time - session_start).total_seconds() / 60  # dakika cinsinden
                
                # Çok erken yoklama (oturum başlamadan 5 dakika önce)
                if time_diff < -5:
                    return AnomalyResult(
                        is_anomaly=True,
                        anomaly_score=0.9,
                        anomaly_type="early_attendance",
                        reason=f"Yoklama oturum başlamadan {abs(time_diff):.1f} dakika önce alındı",
                        severity="high"
                    )
                
                # Çok geç yoklama (oturum başladıktan 30 dakika sonra)
                if time_diff > 30:
                    return AnomalyResult(
                        is_anomaly=True,
                        anomaly_score=0.7,
                        anomaly_type="late_attendance",
                        reason=f"Yoklama oturum başladıktan {time_diff:.1f} dakika sonra alındı",
                        severity="medium"
                    )
            except Exception as e:
                print(f"Zaman karşılaştırma hatası: {e}")
        
        return None
    except Exception as e:
        print(f"Zaman anomali tespiti hatası: {e}")
        return None

def detect_duplicate_anomaly(record: Dict, all_records: List[Dict]) -> Optional[AnomalyResult]:
    """Aynı öğrencinin aynı oturumda birden fazla yoklama alması"""
    session_id = record.get('sessionId', '')
    student_id = record.get('studentId', '')
    
    if not session_id or not student_id:
        return None
    
    # Aynı session ve student için kayıt sayısı
    duplicate_count = sum(
        1 for r in all_records
        if r.get('sessionId') == session_id and r.get('studentId') == student_id
    )
    
    if duplicate_count > 1:
        return AnomalyResult(
            is_anomaly=True,
            anomaly_score=0.95,
            anomaly_type="duplicate_attendance",
            reason=f"Öğrenci aynı oturumda {duplicate_count} kez yoklama aldı",
            severity="high"
        )
    
    return None

def detect_statistical_anomaly(records: List[Dict]) -> List[AnomalyResult]:
    """İstatistiksel anomali tespiti (Isolation Forest)"""
    if len(records) < 3:
        return []
    
    try:
        # Veriyi hazırla
        df = pd.DataFrame(records)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['hour'] = df['timestamp'].dt.hour
        df['minute'] = df['timestamp'].dt.minute
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Özellik vektörü oluştur
        features = df[['hour', 'minute', 'day_of_week']].values
        
        # Isolation Forest ile anomali tespiti
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        anomaly_labels = iso_forest.fit_predict(features)
        anomaly_scores = iso_forest.score_samples(features)
        
        results = []
        for idx, (label, score) in enumerate(zip(anomaly_labels, anomaly_scores)):
            if label == -1:  # Anomali tespit edildi
                normalized_score = abs(score) / max(abs(anomaly_scores))
                
                results.append(AnomalyResult(
                    is_anomaly=True,
                    anomaly_score=min(normalized_score, 1.0),
                    anomaly_type="statistical_anomaly",
                    reason=f"İstatistiksel olarak sıra dışı yoklama paterni tespit edildi (Skor: {normalized_score:.2f})",
                    severity="medium" if normalized_score < 0.7 else "high"
                ))
            else:
                results.append(AnomalyResult(
                    is_anomaly=False,
                    anomaly_score=0.0,
                    anomaly_type="normal",
                    reason="Normal yoklama kaydı",
                    severity="low"
                ))
        
        return results
    except Exception as e:
        print(f"İstatistiksel anomali tespiti hatası: {e}")
        return []

# ==========================================================
# 🎯 ANA ANOMALY DETECTION FONKSİYONU
# ==========================================================
async def detect_anomalies(records: List[Dict]) -> List[Dict]:
    """Tüm anomali tespiti algoritmalarını çalıştırır"""
    if not records:
        return []
    
    results = []
    
    # Tüm session verilerini önceden çek
    session_ids = set(r.get('sessionId') for r in records if r.get('sessionId'))
    session_data_cache = {}
    for sid in session_ids:
        session_data_cache[sid] = await fetch_session_data(sid)
    
    for idx, record in enumerate(records):
        session_id = record.get('sessionId', '')
        session_data = session_data_cache.get(session_id)
        
        anomaly_detected = False
        anomaly_results = []
        
        # 1. Zaman bazlı anomali
        time_anomaly = detect_time_anomaly(record, session_data)
        if time_anomaly and time_anomaly.is_anomaly:
            anomaly_detected = True
            anomaly_results.append(time_anomaly)
        
        # 2. Duplicate anomali
        duplicate_anomaly = detect_duplicate_anomaly(record, records)
        if duplicate_anomaly and duplicate_anomaly.is_anomaly:
            anomaly_detected = True
            anomaly_results.append(duplicate_anomaly)
        
        # En yüksek skorlu anomaliyi seç
        if anomaly_results:
            primary_anomaly = max(anomaly_results, key=lambda x: x.anomaly_score)
            results.append({
                "record": record,
                "anomaly": primary_anomaly.dict()
            })
        else:
            results.append({
                "record": record,
                "anomaly": {
                    "is_anomaly": False,
                    "anomaly_score": 0.0,
                    "anomaly_type": "normal",
                    "reason": "Normal yoklama kaydı",
                    "severity": "low"
                }
            })
    
    # İstatistiksel anomali tespiti (tüm veri seti üzerinde)
    statistical_results = detect_statistical_anomaly(records)
    for idx, stat_result in enumerate(statistical_results):
        if stat_result.is_anomaly and results[idx]["anomaly"]["is_anomaly"] == False:
            # Eğer başka bir anomali tespit edilmediyse, istatistiksel sonucu kullan
            results[idx]["anomaly"] = stat_result.dict()
        elif stat_result.is_anomaly:
            # Eğer zaten bir anomali varsa, skorları birleştir
            current_score = results[idx]["anomaly"]["anomaly_score"]
            new_score = max(current_score, stat_result.anomaly_score)
            results[idx]["anomaly"]["anomaly_score"] = new_score
            results[idx]["anomaly"]["reason"] += f" | {stat_result.reason}"
    
    return results

# ==========================================================
# 🌐 API ENDPOINT'LERİ
# ==========================================================
@app.get("/")
def root():
    return {
        "status": "AI Anomaly Detection Service is Ready ✅",
        "version": "1.0.0",
        "algorithms": [
            "Time-based Anomaly Detection",
            "Duplicate Detection",
            "Statistical Anomaly Detection (Isolation Forest)"
        ]
    }

@app.post("/detect-anomalies")
async def detect_anomalies_endpoint(request: DetectionRequest):
    """Anomali tespiti yapar"""
    try:
        # Firebase'den veri çek
        records = await fetch_attendance_data(
            session_id=request.session_id,
            student_id=request.student_id
        )
        
        if not records:
            return {
                "message": "Veri bulunamadı",
                "anomalies": [],
                "total_records": 0,
                "anomaly_count": 0
            }
        
        # Limit uygula
        if request.limit:
            records = records[:request.limit]
        
        # Anomali tespiti yap
        results = await detect_anomalies(records)
        
        # Anomali sayısını hesapla
        anomaly_count = sum(1 for r in results if r["anomaly"]["is_anomaly"])
        
        return {
            "message": "Anomali tespiti tamamlandı",
            "total_records": len(records),
            "anomaly_count": anomaly_count,
            "anomaly_rate": f"{(anomaly_count / len(records) * 100):.2f}%",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomali tespiti hatası: {str(e)}")

@app.get("/health")
def health_check():
    """Servis sağlık kontrolü"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
