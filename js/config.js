/* =========================================================================
   CICS-DMS Prototype
   A Web-Based Document Management System for the College of Information and
   Computing Sciences, MSU-Main Campus.

   PROTOTYPE NOTES
   - All data is stored in this browser (localStorage + IndexedDB for files).
   - Passwords are plain text here for demo purposes only. The final system
     must hash passwords on the server (e.g., bcrypt) and use MongoDB.
   ========================================================================= */

/* config.js: categories, settings, helpers, and icons */
/* ---------- Constants ---------- */
const CATS = [
  {id:'memo',   name:'Memoranda',                      tab:'Memoranda',        vis:'all',    desc:'Memos from the college and university offices'},
  {id:'so',     name:'Special Orders / Designations',  tab:'Special orders',   vis:'all',    desc:'Appointments, assignments, and designations'},
  {id:'notice', name:'Notices of Meeting',             tab:'Notices',          vis:'all',    desc:'College and department meeting notices'},
  {id:'ftl',    name:'Faculty Teaching Loads',         tab:'Teaching loads',   vis:'tagged', desc:'Regular and summer teaching loads'},
  {id:'sr',     name:'Service Records',                tab:'Service records',  vis:'tagged', desc:'Faculty and staff service records'}
];
const ALLOWED = ['pdf','docx','jpg','jpeg'];
const MAX_MB = 10;
const KEY = 'cicsdms.v1';
const SESSION_KEY = 'cicsdms.session';

/* ---------- Small helpers ---------- */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cat = id => CATS.find(c => c.id === id) || {name:id, tab:id};
const fmtDate = d => { if(!d) return '—'; const x = new Date(d.length === 10 ? d + 'T00:00:00' : d); return isNaN(x) ? d : x.toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}); };
const fmtTime = d => new Date(d).toLocaleString('en-PH',{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const fmtSize = b => !b ? '' : b < 1024*1024 ? Math.max(1,Math.round(b/1024)) + ' KB' : (b/1024/1024).toFixed(1) + ' MB';
const initials = n => n.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).map(w => w[0]).slice(0,2).join('').toUpperCase();
const ext = n => (n.split('.').pop() || '').toLowerCase();
const today = () => new Date().toISOString().slice(0,10);

const ICON = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  docs:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h7l2 2h9v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>',
  mine:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.5 3.5 5.5"/></svg>',
  log:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  lock:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  menu:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  folder:'<svg viewBox="0 0 32 32" width="34" height="34"><path d="M3 9h10l3 3h13v15H3z" fill="#E8D49B" stroke="#7B1E2B" stroke-width="2"/></svg>'
};
