import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const container = document.getElementById('main-container');

export function renderAdminLogin() {
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-white rounded-2xl shadow-sm border p-8 mt-10">
            <h2 class="text-xl font-bold mb-1">관리자 인증</h2>
            <p class="text-xs text-slate-500 mb-6">비밀번호를 입력하세요.</p>
            <form id="admin-form" class="space-y-4">
                <input type="password" id="admin-pw" required placeholder="0075" class="w-full px-4 py-3 border rounded-xl text-center tracking-widest text-sm">
                <button type="submit" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm">로그인</button>
            </form>
            <button onclick="location.reload()" class="w-full mt-3 text-xs text-slate-400 py-2">돌아가기</button>
        </div>
    `;
    document.getElementById('admin-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('admin-pw').value === "0075") {
            renderAdminDashboard();
        } else {
            alert("비밀번호가 틀렸습니다.");
        }
    });
}

async function renderAdminDashboard() {
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-slate-900">관리자 대시보드</h2>
            <button onclick="location.reload()" class="text-xs bg-slate-200 px-3 py-2 rounded-xl">로그아웃</button>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-6">
            <button id="tab-res" class="py-3 rounded-xl font-bold text-sm bg-slate-900 text-white">전체 예약 현황</button>
            <button id="tab-fac" class="py-3 rounded-xl font-bold text-sm bg-white border text-slate-700">시설 관리</button>
        </div>
        <div id="admin-content" class="space-y-4"></div>
    `;

    document.getElementById('tab-res').addEventListener('click', (e) => {
        e.target.className = "py-3 rounded-xl font-bold text-sm bg-slate-900 text-white";
        document.getElementById('tab-fac').className = "py-3 rounded-xl font-bold text-sm bg-white border text-slate-700";
        loadReservations();
    });
    document.getElementById('tab-fac').addEventListener('click', (e) => {
        e.target.className = "py-3 rounded-xl font-bold text-sm bg-slate-900 text-white";
        document.getElementById('tab-res').className = "py-3 rounded-xl font-bold text-sm bg-white border text-slate-700";
        loadFacilities();
    });

    loadReservations();
}

async function loadReservations() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `<p class="text-center text-slate-400 py-10">불러오는 중...</p>`;
    try {
        const facSnap = await getDocs(collection(db, "facilities"));
        const facMap = {};
        facSnap.forEach(f => facMap[f.id] = f.data().name);

        const snap = await getDocs(collection(db, "reservations"));
        if (snap.empty) {
            content.innerHTML = `<div class="bg-white p-6 rounded-2xl border text-center text-slate-400">예약 내역이 없습니다.</div>`;
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
                                <h4 class="font-bold text-slate-800 mt-1">${facMap[r.facilityId] \vert{}\vert{} '시설'} (${r.date} ${r.startTime}~${r.endTime})</h4>
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

async function loadFacilities() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <h3 class="font-bold text-base mb-4">+ 새 시설 추가</h3>
            <form id="add-fac-form" class="space-y-3">
                <input type="text" id="af-name" required placeholder="시설명 (예: 스터디룸 A)" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <input type="text" id="af-desc" placeholder="설명" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <input type="number" id="af-cap" required placeholder="수용 인원" class="w-full px-4 py-2.5 border rounded-xl text-sm">
                <div class="flex gap-2">
                    <input type="time" id="af-open" value="09:00" required class="w-1/2 px-4 py-2.5 border rounded-xl text-sm">
                    <input type="time" id="af-close" value="18:00" required class="w-1/2 px-4 py-2.5 border rounded-xl text-sm">
                </div>
                <button type="submit" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm">시설 등록</button>
            </form>
        </div>
        <div id="fac-manage-list" class="space-y-3"></div>
    `;

    const list = document.getElementById('fac-manage-list');
    const snap = await getDocs(collection(db, "facilities"));
    list.innerHTML = '';
    snap.forEach(d => {
        const f = { id: d.id, ...d.data() };
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl shadow-sm border p-4 flex justify-between items-center";
        card.innerHTML = `
            <div>
                <h4 class="font-bold text-slate-800">${f.name} <span class="text-xs font-normal text-slate-400">(${f.active ? '활성' : '비활성'})</span></h4>
                <p class="text-xs text-slate-500">${f.openingTime}~${f.closingTime} / 수용 ${f.capacity}명</p>
            </div>
            <button class="toggle-btn px-3 py-1.5 rounded-xl text-xs font-medium border ${f.active ? 'border-red-200 text-red-700 bg-red-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}" data-id="${f.id}" data-active="${f.active}">
                ${f.active ? '비활성화' : '활성화'}
            </button>
        `;
        list.appendChild(card);
    });

    document.getElementById('add-fac-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const ref = doc(collection(db, "facilities"));
        await setDoc(ref, {
            facilityId: ref.id,
            name: document.getElementById('af-name').value,
            description: document.getElementById('af-desc').value,
            capacity: Number(document.getElementById('af-cap').value),
            image: "",
            openingTime: document.getElementById('af-open').value,
            closingTime: document.getElementById('af-close').value,
            active: true
        });
        alert("추가되었습니다.");
        loadFacilities();
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
            await updateDoc(doc(db, "facilities", ev.target.dataset.id), {
                active: ev.target.dataset.active !== 'true'
            });
            alert("상태가 변경되었습니다.");
            loadFacilities();
        });
    });
}