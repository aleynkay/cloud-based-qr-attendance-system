

// Firebase modüllerini import et
console.log("🔥 firebase.js yüklendi");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, push, set, get } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// ✅ Firebase yapılandırması
const firebaseConfig = {
    authDomain: "cloudproject-19452.firebaseapp.com",
    databaseURL: "https://cloudproject-19452-default-rtdb.firebaseio.com",
    projectId: "cloudproject-19452",
    storageBucket: "cloudproject-19452.appspot.com",
    messagingSenderId: "272815776316",
    appId: "1:272815776316:web:5bd116ad380533a3a4d939",
    measurementId: "G-CYZTS1BPH6"
};


// ✅ Bağlantıyı başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUserId = null;
let currentUserName = null;
let currentUserRole = null;

// ==========================================================
// 💡 ÇIKIŞ YAPMA FONKSİYONU
// ==========================================================
async function signOutUser() {
    try {
        await signOut(auth);
        alert("Başarıyla çıkış yapıldı!");
        // Çıkış yaptıktan sonra giriş sayfamız olan index.html'e yönlendiriyoruz
        window.location.href = "index.html";
    } catch (error) {
        console.error("Çıkış Hatası:", error);
        alert("Çıkış yapılırken bir hata oluştu: " + error.message);
    }
}
window.signOutUser = signOutUser;


// ==========================================================
// 💡 KULLANICI ROLÜNÜ AL VE YÖNLENDİR (Giriş/Kayıt sonrası)
// ==========================================================
async function getRoleAndNavigate(user) {
    try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUserRole = userData.role;
        } else {
            console.warn("Kullanıcı veritabanında bulunamadı. Rol atanıyor: student");
            currentUserRole = "student";
        }

        // Yönlendirme Mantığı
        const currentPath = window.location.pathname.split("/").pop();

        if (currentUserRole === 'teacher' && currentPath !== 'teacher.html') {
            console.log("Öğretmen giriş yaptı. teacher.html'e yönlendiriliyor.");
            window.location.href = "teacher.html";
        } else if (currentUserRole === 'student' && currentPath !== 'qr.html') {
            // Index.html'den geldiyse qr.html'e git.
            console.log("Öğrenci giriş yaptı. qr.html'e yönlendiriliyor.");
            window.location.href = "qr.html";
        } else {
            // Doğru sayfadaysa sayfada kal
            console.log(`Giriş başarılı. Mevcut sayfada kalınıyor (${currentUserRole}).`);
        }

        return true;
    } catch (error) {
        console.error("Rol okuma ve yönlendirme hatası:", error);
        return false;
    }
}


// ==========================================================
// 💡 E-POSTA/ŞİFRE İLE KAYDOLMA & GİRİŞ YAPMA (Aynı kalır)
// ==========================================================
async function signUpEmailPassword() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const role = document.getElementById("auth-role").value;

    if (!email || password.length < 6 || !role) {
        alert("Geçerli bir e-posta, minimum 6 karakterli bir şifre ve rol seçimi yapın.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await set(ref(db, `users/${user.uid}`), {
            email: user.email,
            role: role,
            createdAt: new Date().toISOString()
        });

        console.log(`Kullanıcı başarıyla kaydoldu (${role}):`, user.uid);
        alert(`✅ Kayıt başarılı! Rol: ${role}. Otomatik giriş yapıldı.`);

        // Başarılı kayıttan sonra yönlendir
        await getRoleAndNavigate(user);

        return true;
    } catch (error) {
        let errorMessage = "Kayıt Hatası: ";
        if (error.code === "auth/email-already-in-use") {
            errorMessage += "Bu e-posta adresi zaten kullanılıyor.";
        } else if (error.code === "auth/weak-password") {
            errorMessage += "Şifre çok zayıf (min 6 karakter).";
        } else {
            errorMessage += error.message;
        }
        alert(errorMessage);
        console.error("Kayıt Hatası:", error);
        return false;
    }
}

async function signInEmailPassword() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    if (!email || !password) {
        alert("Lütfen e-posta ve şifrenizi girin.");
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Kullanıcı başarıyla giriş yaptı:", userCredential.user.uid);
        alert("✅ Giriş başarılı!");

        // Başarılı girişten sonra yönlendir
        await getRoleAndNavigate(userCredential.user);

        return true;
    } catch (error) {
        let errorMessage = "Giriş Hatası: ";
        if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            errorMessage += "Geçersiz e-posta veya şifre.";
        } else {
            errorMessage += error.message;
        }
        alert(errorMessage);
        console.error("Giriş Hatası:", error);
        return false;
    }
}

// ==========================================================
// 💡 KULLANICI DURUMUNU İZLEME VE YETKİLENDİRME
// ==========================================================
onAuthStateChanged(auth, async (user) => {
    // 💡 Yeni: Tüm sayfalar için ortak UI elementlerini tanımla
    const loginStatusElement = document.getElementById("login-status");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const roleSelect = document.getElementById("auth-role");
    const signInButtonDiv = document.getElementById("sign-in-buttons"); // index.html'deki div
    const signOutButton = document.getElementById("sign-out-button");


    // Hangi sayfada olduğumuzu belirle
    const currentPath = window.location.pathname.split("/").pop();
    const isIndexPage = currentPath === 'index.html' || currentPath === '';
    const isScannerPage = currentPath === 'qr.html';
    const isTeacherPage = currentPath === 'teacher.html';

    if (user) {
        currentUserId = user.uid;
        currentUserName = user.email.split("@")[0] || "Bilinmeyen Kullanıcı";

        // Rolü al 
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        currentUserRole = snapshot.exists() ? snapshot.val().role : "student";

        // 💡 Eğer kullanıcı giriş yaptıysa ve index.html'deyse, yönlendir
        if (isIndexPage) {
            getRoleAndNavigate(user);
            return; // Yönlendirme yapıldı, daha fazla işlem yapmaya gerek yok
        }

        // UI Güncelleme (Giriş Formu)
        if (loginStatusElement) {
            loginStatusElement.innerText = `Oturum: ${currentUserName} (${currentUserRole.toUpperCase()})`;
            loginStatusElement.classList.remove("text-red-500");
            loginStatusElement.classList.add("text-green-500");
        }

        // 💡 Oturum açma formunu gizle, çıkış butonunu göster (Eğer formlar bu sayfalarda varsa)
        if (signInButtonDiv) signInButtonDiv.style.display = "none";
        if (signOutButton) signOutButton.style.display = "block";


        // Sayfa Erişimi Kontrolü
        if (isScannerPage) {
            if (currentUserRole === 'student') {
                window.startQrCodeScanner(); // qr.html'e özgü fonksiyon
            } else {
                // Öğretmen yanlışlıkla buraya geldiyse
                document.getElementById("record-status").innerText = "❌ Yetkisiz: Bu sayfa sadece öğrenciler içindir. Lütfen teacher.html'e gidin.";
                window.stopQrCodeScanner();
            }
        }

        if (isTeacherPage) {
            const contentDiv = document.querySelector('.teacher-content');
            if (currentUserRole !== 'teacher') {
                // Öğrenci yanlışlıkla buraya geldiyse
                contentDiv.innerHTML = '<h2 class="text-2xl font-bold text-red-500">❌ Yetkisiz Erişim</h2><p class="text-gray-600 mt-2">Bu sayfa sadece Öğretmenler içindir.</p>';
            }
        }

    } else {
        currentUserId = null;
        currentUserName = null;
        currentUserRole = null;

        // 💡 Eğer kullanıcı çıkış yaptıysa ve index.html'de değilse, index.html'e yönlendir
        if (!isIndexPage) {
            window.location.href = "index.html";
            return;
        }

        // Index sayfasındaki UI Güncelleme (Giriş Formu)
        if (loginStatusElement) {
            loginStatusElement.innerText = "Lütfen Giriş Yapın";
            loginStatusElement.classList.remove("text-green-500");
            loginStatusElement.classList.add("text-red-500");
        }

        if (emailInput) emailInput.style.display = "block";
        if (passwordInput) passwordInput.style.display = "block";
        if (roleSelect) roleSelect.style.display = "block";
        if (signInButtonDiv) signInButtonDiv.style.display = "flex";
        if (signOutButton) signOutButton.style.display = "none";

        if (isScannerPage) window.stopQrCodeScanner();
    }
});

// Diğer fonksiyonlar (recordAttendance, generateQRCodeSession, testRealtime) aynı kalır.
// ==========================================================
// ✅ KATILIM KAYDI (QR'dan)
// ==========================================================
async function recordAttendance(qrCodeJson) {
    console.log("🔥 recordAttendance() tetiklendi. Veri:", qrCodeJson);

    if (!currentUserId || currentUserRole !== 'student') {
        document.getElementById("record-status").innerText = "❌ Hata: Sadece Öğrenci olarak giriş yapmış kullanıcılar yoklama alabilir!";
        return false;
    }

    try {
        const data = JSON.parse(qrCodeJson);
        const sessionId = data.id;
        const lectureName = data.lecture;

        if (data.type !== "attendance" || !sessionId) {
            throw new Error("Geçersiz QR kod formatı.");
        }

        const studentId = currentUserId;
        const studentName = currentUserName;

        const attendanceRecord = {
            studentId,
            studentName,
            lecture: lectureName,
            timestamp: new Date().toISOString()
        };

        await set(ref(db, `katilimlar/${sessionId}/${studentId}`), attendanceRecord);

        document.getElementById("record-status").innerText = `✅ Katılım Onaylandı! Ders: ${lectureName} (${studentName})`;
        console.log(`✅ Katılım kaydedildi: ${sessionId} - ${studentId}`);
        return true;

    } catch (err) {
        document.getElementById("record-status").innerText = `❌ Katılım Hatası: ${err.message}`;
        console.error("Katılım Kayıt Hatası:", err);
        return false;
    }
}
window.recordAttendance = recordAttendance;

// ==========================================================
// ✅ YOKLAMA OLUŞTURMA & QR ÜRETME
// ==========================================================
async function generateQRCodeSession() {
    console.log("🔥 generateQRCodeSession() tetiklendi");

    if (!currentUserId || currentUserRole !== 'teacher') {
        document.getElementById("status").innerText = "❌ Hata: Sadece Öğretmenler yoklama oturumu başlatabilir!";
        return;
    }

    const lectureName = document.getElementById("lectureName").value;
    if (!lectureName) {
        alert("Lütfen bir ders adı girin.");
        return;
    }

    const sessionId = crypto.randomUUID();
    const attendanceData = {
        sessionId,
        lecture: lectureName,
        teacherId: currentUserId,
        startTime: new Date().toISOString(),
        status: "ACTIVE"
    };

    try {
        await set(ref(db, `yoklamalar/${sessionId}`), attendanceData);
        document.getElementById("status").innerText = `✅ Oturum başarıyla kaydedildi: ${sessionId}`;

        const qrCodeContent = JSON.stringify({
            type: "attendance",
            id: sessionId,
            lecture: lectureName
        });

        document.getElementById("qrcode-placeholder").innerHTML = "";

        new QRCode(document.getElementById("qrcode-placeholder"), {
            text: qrCodeContent,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

    } catch (err) {
        document.getElementById("status").innerText = `❌ Hata: ${err.message}`;
        console.error("Firebase Hatası:", err);
    }
}
window.generateQRCodeSession = generateQRCodeSession;

// ==========================================================
// ✅ TEST YAZMA FONKSİYONU
// ==========================================================
function testRealtime() {
    console.log("🔥 testRealtime() tetiklendi");
    const dataRef = push(ref(db, "test-yoklamalar"));
    set(dataRef, {
        message: "Realtime Database bağlantısı başarılı 🎉",
        timestamp: new Date().toISOString()
    })
        .then(() => alert("✅ Realtime Database'e veri eklendi"))
        .catch(err => alert("❌ Hata: " + err.message));
}
window.testRealtime = testRealtime;

// ✅ Global e-posta/şifre fonksiyonları
window.signInEmailPassword = signInEmailPassword;
window.signUpEmailPassword = signUpEmailPassword;

// ==========================================================
// 🤖 AI ANOMALY DETECTION FONKSİYONU
// ==========================================================
const AI_SERVICE_URL = "http://localhost:8000"; // AI servis URL'i

async function detectAnomalies() {
    console.log("🤖 detectAnomalies() tetiklendi");

    if (!currentUserId || currentUserRole !== 'teacher') {
        alert("❌ Hata: Sadece Öğretmenler anomali tespiti yapabilir!");
        return;
    }

    const sessionIdInput = document.getElementById("session-id-input");
    const sessionId = sessionIdInput ? sessionIdInput.value.trim() : null;
    const statusElement = document.getElementById("anomaly-status");
    const resultsDiv = document.getElementById("anomaly-results");
    const summaryDiv = document.getElementById("anomaly-summary");
    const listDiv = document.getElementById("anomaly-list");

    if (statusElement) {
        statusElement.innerText = "⏳ AI anomali tespiti yapılıyor...";
        statusElement.classList.remove("text-gray-600", "text-red-500", "text-green-500");
        statusElement.classList.add("text-blue-500");
    }

    if (resultsDiv) {
        resultsDiv.classList.add("hidden");
    }

    try {
        const requestBody = {
            session_id: sessionId || null,
            student_id: null,
            limit: 100
        };

        const response = await fetch(`${AI_SERVICE_URL}/detect-anomalies`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (statusElement) {
            statusElement.innerText = `✅ Analiz tamamlandı! ${data.anomaly_count} anomali tespit edildi.`;
            statusElement.classList.remove("text-blue-500", "text-red-500");
            statusElement.classList.add("text-green-500");
        }

        // Özet istatistikleri göster
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                <p><strong>Toplam Kayıt:</strong> ${data.total_records}</p>
                <p><strong>Anomali Sayısı:</strong> <span class="text-red-600 font-bold">${data.anomaly_count}</span></p>
                <p><strong>Anomali Oranı:</strong> <span class="text-orange-600 font-bold">${data.anomaly_rate}</span></p>
            `;
        }

        // Anomali listesini göster
        if (listDiv && data.results) {
            listDiv.innerHTML = "";

            const anomalies = data.results.filter(r => r.anomaly.is_anomaly);
            
            if (anomalies.length === 0) {
                listDiv.innerHTML = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p class="text-green-700 font-semibold">✅ Anomali tespit edilmedi. Tüm kayıtlar normal görünüyor.</p>
                    </div>
                `;
            } else {
                anomalies.forEach((item, index) => {
                    const record = item.record;
                    const anomaly = item.anomaly;
                    
                    const severityColors = {
                        "low": "bg-yellow-50 border-yellow-300 text-yellow-800",
                        "medium": "bg-orange-50 border-orange-300 text-orange-800",
                        "high": "bg-red-50 border-red-300 text-red-800"
                    };

                    const severityColor = severityColors[anomaly.severity] || severityColors.medium;
                    const severityText = {
                        "low": "Düşük",
                        "medium": "Orta",
                        "high": "Yüksek"
                    };

                    const recordDate = new Date(record.timestamp);
                    const formattedDate = recordDate.toLocaleString("tr-TR");

                    const card = document.createElement("div");
                    card.className = `${severityColor} border rounded-lg p-4`;
                    card.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-lg">Anomali #${index + 1}</h4>
                            <span class="text-xs font-semibold px-2 py-1 rounded bg-white">
                                ${severityText[anomaly.severity]} Risk
                            </span>
                        </div>
                        <p class="text-sm mb-2"><strong>Öğrenci:</strong> ${record.studentName || record.studentId}</p>
                        <p class="text-sm mb-2"><strong>Ders:</strong> ${record.lecture || "Bilinmiyor"}</p>
                        <p class="text-sm mb-2"><strong>Tarih/Saat:</strong> ${formattedDate}</p>
                        <p class="text-sm mb-2"><strong>Anomali Tipi:</strong> ${anomaly.anomaly_type}</p>
                        <p class="text-sm mb-2"><strong>Skor:</strong> ${(anomaly.anomaly_score * 100).toFixed(1)}%</p>
                        <p class="text-sm font-semibold mt-3"><strong>Sebep:</strong> ${anomaly.reason}</p>
                    `;
                    listDiv.appendChild(card);
                });
            }
        }

        if (resultsDiv) {
            resultsDiv.classList.remove("hidden");
        }

        console.log("✅ Anomali tespiti başarılı:", data);

    } catch (error) {
        console.error("❌ Anomali tespiti hatası:", error);
        
        if (statusElement) {
            statusElement.innerText = `❌ Hata: ${error.message}. AI servisinin çalıştığından emin olun (${AI_SERVICE_URL})`;
            statusElement.classList.remove("text-blue-500", "text-green-500");
            statusElement.classList.add("text-red-500");
        }

        alert(`Anomali tespiti sırasında hata oluştu: ${error.message}\n\nAI servisinin çalıştığından emin olun:\n${AI_SERVICE_URL}`);
    }
}
window.detectAnomalies = detectAnomalies;