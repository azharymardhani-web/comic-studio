const SUBJECTS=["Al-Qur'an Hadis", "Akidah Akhlak", "Fikih", "Sejarah Kebudayaan Islam (SKI)", "Bahasa Arab", "Bahasa Indonesia", "Bahasa Inggris", "Matematika", "Ilmu Pengetahuan Alam (IPA)", "Ilmu Pengetahuan Sosial (IPS)", "Pendidikan Pancasila", "Informatika", "Seni Budaya", "PJOK", "Prakarya", "Bahasa Daerah", "Bimbingan Konseling (BK)"];
const KEY='mtsn14_comic_v1';
let state=JSON.parse(localStorage.getItem(KEY)||'null')||{
 user:null,
 teachers:[{id:1,name:'Administrator',username:'admin',password:'admin123',role:'admin',subject:'Administrator',grade:'VII–IX',active:true}],
 projects:[],
 chars:[
  {name:'Pak Arif',role:'Guru',desc:'Guru MTs yang ramah, komunikatif, dan membimbing.'},
  {name:'Raka',role:'Siswa',desc:'Siswa aktif, kritis, dan suka bertanya.'},
  {name:'Siti',role:'Siswa',desc:'Siswa teliti, kolaboratif, dan reflektif.'}
 ],
 story:[],prompt:''
};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function go(page){$$('.page').forEach(x=>x.classList.remove('active'));$('#'+page).classList.add('active');$$('nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('#pageTitle').textContent=page==='admin'?'Manajemen Akun Guru':page[0].toUpperCase()+page.slice(1);if(page==='storyboard')renderStory();if(page==='characters')renderChars();if(page==='prompt')$('#promptBox').value=state.prompt;if(page==='editor')renderComic();if(page==='projects')renderProjects()}
function fillSubjects(){let opts=SUBJECTS.map(x=>`<option>${x}</option>`).join('');$('#subject').innerHTML=opts;$('#teacherSubject').innerHTML=opts}
function doLogin(user){state.user=user;persist();$('#login').classList.add('hidden');$('#app').classList.remove('hidden');$('#roleBadge').textContent=user.role==='admin'?'ADMIN':user.subject;$('#adminNav').style.display=user.role==='admin'?'block':'none';$('#accountInfo').textContent=user.role==='admin'?'Administrator — Anda dapat mengelola seluruh akun guru.':`${user.name} — ${user.subject} — Kelas ${user.grade}`;renderTeachers();updateStats()}
$('#loginForm').onsubmit=e=>{e.preventDefault();let u=$('#username').value.trim(),p=$('#password').value,x=state.teachers.find(t=>t.username===u&&t.password===p&&t.active);if(x)doLogin(x);else alert('Username/password salah atau akun nonaktif.')};
$('#logout').onclick=()=>{state.user=null;persist();location.reload()};
$$('nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));
$('#generate').onclick=()=>{let n=+$('#panelCount').value,title=$('#title').value||'Materi Pembelajaran',mat=$('#material').value;let beats=['Pembuka','Masalah Kontekstual','Konsep Utama','Eksplorasi','Analisis','Penerapan','Solusi','Kolaborasi','Diskusi','Refleksi','HOTS','Penutup'];state.story=Array.from({length:n},(_,i)=>({no:i+1,beat:beats[i],scene:`Karakter membahas ${title} berdasarkan materi: ${mat.slice(0,180)}...`,dialog:i===n-1?'Apa yang dapat kamu simpulkan dan terapkan?':`Bagaimana cara menerapkan konsep ${title} dalam situasi nyata?`}));state.prompt=makePrompt();persist();go('storyboard');alert('Storyboard berhasil dibuat.')};
function makePrompt(){return `[MASTER PROMPT — MTsN 14 JAKARTA AI DIGITAL COMIC STUDIO v1.0]

SUBJECT: ${$('#subject').value}
GRADE: ${$('#grade').value}
TITLE: ${$('#title').value}
LEARNING OBJECTIVE: ${$('#objective').value}
MATERIAL: ${$('#material').value}
VISUAL STYLE: ${$('#visualStyle').value}
DIALOG LANGUAGE: ${$('#language').value}
TONE: ${$('#tone').value}

CHARACTER CONSISTENCY:
${state.chars.map(c=>`- ${c.name} (${c.role}): ${c.desc}`).join('\n')}

STORYBOARD:
${state.story.map(p=>`Panel ${p.no} — ${p.beat}
Scene: ${p.scene}
Dialogue: ${p.dialog}`).join('\n\n')}

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
function renderStory(){let box=$('#storyList');box.innerHTML=state.story.length?state.story.map((p,i)=>`<div class="panel"><b>Panel ${p.no} — ${p.beat}</b><input value="${esc(p.scene)}" data-i="${i}" data-k="scene"><textarea data-i="${i}" data-k="dialog">${esc(p.dialog)}</textarea></div>`).join(''):'<div class="card">Belum ada storyboard. Buat dari Comic Generator.</div>';$$('#storyList [data-i]').forEach(e=>e.oninput=()=>{state.story[+e.dataset.i][e.dataset.k]=e.value;state.prompt=makePrompt();persist()})}
function renderChars(){let box=$('#charactersList');box.innerHTML=state.chars.map((c,i)=>`<div class="char"><b>${esc(c.name)}</b><input value="${esc(c.name)}" data-i="${i}" data-k="name"><input value="${esc(c.role)}" data-i="${i}" data-k="role"><textarea data-i="${i}" data-k="desc">${esc(c.desc)}</textarea><button class="danger" onclick="deleteChar(${i})">Hapus</button></div>`).join('');$$('#charactersList [data-i]').forEach(e=>e.oninput=()=>{state.chars[+e.dataset.i][e.dataset.k]=e.value;state.prompt=makePrompt();persist()})}
function deleteChar(i){state.chars.splice(i,1);persist();renderChars()}
$('#addCharacter').onclick=()=>{state.chars.push({name:'Karakter Baru',role:'Siswa',desc:'Deskripsi visual dan sifat karakter.'});persist();renderChars()}
$('#copyPrompt').onclick=()=>{navigator.clipboard.writeText($('#promptBox').value);alert('Prompt disalin.')}
$('#saveProject').onclick=()=>{state.projects.unshift({id:Date.now(),title:$('#title').value,subject:$('#subject').value,grade:$('#grade').value,panels:state.story.length,prompt:state.prompt,date:new Date().toLocaleString('id-ID')});persist();updateStats();alert('Proyek tersimpan.')}
function renderComic(){$('#comicCanvas').innerHTML=state.story.length?state.story.map(p=>`<div class="comic"><b>Panel ${p.no}</b><p>ILUSTRASI PANEL</p><div class="bubble">${esc(p.dialog)}</div></div>`).join(''):'<div class="comic">Belum ada storyboard.</div>'}
function renderProjects(){$('#projectList').innerHTML=state.projects.length?state.projects.map(p=>`<div class="project"><div><b>${esc(p.title)}</b><small>${esc(p.subject)} · Kelas ${p.grade} · ${p.panels} panel · ${p.date}</small></div></div>`).join(''):'<div class="card">Belum ada proyek tersimpan.</div>'}
function updateStats(){$('#statProjects').textContent=state.projects.length;$('#statPanels').textContent=state.projects.reduce((a,p)=>a+p.panels,0)}
$('#createTeacher').onclick=()=>{let name=$('#teacherName').value.trim(),u=$('#teacherUsername').value.trim(),pw=$('#teacherPassword').value,sub=$('#teacherSubject').value,g=$('#teacherGrade').value;if(!name||!u||!pw)return alert('Lengkapi data akun guru.');if(state.teachers.some(x=>x.username===u))return alert('Username sudah digunakan.');state.teachers.push({id:Date.now(),name,username:u,password:pw,role:'teacher',subject:sub,grade:g,active:true});persist();$('#teacherName').value='';$('#teacherUsername').value='';$('#teacherPassword').value='';renderTeachers();alert('Akun guru berhasil dibuat.')};
function renderTeachers(){let rows=state.teachers.filter(x=>x.role==='teacher');$('#teacherTable').innerHTML=rows.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.username)}</td><td>${esc(t.subject)}</td><td>${t.grade}</td><td>${t.active?'Aktif':'Nonaktif'}</td><td><button class="mini" onclick="toggleTeacher(${t.id})">${t.active?'Nonaktifkan':'Aktifkan'}</button> <button class="danger" onclick="deleteTeacher(${t.id})">Hapus</button></td></tr>`).join('')||'<tr><td colspan="6">Belum ada akun guru.</td></tr>'}
function toggleTeacher(id){let t=state.teachers.find(x=>x.id===id);if(t){t.active=!t.active;persist();renderTeachers()}}
function deleteTeacher(id){if(confirm('Hapus akun guru ini?')){state.teachers=state.teachers.filter(x=>x.id!==id);persist();renderTeachers()}}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
fillSubjects();renderTeachers();updateStats();if(state.user)doLogin(state.user);
