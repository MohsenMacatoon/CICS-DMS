/* app.js: screens, navigation, and user actions */
/* ---------- Toast & modal ---------- */
function toast(msg, kind=''){
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
}
let lastFocus = null;
function openModal(html, onReady){
  closeModal(); lastFocus = document.activeElement;
  const back = document.createElement('div'); back.className = 'modal-back'; back.id = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div>`;
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(back);
  const f = back.querySelector('input,select,textarea,button:not([data-close])') || back.querySelector('button'); if (f) f.focus();
  if (onReady) onReady(back);
}
function closeModal(){ const m = $('#modal-back'); if (m) { m.remove(); if (lastFocus) lastFocus.focus(); } }
function confirmBox(title, text, okLabel, danger=false){
  return new Promise(res => {
    openModal(`<div class="modal-head"><h2 id="modal-title">${esc(title)}</h2></div><p>${esc(text)}</p>
      <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${esc(okLabel)}</button></div>`,
      m => { $('#confirm-ok', m).onclick = () => { closeModal(); res(true); }; $$('[data-close]', m).forEach(b => b.addEventListener('click', () => res(false))); });
  });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('.side') && $('.side').classList.remove('open'); } });

/* ---------- Login ---------- */
function renderLogin(msg=''){
  document.title = 'Log in | CICS-DMS';
  const demo = db.users.filter(u => u.status === 'active').slice(0,3);
  $('#root').innerHTML = `
  <div class="login">
    <section class="login-side">
      <div>
        <div class="mark">${ICON.folder}<span>CICS-DMS</span></div>
        <h1>Every college document, in one place.</h1>
        <p>Memoranda, special orders, meeting notices, teaching loads, and service records of the College of Information and Computing Sciences, MSU-Main Campus.</p>
        <div class="login-drawer" aria-hidden="true">${CATS.map(c => `<span>${esc(c.tab)}</span>`).join('')}</div>
      </div>
      <p style="font-size:.85rem">Prototype for capstone evaluation. Data is saved in this browser only.</p>
    </section>
    <section class="login-main">
      <form class="login-card" id="login-form" novalidate>
        <h2>Log in</h2>
        <p class="sub">Use your CICS account to continue.</p>
        <div class="field"><label for="lu">Username</label><input class="input" id="lu" autocomplete="username" required></div>
        <div class="field"><label for="lp">Password</label><input class="input" id="lp" type="password" autocomplete="current-password" required></div>
        <p class="error-text" id="login-err" role="alert">${esc(msg)}</p>
        <button class="btn btn-primary" style="width:100%;margin-top:.6rem">Log in</button>
        <div class="demo">
          <h3>Demo accounts</h3>
          ${demo.map(u => `<div class="demo-item"><span><b>${esc(u.position)}</b><br><code>${esc(u.username)}</code> / <code>${esc(u.password)}</code></span><button type="button" class="btn btn-sm" data-fill="${esc(u.id)}">Use</button></div>`).join('')}
        </div>
      </form>
    </section>
  </div>`;
  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    const un = $('#lu').value.trim().toLowerCase(), pw = $('#lp').value;
    if (!un || !pw) { $('#login-err').textContent = 'Enter your username and password.'; return; }
    const u = db.users.find(x => x.username.toLowerCase() === un);
    if (!u || u.password !== pw) { $('#login-err').textContent = 'The username or password is incorrect.'; return; }
    if (u.status !== 'active') { $('#login-err').textContent = 'This account is deactivated. Please contact the Records Officer.'; return; }
    me = u; try { sessionStorage.setItem(SESSION_KEY, u.id); } catch(e) {}
    addLog('Logged in');
    location.hash = '#/dashboard'; route();
  });
  $$('[data-fill]').forEach(b => b.onclick = () => { const u = db.users.find(x => x.id === b.dataset.fill); $('#lu').value = u.username; $('#lp').value = u.password; $('#lp').focus(); });
}
function logout(){
  addLog('Logged out'); me = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch(e) {}
  location.hash = ''; renderLogin();
}

/* ---------- App shell ---------- */
function renderShell(active){
  const mineCount = db.docs.filter(d => d.status === 'active' && d.tagged.includes(me.id)).length;
  const link = (id, label, icon, extra='') => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ''}>${ICON[icon]}<span>${label}</span>${extra}</a>`;
  $('#root').innerHTML = `
  <div class="app">
    <aside class="side" id="side">
      <div class="brand">${ICON.folder}<div><strong>CICS-DMS</strong><small>College of Information and Computing Sciences</small></div></div>
      <nav class="nav" aria-label="Main">
        ${link('dashboard','Home','home')}
        ${link('documents','All documents','docs')}
        ${isAdmin() ? '' : link('mine','My records','mine', mineCount ? `<span class="count">${mineCount}</span>` : '')}
        ${isAdmin() ? `<div class="nav-group">Records Officer</div>
          ${link('upload','Upload a document','upload')}
          ${link('archived','Archived documents','archive')}
          ${link('users','Manage users','users')}
          ${link('log','Activity log','log')}` : ''}
      </nav>
      <div class="side-foot">
        Prototype: data is saved in this browser only.
        ${isAdmin() ? '<button class="btn btn-sm" id="reset-demo">Reset sample data</button>' : ''}
      </div>
    </aside>
    <div>
      <header class="top">
        <button class="btn btn-quiet menu-btn" id="menu-btn" aria-label="Open menu" aria-controls="side">${ICON.menu}</button>
        <div class="who"><div class="avatar" aria-hidden="true">${esc(initials(me.fullname))}</div><div class="who-text"><b>${esc(me.fullname)}</b><small>${esc(me.position)}${isAdmin() ? ' (Administrator)' : ''}</small></div></div>
        <button class="btn" id="logout">Log out</button>
      </header>
      <main id="main"></main>
    </div>
  </div>`;
  $('#logout').onclick = logout;
  $('#menu-btn').onclick = () => $('#side').classList.toggle('open');
  $$('.nav a').forEach(a => a.addEventListener('click', () => $('#side').classList.remove('open')));
  const r = $('#reset-demo');
  if (r) r.onclick = async () => {
    if (!await confirmBox('Reset sample data?', 'All uploaded documents, users, and logs in this browser will be replaced with the original sample data.', 'Reset data', true)) return;
    await files.clear(); db = seed(); save(); me = db.users[0]; try { sessionStorage.setItem(SESSION_KEY, me.id); } catch(e) {}
    toast('Sample data restored.', 'ok'); location.hash = '#/dashboard'; route();
  };
}

/* ---------- Router ---------- */
function route(){
  if (!me) { renderLogin(); return; }
  const h = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const [path, qs] = h.split('?'); const parts = path.split('/'); const params = new URLSearchParams(qs || '');
  const adminOnly = ['upload','edit','archived','users','log'];
  if (adminOnly.includes(parts[0]) && !isAdmin()) { location.hash = '#/dashboard'; return; }
  if (parts[0] === 'mine' && isAdmin()) { location.hash = '#/documents'; return; }
  renderShell(parts[0] === 'edit' ? 'upload' : parts[0]);
  const views = {dashboard:viewDashboard, documents:() => viewDocuments(params), mine:viewMine, upload:() => viewForm(null), edit:() => viewForm(parts[1]), archived:viewArchived, users:viewUsers, log:viewLog};
  (views[parts[0]] || viewDashboard)();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', route);

/* ---------- Dashboard ---------- */
function viewDashboard(){
  document.title = 'Home | CICS-DMS';
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const first = me.fullname.split(' ')[0];
  const vis = visibleDocs();
  const recent = [...vis].sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0,6);
  const mine = db.docs.filter(d => d.status === 'active' && d.tagged.includes(me.id));
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>${greet}, ${esc(first)}</h1><p>${isAdmin() ? 'Open a folder, or upload a new document for faculty and staff.' : 'Open a folder to find college documents, or check the records tagged to you.'}</p></div>
    ${isAdmin() ? `<a class="btn btn-primary" href="#/upload">${ICON.upload.replace('<svg','<svg width="18" height="18"')}Upload a document</a>` : ''}</div>
    <h2>Filing cabinet</h2>
    <div class="cabinet">
      ${CATS.map(c => {
        const n = vis.filter(d => d.category === c.id).length;
        return `<a class="folder ${c.vis === 'tagged' ? 'private' : ''}" data-tab="${esc(c.tab)}" href="#/documents?cat=${c.id}">
          <div><span class="sr-only">${esc(c.name)}: </span><p>${esc(c.desc)}</p>${c.vis === 'tagged' ? `<span class="lock">${ICON.lock} ${isAdmin() ? 'Visible to tagged users only' : 'Only your own records'}</span>` : ''}</div>
          <div class="num">${n}<small>${n === 1 ? 'document' : 'documents'}</small></div></a>`;
      }).join('')}
    </div>
    ${!isAdmin() && mine.length ? `<div class="callout"><div><h3>You have ${mine.length} ${mine.length === 1 ? 'record' : 'records'} tagged to you</h3><p class="hint">Teaching loads, service records, and orders that name you.</p></div><a class="btn btn-primary" href="#/mine">View my records</a></div>` : ''}
    <div class="grid-2">
      <section class="panel"><h2 style="margin-bottom:.4rem">Recently added</h2>
        ${recent.length ? `<ul class="recent">${recent.map(d => `<li><div><button data-view="${d.id}">${esc(d.title)}</button><div class="meta">${esc(cat(d.category).name)}${d.refNo ? ', ' + esc(d.refNo) : ''}</div></div><span class="meta" style="white-space:nowrap">${fmtDate(d.docDate)}</span></li>`).join('')}</ul>` : '<p class="hint">No documents yet.</p>'}
      </section>
      <section class="panel"><h2 style="margin-bottom:.4rem">${isAdmin() ? 'System summary' : 'At a glance'}</h2>
        ${isAdmin() ? `
          <div class="stat"><span>Active documents</span><b>${db.docs.filter(d => d.status === 'active').length}</b></div>
          <div class="stat"><span>Archived documents</span><b>${db.docs.filter(d => d.status === 'archived').length}</b></div>
          <div class="stat"><span>Active users</span><b>${db.users.filter(u => u.status === 'active').length}</b></div>
          <div class="stat"><span>Downloads recorded</span><b>${db.logs.filter(l => l.action === 'Downloaded').length}</b></div>` : `
          <div class="stat"><span>Documents you can open</span><b>${vis.length}</b></div>
          <div class="stat"><span>Tagged to you</span><b>${mine.length}</b></div>
          <p class="hint" style="margin-top:.8rem">Need a record that is not here? Ask the Records Officer to upload it and tag you.</p>`}
      </section>
    </div>`;
  bindDocActions($('#main'));
}

/* ---------- Document list (shared) ---------- */
function docTable(docs, mode='normal'){
  if (!docs.length) return '';
  return `<div class="table-wrap"><table>
    <thead><tr><th scope="col">Document</th><th scope="col">Category</th><th scope="col">Date</th><th scope="col">Who can see it</th><th scope="col">Actions</th></tr></thead>
    <tbody>${docs.map(d => `<tr>
      <td><span class="title">${esc(d.title)}</span>${d.refNo ? `<span class="ref">${esc(d.refNo)}</span>` : ''}</td>
      <td><span class="tag tag-cat">${esc(cat(d.category).tab)}</span></td>
      <td style="white-space:nowrap">${fmtDate(d.docDate)}</td>
      <td>${visTag(d)}</td>
      <td><div class="actions">
        <button class="btn btn-sm" data-view="${d.id}">View</button>
        <button class="btn btn-sm" data-download="${d.id}">Download</button>
        ${isAdmin() && mode === 'normal' ? `<a class="btn btn-sm" href="#/edit/${d.id}">Edit</a><button class="btn btn-sm btn-danger" data-archive="${d.id}">Archive</button>` : ''}
        ${isAdmin() && mode === 'archived' ? `<button class="btn btn-sm" data-restore="${d.id}">Restore</button>` : ''}
      </div></td></tr>`).join('')}</tbody></table></div>`;
}
function visTag(d){
  if (d.status === 'archived') return '<span class="tag tag-off">Archived</span>';
  if (d.visibility === 'all') return '<span class="tag tag-all">All CICS personnel</span>';
  return `<span class="tag tag-private">${ICON.lock} Tagged only (${d.tagged.length})</span>`;
}
function bindDocActions(scope){
  scope.addEventListener('click', async e => {
    const b = e.target.closest('[data-view],[data-download],[data-archive],[data-restore]'); if (!b) return;
    const id = b.dataset.view || b.dataset.download || b.dataset.archive || b.dataset.restore;
    const doc = db.docs.find(d => d.id === id); if (!doc || !canSee(doc)) { toast('This document is not available.', 'error'); return; }
    if (b.dataset.view) showDoc(doc);
    else if (b.dataset.download) downloadDoc(doc);
    else if (b.dataset.archive) archiveDoc(doc);
    else if (b.dataset.restore) restoreDoc(doc);
  });
}
function sortDocs(list, sort){
  const s = [...list];
  if (sort === 'oldest') s.sort((a,b) => a.docDate.localeCompare(b.docDate));
  else if (sort === 'title') s.sort((a,b) => a.title.localeCompare(b.title));
  else s.sort((a,b) => b.docDate.localeCompare(a.docDate));
  return s;
}
function matches(d, q){
  if (!q) return true;
  const hay = [d.title, d.refNo, d.description, d.fileName, cat(d.category).name, ...d.tagged.map(userName)].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

/* ---------- All documents ---------- */
function viewDocuments(params){
  document.title = 'All documents | CICS-DMS';
  const st = {q:params.get('q') || '', cat:params.get('cat') || '', sort:params.get('sort') || 'newest'};
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>${st.cat ? esc(cat(st.cat).name) : 'All documents'}</h1><p>Search by title, reference number, or name. Filter by category to narrow the list.</p></div></div>
    <div class="toolbar" role="search">
      <div class="field search"><label for="q">Search</label><input class="input" id="q" type="search" placeholder="e.g., final grades, Special Order No. 112" value="${esc(st.q)}"></div>
      <div class="field filter"><label for="fc">Category</label><select class="input" id="fc"><option value="">All categories</option>${CATS.map(c => `<option value="${c.id}" ${st.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field filter"><label for="fs">Sort by</label><select class="input" id="fs"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title (A to Z)</option></select></div>
    </div>
    <p class="result-count" id="count" aria-live="polite"></p>
    <div id="list"></div>`;
  $('#fs').value = st.sort;
  const refresh = () => {
    st.q = $('#q').value.trim(); st.cat = $('#fc').value; st.sort = $('#fs').value;
    $('h1', $('#main')).textContent = st.cat ? cat(st.cat).name : 'All documents';
    const list = sortDocs(visibleDocs().filter(d => (!st.cat || d.category === st.cat) && matches(d, st.q)), st.sort);
    $('#count').textContent = `${list.length} ${list.length === 1 ? 'document' : 'documents'} found`;
    $('#list').innerHTML = list.length ? docTable(list) : `<div class="panel empty"><h3>No documents match your search</h3><p>Check the spelling, try fewer words, or choose "All categories".</p></div>`;
    const qs = new URLSearchParams(); if (st.q) qs.set('q', st.q); if (st.cat) qs.set('cat', st.cat); if (st.sort !== 'newest') qs.set('sort', st.sort);
    history.replaceState(null, '', '#/documents' + (qs.toString() ? '?' + qs : ''));
  };
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 200); });
  $('#fc').addEventListener('change', refresh); $('#fs').addEventListener('change', refresh);
  bindDocActions($('#list'));
  refresh();
}

/* ---------- My records (tagged to me) ---------- */
function viewMine(){
  document.title = 'My records | CICS-DMS';
  const list = sortDocs(db.docs.filter(d => d.status === 'active' && d.tagged.includes(me.id)), 'newest');
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>My records</h1><p>Documents the Records Officer tagged to you, including your teaching loads and service records.</p></div></div>
    <div id="list">${list.length ? docTable(list) : `<div class="panel empty"><h3>Nothing is tagged to you yet</h3><p>When the Records Officer uploads a record that names you, it will appear here.</p></div>`}</div>`;
  bindDocActions($('#list'));
}

/* ---------- Archived ---------- */
function viewArchived(){
  document.title = 'Archived documents | CICS-DMS';
  const list = sortDocs(db.docs.filter(d => d.status === 'archived'), 'newest');
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>Archived documents</h1><p>Archived documents are hidden from faculty and staff but kept in the system. Restore one to make it visible again.</p></div></div>
    <div id="list">${list.length ? docTable(list, 'archived') : `<div class="panel empty"><h3>No archived documents</h3><p>Outdated documents you archive will be kept here.</p></div>`}</div>`;
  bindDocActions($('#list'));
}

/* ---------- Document details ---------- */
function showDoc(doc){
  addLog('Viewed', doc.id, doc.title);
  const tagged = doc.tagged.map(userName);
  openModal(`
    <div class="modal-head"><div><span class="tag tag-cat">${esc(cat(doc.category).name)}</span><h2 id="modal-title" style="margin-top:.5rem">${esc(doc.title)}</h2></div>
      <button class="btn btn-quiet btn-sm" data-close aria-label="Close">Close</button></div>
    ${doc.description ? `<p>${esc(doc.description)}</p>` : ''}
    <dl class="details">
      <dt>Reference no.</dt><dd>${esc(doc.refNo) || '—'}</dd>
      <dt>Document date</dt><dd>${fmtDate(doc.docDate)}</dd>
      <dt>Who can see it</dt><dd>${visTag(doc)}</dd>
      <dt>Tagged</dt><dd>${tagged.length ? esc(tagged.join(', ')) : 'No one tagged'}</dd>
      <dt>File</dt><dd>${doc.hasFile ? `${esc(doc.fileName)} <span class="hint">(${fmtSize(doc.fileSize)})</span>` : '<span class="hint">Sample record with no file attached</span>'}</dd>
      <dt>Uploaded</dt><dd>${fmtTime(doc.uploadedAt)} by ${esc(userName(doc.uploadedBy))}</dd>
    </dl>
    <div class="form-actions">
      ${isAdmin() && doc.status === 'active' ? `<a class="btn" href="#/edit/${doc.id}" data-close>Edit</a>` : ''}
      ${doc.hasFile && doc.fileType !== 'docx' ? '<button class="btn" id="open-file">Open file</button>' : ''}
      <button class="btn btn-primary" id="dl">Download</button>
    </div>`, m => {
      $('#dl', m).onclick = () => downloadDoc(doc);
      const o = $('#open-file', m); if (o) o.onclick = () => openFile(doc);
    });
}
async function openFile(doc){
  const blob = await files.get(doc.id);
  if (!blob) { toast('The file could not be found in this browser.', 'error'); return; }
  const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function downloadDoc(doc){
  let blob = doc.hasFile ? await files.get(doc.id) : null; let name = doc.fileName;
  if (!blob) {
    const lines = ['CICS-DMS (prototype) - sample record', '', 'Title: ' + doc.title, 'Reference no.: ' + (doc.refNo || '-'), 'Category: ' + cat(doc.category).name, 'Document date: ' + fmtDate(doc.docDate), 'Description: ' + (doc.description || '-'), '', 'This sample record has no attached file. Files uploaded by the Records Officer download in their original format.'];
    blob = new Blob([lines.join('\r\n')], {type:'text/plain'}); name = doc.title.replace(/[^\w\- ]+/g, '').trim().slice(0,60) + '.txt';
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
  addLog('Downloaded', doc.id, doc.title); toast('Download started: ' + name);
}
async function archiveDoc(doc){
  if (!await confirmBox('Archive this document?', `"${doc.title}" will be hidden from faculty and staff. You can restore it from Archived documents.`, 'Archive document', true)) return;
  doc.status = 'archived'; save(); addLog('Archived', doc.id, doc.title); toast('Document archived.', 'ok'); route();
}
async function restoreDoc(doc){
  doc.status = 'active'; save(); addLog('Restored', doc.id, doc.title); toast('Document restored.', 'ok'); route();
}

/* ---------- Upload / edit form ---------- */
function viewForm(id){
  const doc = id ? db.docs.find(d => d.id === id) : null;
  if (id && !doc) { toast('That document no longer exists.', 'error'); location.hash = '#/documents'; return; }
  document.title = (doc ? 'Edit document' : 'Upload a document') + ' | CICS-DMS';
  const people = db.users.filter(u => u.role === 'user' && (u.status === 'active' || (doc && doc.tagged.includes(u.id))));
  const v = doc || {title:'', refNo:'', category:'', docDate:today(), description:'', visibility:'all', tagged:[]};
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>${doc ? 'Edit document' : 'Upload a document'}</h1><p>${doc ? 'Update the details below. Choosing a new file replaces the current one.' : 'Fill in the details so faculty and staff can find this document later.'}</p></div></div>
    <form id="doc-form" novalidate>
    <div class="form-grid">
      <section class="panel">
        <h2 style="margin-bottom:1rem">Document details</h2>
        <div class="field"><label for="f-title">Title</label><input class="input" id="f-title" value="${esc(v.title)}" placeholder="e.g., Submission of Final Grades for the First Semester"><span class="error-text" data-err="title"></span></div>
        <div class="row">
          <div class="field"><label for="f-cat">Category</label><select class="input" id="f-cat"><option value="">Choose a category</option>${CATS.map(c => `<option value="${c.id}" ${v.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><span class="error-text" data-err="category"></span></div>
          <div class="field"><label for="f-date">Document date</label><input class="input" id="f-date" type="date" value="${esc(v.docDate)}"><span class="error-text" data-err="date"></span></div>
        </div>
        <div class="field"><label for="f-ref">Reference no. <span class="hint">(optional)</span></label><input class="input" id="f-ref" value="${esc(v.refNo)}" placeholder="e.g., Special Order No. 112, s. 2026"></div>
        <div class="field"><label for="f-desc">Short description <span class="hint">(optional)</span></label><textarea class="input" id="f-desc" placeholder="What is this document about?">${esc(v.description)}</textarea></div>
        <div class="field"><span class="legend">File</span>
          <div class="dropzone" id="drop">
            <p><b>Drag the file here</b> or</p>
            <label class="btn" style="margin-top:.5rem" for="f-file">Choose file</label>
            <input id="f-file" type="file" accept=".pdf,.docx,.jpg,.jpeg" class="sr-only">
            <p class="hint" style="margin-top:.5rem">PDF, Word (.docx), or JPEG, up to ${MAX_MB} MB</p>
            <p class="file-chosen" id="file-name">${doc && doc.hasFile ? 'Current file: ' + esc(doc.fileName) : ''}</p>
          </div><span class="error-text" data-err="file"></span></div>
      </section>
      <section class="panel">
        <h2 style="margin-bottom:1rem">Who can see it</h2>
        <label class="choice"><input type="radio" name="vis" value="all" ${v.visibility === 'all' ? 'checked' : ''}><span><b>All CICS personnel</b><small>For memoranda, special orders, and meeting notices</small></span></label>
        <label class="choice"><input type="radio" name="vis" value="tagged" ${v.visibility === 'tagged' ? 'checked' : ''}><span><b>Tagged users only</b><small>For personal records like teaching loads and service records</small></span></label>
        <div class="field" style="margin-top:1rem;margin-bottom:0"><label for="tag-q">Tag faculty and staff</label>
          <span class="hint" id="tag-hint"></span>
          <input class="input" id="tag-q" type="search" placeholder="Search by name">
          <div class="people" id="people">${people.map(u => `<label class="person" data-name="${esc(u.fullname.toLowerCase())}"><input type="checkbox" value="${u.id}" ${v.tagged.includes(u.id) ? 'checked' : ''}><span>${esc(u.fullname)}<br><small>${esc(u.position)}</small></span></label>`).join('')}</div>
          <span class="hint" id="tag-count" style="margin-top:.4rem"></span><span class="error-text" data-err="tags"></span>
        </div>
      </section>
    </div>
    <div class="form-actions"><a class="btn" href="#/documents">Cancel</a><button class="btn btn-primary" type="submit">${doc ? 'Save changes' : 'Upload document'}</button></div>
    </form>`;

  let chosen = null;
  const fileInput = $('#f-file'), drop = $('#drop');
  const setFile = f => { chosen = f; $('#file-name').textContent = f ? 'Selected: ' + f.name + ' (' + fmtSize(f.size) + ')' : ''; $('[data-err="file"]').textContent = ''; };
  fileInput.onchange = () => setFile(fileInput.files[0] || null);
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });

  const updateTagUI = () => {
    const visVal = $('input[name="vis"]:checked').value;
    const n = $$('#people input:checked').length;
    $('#tag-hint').textContent = visVal === 'tagged' ? 'Required. Only the people you tag will see this document.' : 'Optional. Tagged people will also find it under My records.';
    $('#tag-count').textContent = n ? `${n} ${n === 1 ? 'person' : 'people'} tagged` : 'No one tagged';
  };
  $('#f-cat').addEventListener('change', e => { const c = CATS.find(x => x.id === e.target.value); if (c && !doc) { $(`input[name="vis"][value="${c.vis}"]`).checked = true; updateTagUI(); } });
  $$('input[name="vis"]').forEach(r => r.addEventListener('change', updateTagUI));
  $('#people').addEventListener('change', updateTagUI);
  $('#tag-q').addEventListener('input', e => { const q = e.target.value.toLowerCase(); $$('#people .person').forEach(p => p.style.display = p.dataset.name.includes(q) ? '' : 'none'); });
  updateTagUI();

  $('#doc-form').addEventListener('submit', async e => {
    e.preventDefault();
    $$('[data-err]').forEach(x => x.textContent = '');
    const data = {
      title:$('#f-title').value.trim(), category:$('#f-cat').value, docDate:$('#f-date').value,
      refNo:$('#f-ref').value.trim(), description:$('#f-desc').value.trim(),
      visibility:$('input[name="vis"]:checked').value, tagged:$$('#people input:checked').map(x => x.value)
    };
    const err = {};
    if (!data.title) err.title = 'Enter a title.';
    if (!data.category) err.category = 'Choose a category.';
    if (!data.docDate) err.date = 'Enter the document date.';
    if (!doc && !chosen) err.file = 'Choose a file to upload.';
    if (chosen && !ALLOWED.includes(ext(chosen.name))) err.file = 'This file type is not supported. Use PDF, Word (.docx), or JPEG.';
    else if (chosen && chosen.size > MAX_MB * 1024 * 1024) err.file = `This file is larger than ${MAX_MB} MB. Compress it or scan at a lower quality.`;
    if (data.visibility === 'tagged' && !data.tagged.length) err.tags = 'Tag at least one person, or choose "All CICS personnel".';
    if (Object.keys(err).length) {
      Object.entries(err).forEach(([k, m]) => $(`[data-err="${k}"]`).textContent = m);
      toast('Some details need attention before saving.', 'error'); return;
    }
    const target = doc || {id:nextId('d'), status:'active', hasFile:false, fileName:'', fileType:'', fileSize:0, uploadedBy:me.id, uploadedAt:new Date().toISOString()};
    Object.assign(target, data);
    if (chosen) {
      await files.put(target.id, chosen);
      Object.assign(target, {hasFile:true, fileName:chosen.name, fileType:ext(chosen.name) === 'jpeg' ? 'jpg' : ext(chosen.name), fileSize:chosen.size});
    }
    if (!doc) db.docs.push(target);
    save();
    addLog(doc ? 'Edited' : 'Uploaded', target.id, target.title + (chosen && doc ? ' (file replaced)' : ''));
    toast(doc ? 'Changes saved.' : 'Document uploaded.', 'ok');
    location.hash = '#/documents?cat=' + target.category;
  });
}

/* ---------- Manage users ---------- */
function viewUsers(){
  document.title = 'Manage users | CICS-DMS';
  const list = [...db.users].sort((a,b) => (a.role === 'admin' ? -1 : 0) - (b.role === 'admin' ? -1 : 0) || a.fullname.localeCompare(b.fullname));
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>Manage users</h1><p>Add faculty and staff accounts, update their details, or deactivate accounts of people who have left the college.</p></div>
      <button class="btn btn-primary" id="add-user">Add user</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th scope="col">Name</th><th scope="col">Username</th><th scope="col">Position</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
      <tbody>${list.map(u => `<tr>
        <td><span class="title">${esc(u.fullname)}</span><span class="ref">${esc(u.email)}</span></td>
        <td>${esc(u.username)}</td><td>${esc(u.position)}</td>
        <td>${u.role === 'admin' ? 'Administrator' : 'Regular user'}</td>
        <td>${u.status === 'active' ? '<span class="tag tag-all">Active</span>' : '<span class="tag tag-off">Deactivated</span>'}</td>
        <td><div class="actions"><button class="btn btn-sm" data-edit-user="${u.id}">Edit</button>
          ${u.id === me.id ? '' : `<button class="btn btn-sm ${u.status === 'active' ? 'btn-danger' : ''}" data-toggle-user="${u.id}">${u.status === 'active' ? 'Deactivate' : 'Activate'}</button>`}</div></td>
      </tr>`).join('')}</tbody></table></div>`;
  $('#add-user').onclick = () => userForm(null);
  $('#main').addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit-user]'), tg = e.target.closest('[data-toggle-user]');
    if (ed) userForm(db.users.find(u => u.id === ed.dataset.editUser));
    if (tg) {
      const u = db.users.find(x => x.id === tg.dataset.toggleUser);
      if (u.status === 'active' && !await confirmBox('Deactivate this account?', `${u.fullname} will no longer be able to log in. Their tagged records stay in the system.`, 'Deactivate', true)) return;
      u.status = u.status === 'active' ? 'inactive' : 'active'; save();
      addLog(u.status === 'active' ? 'Activated user' : 'Deactivated user', null, u.fullname);
      toast(u.status === 'active' ? 'Account activated.' : 'Account deactivated.', 'ok'); viewUsers();
    }
  });
}
function userForm(u){
  const v = u || {fullname:'', username:'', email:'', position:'', role:'user', password:''};
  openModal(`
    <div class="modal-head"><h2 id="modal-title">${u ? 'Edit user' : 'Add user'}</h2><button class="btn btn-quiet btn-sm" data-close>Close</button></div>
    <form id="user-form" novalidate>
      <div class="field"><label for="u-name">Full name</label><input class="input" id="u-name" value="${esc(v.fullname)}" placeholder="e.g., Juan P. Dela Cruz"></div>
      <div class="row">
        <div class="field"><label for="u-user">Username</label><input class="input" id="u-user" value="${esc(v.username)}" autocomplete="off"></div>
        <div class="field"><label for="u-pass">${u ? 'New password' : 'Password'} ${u ? '<span class="hint">(leave blank to keep)</span>' : ''}</label><input class="input" id="u-pass" type="text" autocomplete="off"></div>
      </div>
      <div class="field"><label for="u-email">Email</label><input class="input" id="u-email" type="email" value="${esc(v.email)}"></div>
      <div class="row">
        <div class="field"><label for="u-pos">Position</label><input class="input" id="u-pos" value="${esc(v.position)}" placeholder="e.g., Instructor I"></div>
        <div class="field"><label for="u-role">Role</label><select class="input" id="u-role" ${u && u.id === me.id ? 'disabled' : ''}><option value="user">Regular user</option><option value="admin">Administrator</option></select></div>
      </div>
      <p class="error-text" id="u-err" role="alert"></p>
      <div class="form-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-primary">${u ? 'Save changes' : 'Add user'}</button></div>
    </form>`, m => {
      $('#u-role', m).value = v.role;
      $('#user-form', m).addEventListener('submit', e => {
        e.preventDefault();
        const d = {fullname:$('#u-name').value.trim(), username:$('#u-user').value.trim().toLowerCase(), email:$('#u-email').value.trim(), position:$('#u-pos').value.trim(), role:$('#u-role').value, password:$('#u-pass').value};
        let err = '';
        if (!d.fullname || !d.username || !d.position) err = 'Enter the full name, username, and position.';
        else if (!/^[a-z0-9._-]{3,}$/.test(d.username)) err = 'Use at least 3 letters or numbers for the username, with no spaces.';
        else if (db.users.some(x => x.username === d.username && (!u || x.id !== u.id))) err = 'That username is already taken.';
        else if (!u && d.password.length < 6) err = 'Use a password with at least 6 characters.';
        else if (u && d.password && d.password.length < 6) err = 'Use a password with at least 6 characters.';
        if (err) { $('#u-err').textContent = err; return; }
        if (u) { Object.assign(u, {fullname:d.fullname, username:d.username, email:d.email, position:d.position}); if (u.id !== me.id) u.role = d.role; if (d.password) u.password = d.password; }
        else db.users.push({id:nextId('u'), ...d, status:'active'});
        save(); addLog(u ? 'Edited user' : 'Added user', null, d.fullname);
        if (u && u.id === me.id) me = u;
        closeModal(); toast(u ? 'Changes saved.' : 'User added.', 'ok'); route();
      });
    });
}

/* ---------- Activity log ---------- */
function viewLog(){
  document.title = 'Activity log | CICS-DMS';
  const logs = db.logs.slice(0, 200);
  $('#main').innerHTML = `
    <div class="page-head"><div><h1>Activity log</h1><p>A record of logins, uploads, edits, downloads, and archiving. Shows the latest 200 actions.</p></div></div>
    <div class="table-wrap"><table>
      <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Details</th></tr></thead>
      <tbody>${logs.map(l => `<tr><td style="white-space:nowrap">${fmtTime(l.ts)}</td><td>${esc(l.userId ? userName(l.userId) : 'System')}</td><td>${esc(l.action)}</td><td>${esc(l.detail)}</td></tr>`).join('')}</tbody>
    </table></div>`;
}

/* ---------- Start ---------- */
load(); restoreSession(); route();
