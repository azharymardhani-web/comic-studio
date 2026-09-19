// ==========================================
// AI DIGITAL COMIC STUDIO v1.0 — MTsN 14 JAKARTA
// Terintegrasi dengan Firebase Firestore & Auth
// ==========================================

const SUBJECTS = [
  "Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam (SKI)", 
  "Bahasa Arab", "Bahasa Indonesia", "Bahasa Inggris", "Matematika", 
  "Ilmu Pengetahuan Alam (IPA)", "Ilmu Pengetahuan Sosial (IPS)", 
  "Pendidikan Pancasila", "Informatika", "Seni Budaya", "PJOK", 
  "Prakarya", "Bahasa Daerah", "Bimbingan Konseling (BK)"
];

// State lokal aplikasi (untuk cache UI & fallback)
let state = {
  user: null,
  teachers: [],
  projects: [],
  chars: [
    { name: 'Pak Arif', role: 'Guru', desc: 'Guru MTs yang ramah, komunikatif, dan membimbing.' },
    { name: 'Raka', role: 'Siswa', desc: 'Siswa aktif, kritis, dan suka bertanya.' },
    { name: 'Siti', role: 'Siswa', desc: 'Siswa teliti, kolaboratif, dan reflektif.' }
  ],
  story: [],
  prompt: ''
};

const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);  // Fungsi navigasi UI function go(page) {   $$('.page').forEach(x => x.classList.remove('active'));
  $('#' + page).classList.add('active');   $$('nav button').forEach(x => x.classList.toggle('active', x.dataset.page === page));$('#pageTitle').textContent = page === 'admin' ? 'Manajemen Akun Guru' : page[0].toUpperCase() + page.slice(1);
  
  if (page === 'storyboard') renderStory();
  if (page === 'characters') renderChars();
  if (page === 'prompt') $('#promptBox').value = state.prompt;
  if (page === 'editor') renderComic();
  if (page === 'projects') loadProjectsFromFirebase(); // Muat data terbaru dari Firebase
}

function fillSubjects() {
  let opts = SUBJECTS.map(x => `<option>${x}</option>`).join('');
  $('#subject').innerHTML = opts;
  $('#teacherSubject').innerHTML = opts;
}

// ==========================================
// FIREBASE SYNC & AUTHENTICATION LOGIC
// ==========================================

async function initFirebaseSync() {
  if (!window.db) {
    console.warn("Firebase belum dimuat. Menggunakan mode offline/localStorage.");
    loadFallbackData();
    return;
  }

  try {
    const { collection, getDocs, doc, setDoc } = window.firebaseModules;
    
    // 1. Cek & Inisialisasi Akun Default Administrator jika database kosong
    const teachersSnap = await getDocs(collection(window.db, "teachers"));
    if (teachersSnap.empty) {
      const defaultAdmin = {
        id: 'admin_utama',
        name: 'Administrator',
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        subject: 'Administrator',
        grade: 'VII–IX',
        active: true
      };
      await setDoc(doc(window.db, "teachers", defaultAdmin.id), defaultAdmin);
    }

    // Muat data Guru dari Firestore
    await loadTeachersFromFirebase();
    // Muat data Proyek dari Firestore
    await loadProjectsFromFirebase();

  } catch (e) {
    console.error("Gagal sinkronisasi dengan Firebase:", e);
    loadFallbackData();
  }
}

async function loadTeachersFromFirebase() {
  if (!window.db) return;
  try {
    const { collection, getDocs } = window.firebaseModules;
    const querySnapshot = await getDocs(collection(window.db, "teachers"));
    state.teachers = [];
    querySnapshot.forEach((docSnap) => {
      state.teachers.push(docSnap.data());
    });
    renderTeachers();
    updateStats();
  } catch (e) {
    console.error("Gagal memuat guru:", e);
  }
}

async function loadProjectsFromFirebase() {
  if (!window.db) {
    renderProjects();
    return;
  }
  try {
    const { collection, getDocs } = window.firebaseModules;
    const querySnapshot = await getDocs(collection(window.db, "projects"));
    state.projects = [];
    querySnapshot.forEach((docSnap) => {
      state.projects.push(docSnap.data());
    });
    // Urutkan berdasarkan waktu terbaru jika ada
    state.projects.sort((a, b) => b.id - a.id);
    renderProjects();
    updateStats();
  } catch (e) {
    console.error("Gagal memuat proyek:", e);
    renderProjects();
  }
}

function loadFallbackData() {
  const KEY = 'mtsn14_comic_v1';
  let saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (saved) {
    state.teachers = saved.teachers || [];
    state.projects = saved.projects || [];
  } else {
    state.teachers = [{ id: 1, name: 'Administrator', username: 'admin', password: 'admin123', role: 'admin', subject: 'Administrator', grade: 'VII–IX', active: true }];
  }
  renderTeachers();
  updateStats();
}

function doLogin(user) {
  state.user = user;
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#roleBadge').textContent = user.role === 'admin' ? 'ADMIN' : user.subject;
  $('#adminNav').style.display = user.role === 'admin' ? 'block' : 'none';
  $('#accountInfo').textContent = user.role === 'admin' ? 'Administrator — Anda dapat mengelola seluruh akun guru.' : `${user.name} — ${user.subject} — Kelas ${user.grade}`;
  renderTeachers();
  updateStats();
}

$('#loginForm').onsubmit = e => {
  e.preventDefault();
  let u = $('#username').value.trim();
  let p = $('#password').value;
  let x = state.teachers.find(t => t.username === u && t.password === p && t.active);
  if (x) {
    doLogin(x);
  } else {
    alert('Username/password salah atau akun nonaktif.');
  }
};

$('#logout').onclick = () => {   state.user = null;   location.reload(); };  $$('nav button').forEach(b => b.onclick = () => go(b.dataset.page));

// ==========================================
// GENERATOR & EDITING LOGIC
// ==========================================

$('#generate').onclick = () => {
  let n = +$('#panelCount').value, 
      title = $('#title').value || 'Materi Pembelajaran', 
      mat = $('#material').value;
  let beats = ['Pembuka', 'Masalah Kontekstual', 'Konsep Utama', 'Eksplorasi', 'Analisis', 'Penerapan', 'Solusi', 'Kolaborasi', 'Diskusi', 'Refleksi', 'HOTS', 'Penutup'];
  
  state.story = Array.from({ length: n }, (_, i) => ({
    no: i + 1,
    beat: beats[i] || 'Bagian ' + (i + 1),
    scene: `Karakter membahas ${title} berdasarkan materi: ${mat.slice(0, 180)}...`,
    dialog: i === n - 1 ? 'Apa yang dapat kamu simpulkan dan terapkan?' : `Bagaimana cara menerapkan konsep ${title} dalam situasi nyata?`
  }));
  
  state.prompt = makePrompt();
  go('storyboard');
  alert('Storyboard berhasil dibuat.');
};

function makePrompt() {
  return `[MASTER PROMPT — MTsN 14 JAKARTA AI DIGITAL COMIC STUDIO v1.0]

SUBJECT: ${$('#subject').value}
GRADE: ${$('#grade').value}
TITLE: ${$('#title').value}
LEARNING OBJECTIVE: ${$('#objective').value}
MATERIAL: ${$('#material').value}
VISUAL STYLE: ${$('#visualStyle').value}
DIALOG LANGUAGE: ${$('#language').value}
TONE: ${$('#tone').value}

CHARACTER CONSISTENCY:
${state.chars.map(c => `- ${c.name} (${c.role}):${c.desc}`).join('\n')}

STORYBOARD:
${state.story.map(p => `Panel ${p.no} —${p.beat}\nScene: ${p.scene}\nDialogue:${p.dialog}`).join('\n\n')}

VISUAL RULES:
- Consistent character identity, clothing, age and proportions across all panels.
- Indonesian MTs classroom and school environment.
- Accurate educational content and clear visual storytelling.
- Keep supplied dialogue in the selected language.
- Respectful school and madrasah context.
- No watermark, random logos, distorted faces or hands.
- Sequential panels must connect naturally.
- End with reflection/HOTS.
- Print-friendly composition.`;
}

function renderStory() {
  let box = $('#storyList');
  box.innerHTML = state.story.length ? state.story.map((p, i) => `
    <div class="panel">
      <b>Panel ${p.no} — ${p.beat}</b>
      <input value="${esc(p.scene)}" data-i="${i}" data-k="scene">
      <textarea data-i="${i}" data-k="dialog">${esc(p.dialog)}</textarea>
    </div>
  `).join('') : '<div class="card">Belum ada storyboard. Buat dari Comic Generator.</div>';
  
  $$('#storyList [data-i]').forEach(e => e.oninput = () => {
    state.story[+e.dataset.i][e.dataset.k] = e.value;
    state.prompt = makePrompt();
  });
}

function renderChars() {
  let box = $('#charactersList');
  box.innerHTML = state.chars.map((c, i) => `
    <div class="char">
      <b>${esc(c.name)}</b>
      <input value="${esc(c.name)}" data-i="${i}" data-k="name">
      <input value="${esc(c.role)}" data-i="${i}" data-k="role">
      <textarea data-i="${i}" data-k="desc">${esc(c.desc)}</textarea>
      <button class="danger" onclick="deleteChar(${i})">Hapus</button>
    </div>
  `).join('');
  
  $$('#charactersList [data-i]').forEach(e => e.oninput = () => {
    state.chars[+e.dataset.i][e.dataset.k] = e.value;
    state.prompt = makePrompt();
  });
}

function deleteChar(i) {
  state.chars.splice(i, 1);
  renderChars();
}

$('#addCharacter').onclick = () => {
  state.chars.push({ name: 'Karakter Baru', role: 'Siswa', desc: 'Deskripsi visual dan sifat karakter.' });
  renderChars();
};

$('#copyPrompt').onclick = () => {
  navigator.clipboard.writeText($('#promptBox').value);
  alert('Prompt disalin.');
};

// Simpan Proyek ke Firebase Firestore
$('#saveProject').onclick = async () => {
  let newProject = {
    id: Date.now(),
    title: $('#title').value,
    subject: $('#subject').value,
    grade: $('#grade').value,
    panels: state.story.length,
    prompt: state.prompt,
    author: state.user ? state.user.name : 'Unknown',
    date: new Date().toLocaleString('id-ID')
  };

  if (window.db) {
    try {
      const { doc, setDoc } = window.firebaseModules;
      await setDoc(doc(window.db, "projects", String(newProject.id)), newProject);
      alert('Proyek berhasil disimpan ke Firebase Database!');
    } catch (e) {
      console.error("Gagal simpan ke Firebase:", e);
      alert('Gagal menyimpan ke database online, disimpan secara lokal.');
    }
  }

  state.projects.unshift(newProject);
  updateStats();
  renderProjects();
};

function renderComic() {
  $('#comicCanvas').innerHTML = state.story.length ? state.story.map(p => `
    <div class="comic">
      <b>Panel ${p.no}</b>
      <p>ILUSTRASI PANEL</p>
      <div class="bubble">${esc(p.dialog)}</div>
    </div>
  `).join('') : '<div class="comic">Belum ada storyboard.</div>';
}

function renderProjects() {
  $('#projectList').innerHTML = state.projects.length ? state.projects.map(p => `
    <div class="project">
      <div>
        <b>${esc(p.title)}</b>
        <small>${esc(p.subject)} · Kelas ${p.grade} · ${p.panels} panel · Oleh: ${esc(p.author || 'Admin')} · ${p.date}</small>
      </div>
    </div>
  `).join('') : '<div class="card">Belum ada proyek tersimpan.</div>';
}

function updateStats() {
  $('#statProjects').textContent = state.projects.length;
  $('#statPanels').textContent = state.projects.reduce((a, p) => a + p.panels, 0);
}

// ==========================================
// MANAJEMEN AKUN GURU (ADMIN)
// ==========================================

$('#createTeacher').onclick = async () => {
  let name = $('#teacherName').value.trim(),
      u = $('#teacherUsername').value.trim(),
      pw = $('#teacherPassword').value,
      sub = $('#teacherSubject').value,
      g = $('#teacherGrade').value;
      
  if (!name || !u || !pw) return alert('Lengkapi data akun guru.');
  if (state.teachers.some(x => x.username === u)) return alert('Username sudah digunakan.');
  
  let newTeacher = {
    id: 'teacher_' + Date.now(),
    name,
    username: u,
    password: pw,
    role: 'teacher',
    subject: sub,
    grade: g,
    active: true
  };

  if (window.db) {
    try {
      const { doc, setDoc } = window.firebaseModules;
      await setDoc(doc(window.db, "teachers", newTeacher.id), newTeacher);
    } catch (e) {
      console.error("Gagal simpan akun guru ke Firebase:", e);
    }
  }

  state.teachers.push(newTeacher);
  $('#teacherName').value = '';
  $('#teacherUsername').value = '';
  $('#teacherPassword').value = '';
  renderTeachers();
  alert('Akun guru berhasil dibuat.');
};

function renderTeachers() {
  let rows = state.teachers.filter(x => x.role === 'teacher');
  $('#teacherTable').innerHTML = rows.map(t => `
    <tr>
      <td>${esc(t.name)}</td>
      <td>${esc(t.username)}</td>
      <td>${esc(t.subject)}</td>
      <td>${t.grade}</td>
      <td>${t.active ? 'Aktif' : 'Nonaktif'}</td>
      <td>
        <button class="mini" onclick="toggleTeacher('${t.id}')">${t.active ? 'Nonaktifkan' : 'Aktifkan'}</button> 
        <button class="danger" onclick="deleteTeacher('${t.id}')">Hapus</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6">Belum ada akun guru.</td></tr>';
}

async function toggleTeacher(id) {
  let t = state.teachers.find(x => x.id == id);
  if (t) {
    t.active = !t.active;
    if (window.db) {
      try {
        const { doc, updateDoc } = window.firebaseModules;
        // Opsional update ke firestore jika modul diimport, atau setDoc ulang
        const { setDoc } = window.firebaseModules;
        await setDoc(doc(window.db, "teachers", String(t.id)), t);
      } catch (e) { console.error(e); }
    }
    renderTeachers();
  }
}

async function deleteTeacher(id) {
  if (confirm('Hapus akun guru ini?')) {
    state.teachers = state.teachers.filter(x => x.id != id);
    if (window.db) {
      try {
        const { doc, deleteDoc } = window.firebaseModules;
        await deleteDoc(doc(window.db, "teachers", String(id)));
      } catch (e) { console.error(e); }
    }
    renderTeachers();
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// Inisialisasi Awal
fillSubjects();
initFirebaseSync();
if (state.user) doLogin(state.user);
