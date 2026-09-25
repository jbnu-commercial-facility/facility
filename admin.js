import { db, auth } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_PASS = "0075";

const loginContainer = document.getElementById("admin-login-container");
const dashboardContainer = document.getElementById("admin-dashboard-container");
const loginBtn = document.getElementById("admin-login-btn");
const passInput = document.getElementById("admin-password");
const loginError = document.getElementById("admin-login-error");
const logoutBtn = document.getElementById("admin-logout-btn");
const content = document.getElementById("admin-reservations-content");

const facMap = {
    "seminar": "세미나실",
    "reading": "열람실",
    "pc": "PC실",
    "study": "스터디룸"
};

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        if (passInput.value === ADMIN_PASS) {
            loginContainer.classList.add("hidden");
            dashboardContainer.classList.remove("hidden");
            loadReservations();
        } else {
            loginError.classList.remove("hidden");
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        dashboardContainer.classList.add("hidden");
        loginContainer.classList.remove("hidden");
        passInput.value = "";
        loginError.classList.add("hidden");
    });
}

async function loadReservations() {
    try {
        content.innerHTML = `<p class="text-center text-slate-500 py-4">불러오는 중...</p>`;
        const snap = await getDocs(collection(db, "reservations"));
        
        if (snap.empty) {
            content.innerHTML = `<p class="text-center text-slate-500 py-4">예약 내역이 없습니다.</p>`;
            return;
        }

        content.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border divide-y">
                ${snap.docs.map(d => {
                    const r = d.data();
                    const isCan = r.status === 'cancelled';
                    return `
                        <div class="p-4 flex justify-between items-center">
                            <div>
                                <span class="text-xs px-2 py-0.5 rounded-full ${isCan ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}">${isCan ? '취소됨' : '확정'}</span>
                                <h4 class="font-bold text-slate-800 mt-1">${facMap[r.facilityId] \vert{}\vert{} '시설'} (${r.date} ${r.startTime} -${r.endTime})</h4>
                                <p class="text-xs text-slate-500">${r.name} /${r.studentId} / ${r.department} /${r.phone}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<p class="text-center text-red-500">오류 발생</p>`;
    }
}