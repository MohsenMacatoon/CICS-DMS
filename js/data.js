/* data.js: sample data, browser storage, session, and access rules */
/* ---------- Seed data ---------- */
function seed(){
  const users = [
    {id:'u1', username:'records',    password:'admin123',   fullname:'Ana M. Reyes',       email:'records.cics@example.edu.ph', position:'Records Officer',       role:'admin', status:'active'},
    {id:'u2', username:'jdelacruz',  password:'faculty123', fullname:'Juan P. Dela Cruz',  email:'jdelacruz@example.edu.ph',    position:'Instructor I',          role:'user',  status:'active'},
    {id:'u3', username:'mgarcia',    password:'faculty123', fullname:'Maria L. Garcia',    email:'mgarcia@example.edu.ph',      position:'Assistant Professor II',role:'user',  status:'active'},
    {id:'u4', username:'nali',       password:'faculty123', fullname:'Norhana S. Ali',     email:'nali@example.edu.ph',         position:'Associate Professor I', role:'user',  status:'active'},
    {id:'u5', username:'rtorres',    password:'faculty123', fullname:'Ramon D. Torres',    email:'rtorres@example.edu.ph',      position:'Department Chairperson',role:'user',  status:'active'},
    {id:'u6', username:'glim',       password:'staff123',   fullname:'Grace A. Lim',       email:'glim@example.edu.ph',         position:'Administrative Aide',   role:'user',  status:'active'}
  ];
  const d = (id, title, ref, category, docDate, desc, visibility, tagged, status='active') =>
    ({id, title, refNo:ref, category, docDate, description:desc, visibility, tagged, status, hasFile:false, fileName:'', fileType:'', fileSize:0, uploadedBy:'u1', uploadedAt:docDate + 'T09:00:00'});
  const docs = [
    d('d1','Submission of Final Grades for the First Semester, AY 2026–2027','CICS Memo No. 014, s. 2026','memo','2026-09-22','Deadline and procedure for encoding and submitting final grades.','all',[]),
    d('d2','Schedule of Faculty Performance Evaluation','CICS Memo No. 011, s. 2026','memo','2026-08-18','Evaluation period and the forms to be accomplished by all faculty.','all',[]),
    d('d3','Guidelines on Classes During Suspension of Work','Memo No. 088, s. 2026','memo','2026-07-30','Guidance on online classes and attendance when work is suspended.','all',[]),
    d('d4','Designation of Program Coordinators, AY 2026–2027','Special Order No. 112, s. 2026','so','2026-08-05','Designates the program coordinators of the college for the academic year.','all',['u3','u4']),
    d('d5','Designation of Capstone Panel Members','Special Order No. 097, s. 2026','so','2026-07-14','Panel members for capstone project defenses.','all',['u2','u5']),
    d('d6','Notice of College Faculty Meeting – October 9, 2026','Notice No. 021, s. 2026','notice','2026-10-02','Agenda: midterm concerns, accreditation preparation, other matters.','all',[]),
    d('d7','Notice of Department Meeting – Information Technology','Notice No. 019, s. 2026','notice','2026-09-10','IT department meeting on curriculum review.','all',['u2','u3','u5']),
    d('d8','Faculty Teaching Load – Juan P. Dela Cruz, First Semester AY 2026–2027','','ftl','2026-08-01','Approved teaching load for the first semester.','tagged',['u2']),
    d('d9','Faculty Teaching Load – Maria L. Garcia, Summer 2026','','ftl','2026-06-02','Approved summer teaching load.','tagged',['u3']),
    d('d10','Service Record – Juan P. Dela Cruz','','sr','2026-05-20','Certified service record.','tagged',['u2']),
    d('d11','Service Record – Grace A. Lim','','sr','2026-04-11','Certified service record.','tagged',['u6']),
    d('d12','Enrollment Schedule, Second Semester AY 2025–2026','CICS Memo No. 002, s. 2026','memo','2026-01-08','Enrollment dates and advising schedule.','all',[],'archived')
  ];
  return {users, docs, logs:[{id:'l1', userId:'u1', action:'Set up the system', docId:null, detail:'Sample records loaded', ts:new Date().toISOString()}], seq:100};
}

/* ---------- Data storage (browser) ---------- */
let db;
function load(){
  try { const s = localStorage.getItem(KEY); if (s) { db = JSON.parse(s); return; } } catch(e) {}
  db = seed(); save();
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch(e) { toast('Changes could not be saved in this browser. Storage may be full.', 'error'); }
}
const nextId = p => p + (++db.seq);

/* File storage in IndexedDB (falls back to memory if unavailable) */
const files = (() => {
  let dbp = null; const mem = new Map();
  function open(){
    if (dbp) return dbp;
    dbp = new Promise(res => {
      try {
        const r = indexedDB.open('cicsdms-files', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      } catch(e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn){
    return open().then(d => new Promise(res => {
      if (!d) return res(null);
      try { const t = d.transaction('files', mode); const out = fn(t.objectStore('files')); t.oncomplete = () => res(out && out.result !== undefined ? out.result : null); t.onerror = () => res(null); }
      catch(e) { res(null); }
    }));
  }
  return {
    put: async (id, blob) => { mem.set(id, blob); await tx('readwrite', s => s.put(blob, id)); },
    get: async id => mem.get(id) || await tx('readonly', s => s.get(id)),
    del: async id => { mem.delete(id); await tx('readwrite', s => s.delete(id)); },
    clear: async () => { mem.clear(); await tx('readwrite', s => s.clear()); }
  };
})();

/* ---------- Session ---------- */
let me = null;
function restoreSession(){
  try { const id = sessionStorage.getItem(SESSION_KEY); const u = db.users.find(x => x.id === id && x.status === 'active'); if (u) me = u; } catch(e) {}
}
const isAdmin = () => me && me.role === 'admin';
function addLog(action, docId=null, detail=''){
  db.logs.unshift({id:nextId('l'), userId:me ? me.id : null, action, docId, detail, ts:new Date().toISOString()});
  if (db.logs.length > 500) db.logs.length = 500;
  save();
}

/* ---------- Access rules ---------- */
function canSee(doc){
  if (isAdmin()) return true;
  if (doc.status !== 'active') return false;
  return doc.visibility === 'all' || doc.tagged.includes(me.id);
}
const visibleDocs = () => db.docs.filter(d => d.status === 'active' && canSee(d));
const userName = id => (db.users.find(u => u.id === id) || {fullname:'Unknown user'}).fullname;
