import { db } from './firebase-config.js';
import { 
    collection, getDocs, doc, getDoc, setDoc, updateDoc, 
    query, where, runTransaction, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById('main-container');

function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function renderFacilityList() {
    container.innerHTML = `
        <div class="mb-6"><h2 class="text-2xl font-bold text-slate-900">시설 선택</h2><p class="text-sm text-slate-500 mt-1">이용할 시설을 선택해주세요. (당일 예약만 가능)</p></div>
        <div id="facility-grid" class="space-y-4"><p class="text-center text-slate-400 py-10">불러오는 중...</p></div>
    `;
    try {
        const snap = await getDocs(collection(db, "facilities"));
        const grid = document.getElementById('facility-grid');
        grid.innerHTML = '';
        if (snap.empty) {
            grid.innerHTML = `<p class="text-center text-slate-400 py-10">등록된 시설이 없습니다. 관리자 모드에서 시설을 추가해주세요.</p>`;
            return;
        }
        snap.forEach(docSnap => {
            const f = { id: docSnap.id, ...docSnap.data() };
            if (!f.active) return;
            const card = document.createElement('div');
            card.className = "bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4";
            card.innerHTML = `
                <div>
                    <span class="text-xs bg-red-100 text-red-800 font-semibold px-2.5 py-1 rounded-full">수용인원 ${f.capacity}명</span>
                    <h3 class="text-lg font-bold mt-2 text-slate-800">${f.name}</h3>
                    <p class="text-sm text-slate-500">${f.description || ''}</p>
                    <p class="text-xs text-slate-400 mt-2">운영시간: ${f.openingTime} ~ ${f.closingTime}</p>
                </div>
                <button class="w-full sm:w-auto bg-red-900 hover:bg-red-800 text-white font-medium px-5 py-2.5 rounded-xl transition text-sm select-btn" data-id="${f.id}">예약하기</button>
            `;
            grid.appendChild(card);
        });
        document.querySelectorAll('.select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => renderReservationScreen(e.target.dataset.id));
        });
    } catch (e) {
        container.innerHTML = `<p class="text-center text-red-500 py-10">오류가 발생했습니다.</p>`;
    }
}

async function renderReservationScreen(facilityId) {
    container.innerHTML = `<p class="text-center text-slate-400 py-10">시간표 확인 중...</p>`;
    const facilityDoc = await getDoc(doc(db, "facilities", facilityId));
    const facility = facilityDoc.data();
    const todayStr = getTodayDateString();

    const q = query(collection(db, "reservations"), where("facilityId", "==", facilityId), where("date", "==", todayStr), where("status", "==", "confirmed"));
    const resSnap = await getDocs(q);
    const reservedHours = new Set();
    resSnap.forEach(d => {
        let startH = parseInt(d.data().startTime.split(':')[0]);
        let endH = parseInt(d.data().endTime.split(':')[0]);
        for (let h = startH; h < endH; h++) reservedHours.add(`${String(h).padStart(2, '0')}:00`);
    });

    let openH = parseInt(facility.openingTime.split(':')[0]);
    let closeH = parseInt(facility.closingTime.split(':')[0]);
    const currentH = new Date().getHours();

    let slots = [];
    for (let h = openH; h < closeH; h++) {
        let t = `${String(h).padStart(2, '0')}:00`;
        let nt = `${String(h + 1).padStart(2, '0')}:00`;
        let isPast = h <= currentH;
        let isRes = reservedHours.has(t);
        slots.push({ startTime: t, endTime: nt, available: !isPast && !isRes, reason: isPast ? '지난 시간' : (isRes ? '예약됨' : '예약 가능') });
    }

    container.innerHTML = `
        <button id="back-btn" class="text-sm text-slate-500 mb-4">&larr; 시설 선택으로 돌아가기</button>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 class="text-xl font-bold text-slate-900">${facility.name} 예약</h2>
            <p class="text-xs text-slate-400 mt-1">오늘(${todayStr}) 연속 최대 2시간까지 선택 가능합니다.</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 class="font-bold text-base mb-4">시간 선택</h3>
            <div class="grid grid-cols-2 gap-3" id="slot-grid">
                ${slots.map(s => `
                    <button type="button" class="time-btn p-3 rounded-xl border text-sm flex justify-between items-center ${s.available ? 'bg-white hover:border-red-900' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}" data-start="${s.startTime}" data-end="${s.endTime}" ${!s.available ? 'disabled' : ''}>
                        <span>${s.startTime} ~${s.endTime}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full ${s.available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}">${s.reason}</span>
                    </button>
                `).join('')}
            </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 class="font-bold text-base mb-4">예약자 정보 입력</h3>
            <form id="res-form" class="space-y-4">
                <input type="text" id="r-name" required placeholder="이름" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <input type="text" id="r-sid" required placeholder="학번" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <input type="tel" id="r-phone" required placeholder="전화번호 (010-0000-0000)" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <select id="r-dept" required class="w-full px-4 py-2.5 border rounded-xl text-sm bg-white">
                    <option value="">학과 선택</option>
                    <option value="회계">회계학과</option>
                    <option value="무역">무역학과</option>
                    <option value="경영">경영학부</option>
                    <option value="경제">경제학부</option>
                </select>
                <div class="pt-2 border-t">
                    <label class="flex items-start gap-2 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox" id="r-agree" class="mt-0.5" required>
                        <span>[필수] 이용시간 최대 2시간, 당일 예약만 가능하며 이용 시작 1시간 전까지 취소 가능함을 확인했습니다.</span>
                    </label>
                </div>
                <button type="submit" class="w-full bg-red-900 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition">예약 완료하기</button>
            </form>
        </div>
    `;

    document.getElementById('back-btn').addEventListener('click', renderFacilityList);
    
    let selected = [];
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let start = btn.dataset.start;
            let end = btn.dataset.end;
            if (selected.length === 0) {
                selected = [{start, end}];
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('bg-red-50', 'border-red-950', 'text-red-900'));
                btn.classList.add('bg-red-50', 'border-red-950', 'text-red-900');
            } else if (selected.length === 1 && selected[0].end === start) {
                selected.push({start, end});
                btn.classList.add('bg-red-50', 'border-red-950', 'text-red-900');
            } else {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('bg-red-50', 'border-red-950', 'text-red-900'));
                selected = [{start, end}];
                btn.classList.add('bg-red-50', 'border-red-950', 'text-red-900');
            }
        });
    });

    document.getElementById('res-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selected.length === 0) return alert("이용할 시간을 선택해주세요.");
        const name = document.getElementById('r-name').value.trim();
        const studentId = document.getElementById('r-sid').value.trim();
        const phone = document.getElementById('r-phone').value.trim();
        const department = document.getElementById('r-dept').value;
        const startTime = selected[0].start;
        const endTime = selected[selected.length - 1].end;

        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(collection(db, "reservations"));
                tx.set(ref, {
                    facilityId, name, studentId, phone, department, 
                    date: todayStr, startTime, endTime, status: "confirmed", 
                    createdAt: serverTimestamp()
                });
            });

            renderSuccessScreen({
                facilityName: facility.name,
                date: todayStr, startTime, endTime,
                name, studentId, department, phone
            });
        } catch (err) {
            alert("예약 실패: 다른 사용자가 먼저 예약했습니다. 다른 시간을 선택해주세요.");
            renderReservationScreen(facilityId);
        }
    });
}

function renderSuccessScreen(data) {
    container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
            <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">&check;</div>
            <h2 class="text-2xl font-bold text-slate-900 mb-1">예약이 완료되었습니다!</h2>
            <p class="text-sm text-slate-500 mb-6">아래 예약 정보를 확인해주세요.</p>

            <div class="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6 border border-slate-100">
                <div class="flex justify-between"><span class="text-slate-400">시설명</span><span class="font-bold text-slate-800">${data.facilityName}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">날짜</span><span class="font-bold text-slate-800">${data.date}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">이용시간</span><span class="font-bold text-red-900">${data.startTime} ~ ${data.endTime}</span></div>
                <hr class="border-slate-200 my-1">
                <div class="flex justify-between"><span class="text-slate-400">예약자</span><span class="font-medium text-slate-800">${data.name} (${data.studentId})</span></div>
                <div class="flex justify-between"><span class="text-slate-400">학과</span><span class="font-medium text-slate-800">${data.department}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">전화번호</span><span class="font-medium text-slate-800">${data.phone}</span></div>
            </div>

            <div class="flex gap-3">
                <button id="go-home" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-xl transition text-sm">처음으로</button>
                <button id="go-my-res" class="flex-1 bg-red-900 hover:bg-red-800 text-white font-medium py-3 rounded-xl transition text-sm">내 예약 확인</button>
            </div>
        </div>
    `;

    document.getElementById('go-home').addEventListener('click', renderFacilityList);
    document.getElementById('go-my-res').addEventListener('click', renderMyReservationsScreen);
}

function renderMyReservationsScreen() {
    container.innerHTML = `
        <div class="mb-6"><h2 class="text-2xl font-bold text-slate-900">내 예약 확인</h2><p class="text-sm text-slate-500 mt-1">이름과 학번으로 조회합니다.</p></div>
        <div class="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <form id="lookup-form" class="space-y-4">
                <input type="text" id="l-name" required placeholder="이름" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <input type="text" id="l-sid" required placeholder="학번" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <button type="submit" class="w-full bg-red-900 text-white font-bold py-3 rounded-xl text-sm">조회하기</button>
            </form>
        </div>
        <div id="lookup-results" class="space-y-4"></div>
    `;

    document.getElementById('lookup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('l-name').value.trim();
        const sid = document.getElementById('l-sid').value.trim();
        const resDiv = document.getElementById('lookup-results');
        resDiv.innerHTML = `<p class="text-center text-slate-400 py-4">조회 중...</p>`;

        try {
            const q = query(collection(db, "reservations"), where("name", "==", name), where("studentId", "==", sid));
            const snap = await getDocs(q);
            if (snap.empty) {
                resDiv.innerHTML = `<div class="bg-white p-6 rounded-2xl border text-center text-slate-400">일치하는 예약 내역이 없습니다.</div>`;
                return;
            }

            const facSnap = await getDocs(collection(db, "facilities"));
            const facMap = {};
            facSnap.forEach(f => facMap[f.id] = f.data().name);

            resDiv.innerHTML = '';
            snap.forEach(docSnap => {
                const r = docSnap.data();
                const fName = facMap[r.facilityId] || "시설";
                const isCancelled = r.status === 'cancelled';

                let canCancel = false;
                if (!isCancelled) {
                    const now = new Date();
                    const [y, m, d] = r.date.split('-').map(Number);
                    const [sh, sm] = r.startTime.split(':').map(Number);
                    const startDt = new Date(y, m - 1, d, sh, sm);
                    if ((startDt - now) / (1000 * 60 * 60) >= 1) canCancel = true;
                }

                const card = document.createElement('div');
                card.className = "bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-3";
                card.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="text-xs px-2.5 py-1 rounded-full ${isCancelled ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}">${isCancelled ? '취소된 예약' : '예약 확정'}</span>
                        <span class="text-xs text-slate-400">${r.date}</span>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-slate-800">${fName}</h3>
                        <p class="text-sm text-red-900 font-bold mt-1">${r.startTime} ~ ${r.endTime}</p>
                        <p class="text-xs text-slate-500 mt-2">예약자: ${r.name} (${r.department} / ${r.phone})</p>
                    </div>
                    ${!isCancelled ? `
                        <div class="flex justify-between items-center pt-2 border-t">
                            <span class="text-xs text-slate-400">${canCancel ? '취소 가능합니다.' : '시작 1시간 전이 지나 취소할 수 없습니다.'}</span>
                            <button class="cancel-btn px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-medium hover:bg-red-50 hover:text-red-700 transition" data-id="${docSnap.id}" ${!canCancel ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>예약 취소</button>
                        </div>
                    ` : ''}
                `;
                resDiv.appendChild(card);
            });

            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', async (ev) => {
                    if (confirm("정말 예약을 취소하시겠습니까?")) {
                        await updateDoc(doc(db, "reservations", ev.target.dataset.id), { status: "cancelled" });
                        alert("예약이 취소되었습니다.");
                        document.getElementById('lookup-form').dispatchEvent(new Event('submit'));
                    }
                });
            });
        } catch (err) {
            resDiv.innerHTML = `<p class="text-center text-red-500">조회 중 오류가 발생했습니다.</p>`;
        }
    });
}

document.getElementById('nav-my-reservations').addEventListener('click', renderMyReservationsScreen);
document.getElementById('nav-admin').addEventListener('click', () => {
    import('./admin.js').then(m => m.renderAdminLogin());
});

renderFacilityList();