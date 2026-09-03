// ===================== DATA =====================
const PAYERS = [
  { name: 'Aetna PPO',        readable: '2 letters · 4 digits · 1 letter', example: 'AE-3082-A',    hint: 'Aetna format: XX-NNNN-A',              rule: 'Two alpha, four digits, one trailing alpha, dash-separated.', re: /^[A-Za-z]{2}-\d{4}-[A-Za-z]$/ },
  { name: 'UnitedHealthcare', readable: '9 digits',                        example: '493210087',     hint: 'UHC format: 9 digits',                 rule: 'Exactly nine numeric digits, no separators.',                 re: /^\d{9}$/ },
  { name: 'Cigna OAP',        readable: 'U + 8 digits',                    example: 'U40021398',     hint: 'Cigna format: U + 8 digits',           rule: 'Leading U followed by eight numeric digits.',                 re: /^[Uu]\d{8}$/ },
  { name: 'BCBS TX',          readable: '3 letters + 9 digits',            example: 'BCT004521190',  hint: 'BCBS format: 3-letter prefix + 9 digits', rule: 'Three-letter plan prefix then nine numeric digits.',       re: /^[A-Za-z]{3}\d{9}$/ },
  { name: 'Humana Gold',      readable: 'H + 8 digits',                    example: 'H55830921',     hint: 'Humana format: H + 8 digits',          rule: 'Leading H followed by eight numeric digits.',                 re: /^[Hh]\d{8}$/ },
  { name: 'Kaiser',           readable: '10 digits',                       example: '6120094475',    hint: 'Kaiser format: 10 digits',             rule: 'Exactly ten numeric digits, no separators.',                  re: /^\d{10}$/ },
];

function seedPatients() {
  const F = (name, dob, payer, member, diag, suggestion, suggested) =>
    ({ name, dob, payer, member, status: 'flagged', diag, suggestion, suggested, origin: 'batch' });
  const C = (name, dob, payer, member, status) => ({ name, dob, payer, member, status, origin: 'batch' });
  const raw = [
    F('Ramirez, Elena', '1987-03-14', 'Aetna PPO', '8X-3082-A',
      { field: 'member_id', rule: 'aetna.format', expected: 'XX-NNNN-A  (2 alpha · 4 digit · 1 alpha)', actual: '8X-3082-A  (position 1 is a digit)' },
      'The first character is a digit, but Aetna PPO expects two letters. Based on the plan prefix on file, the corrected Member ID is AE-3082-A. Confirm to re-verify.',
      'AE-3082-A'),
    C('Okafor, James', '1991-08-02', 'UnitedHealthcare', '493210087', 'confirmed'),
    C('Chen, Wei', '1979-11-23', 'Cigna OAP', 'U40021398', 'confirmed'),
    F('Delacroix, Marie', '1965-05-30', 'BCBS TX', 'TX9912003',
      { field: 'member_id', rule: 'bcbs.prefix', expected: 'AAA + 9 digits  (12 chars)', actual: 'TX9912003  (2-letter prefix · 7 digits)' },
      'The prefix is two letters and the numeric body is short. BCBS TX uses a three-letter plan prefix plus nine digits. Suggested correction: TXB991200341. Confirm to re-verify.',
      'TXB991200341'),
    C('Nguyen, Tran', '1983-02-17', 'Humana Gold', 'H55830921', 'confirmed'),
    C('Patel, Riya', '1996-07-09', 'Kaiser', '6120094475', 'confirmed'),
    C('Johnson, Marcus', '1974-12-01', 'Aetna PPO', 'AE-7741-C', 'confirmed'),
    F('Silva, Ana', '1988-09-25', 'UnitedHealthcare', '4432-119',
      { field: 'member_id', rule: 'uhc.length', expected: '9 digits  (no separators)', actual: '4432-119  (contains "-" · 7 digits)' },
      'The value contains a dash and is only seven digits. UnitedHealthcare expects nine bare digits. Suggested correction: 443211900. Confirm to re-verify.',
      '443211900'),
    C('Kim, Soo-jin', '1990-04-11', 'Cigna OAP', 'U71230045', 'confirmed'),
    C('Brooks, Daniel', '1969-06-19', 'BCBS TX', 'BCT004521190', 'confirmed'),
    F('Hassan, Layla', '1993-01-28', 'Humana Gold', 'HG-2205',
      { field: 'member_id', rule: 'humana.format', expected: 'H + 8 digits', actual: 'HG-2205  (extra alpha · 4 digits)' },
      'There is an extra letter and the numeric body is short. Humana Gold expects a single leading H and eight digits. Suggested correction: H22050001. Confirm to re-verify.',
      'H22050001'),
    C('Torres, Miguel', '1982-10-06', 'Kaiser', '8890041267', 'confirmed'),
  ];
  return raw.map((r, i) => ({
    id: 'p' + i,
    mrn: String(48100 + i * 7),
    updated: i < 2 ? 'just now' : (i * 2 + 1) + 'm ago',
    ts: i < 2 ? 0 : i * 2 + 1,
    ...r,
  }));
}

const STATUS_ORDER = { flagged: 0, pending: 1, confirmed: 2 };

// ===================== HELPERS =====================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function relTime(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'm ago';
  return Math.round(m / 60) + 'h ago';
}

function charDiff(a, b) {
  a = a || ''; b = b || '';
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  const outA = [], outB = [];
  while (i < n && j < m) {
    if (a[i] === b[j]) { outA.push({ t: 'same', c: a[i] }); outB.push({ t: 'same', c: b[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { outA.push({ t: 'del', c: a[i] }); i++; }
    else { outB.push({ t: 'ins', c: b[j] }); j++; }
  }
  while (i < n) { outA.push({ t: 'del', c: a[i] }); i++; }
  while (j < m) { outB.push({ t: 'ins', c: b[j] }); j++; }
  return { a: outA, b: outB };
}

function renderDiffChars(arr) {
  return arr.map(seg => {
    const cls = seg.t === 'same' ? 'diff-same' : seg.t === 'del' ? 'diff-del' : 'diff-ins';
    return `<span class="diff-char ${cls}">${escapeHtml(seg.c)}</span>`;
  }).join('');
}

function statusBadge(status) {
  const map = { pending: 'Pending', flagged: 'Flagged', confirmed: 'Confirmed' };
  return `<span class="badge badge-${status}"><span class="badge-dot"></span>${map[status] || status}</span>`;
}

// ===================== STATE =====================
let state = {
  view: 'intake',
  batch: 'idle',
  patients: [],
  form: { name: '', dob: '', payer: '', memberId: '' },
  err: {},
  submitting: false,
  toasts: [],
  sortKey: null,
  sortDir: 'asc',
  filter: 'all',
  search: '',
  selectedRows: new Set(),
  flashIds: new Set(),
  selectedId: null,
  detail: null,
  drawerId: null,
  paletteOpen: false,
  paletteQuery: '',
  paletteSel: 0,
  tester: { payer: '', value: '' },
};

let timers = {};
function setTimer(key, fn, ms) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }

function setState(patch) {
  const delta = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...delta };
  render();
}

// ===================== DERIVED DATA =====================
function fieldStyleClass(hasErr) { return 'field-input' + (hasErr ? ' err' : ''); }

function getQueueRows() {
  const { patients, filter, search, sortKey, sortDir } = state;
  let rows = filter === 'all' ? [...patients] : patients.filter(p => p.status === filter);
  const q = search.trim().toLowerCase();
  if (q) rows = rows.filter(p => (p.name + ' ' + p.payer + ' ' + p.member).toLowerCase().includes(q));
  if (sortKey) {
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let va, vb;
      if (sortKey === 'updated') { va = a.ts; vb = b.ts; }
      else { va = (a[sortKey] || '').toString().toLowerCase(); vb = (b[sortKey] || '').toString().toLowerCase(); }
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  } else {
    rows.sort((a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) || a.name.localeCompare(b.name));
  }
  return rows;
}

function getFlaggedRecord() { return state.patients.find(p => p.id === state.selectedId) || null; }

// ===================== ACTIONS =====================
function loadBatch() {
  setState({ batch: 'loading' });
  setTimer('batch', () => setState({ batch: 'loaded', patients: seedPatients() }), 800);
}
function loadBatchFromQueue() { setState({ view: 'intake' }); loadBatch(); }

function pushToast(title, body, accent) {
  const id = Date.now() + Math.random();
  setState(s => ({ toasts: [...s.toasts, { id, title, body, accent }] }));
  setTimeout(() => dismissToast(id), 4200);
}
function dismissToast(id) { setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) })); }

function flashRows(ids) {
  setState({ flashIds: new Set(ids) });
  setTimer('flash', () => setState({ flashIds: new Set() }), 1200);
}

function submitIntake() {
  if (state.submitting) return;
  const { name, dob, payer, memberId } = state.form;
  const err = {};
  if (!name.trim()) err.name = 'Patient name is required.';
  if (!dob) err.dob = 'Date of birth is required.';
  if (!payer) err.payer = 'Select a payer.';
  if (!memberId.trim()) err.memberId = 'Member ID is required.';
  if (Object.keys(err).length) { setState({ err }); return; }

  setState({ submitting: true });
  setTimer('submit', () => {
    const def = PAYERS.find(p => p.name === payer);
    const val = memberId.trim();
    const ok = def && def.re.test(val);
    const id = 'm' + Date.now();
    const base = { id, name: name.trim(), dob, payer, member: val, mrn: String(49000 + Math.floor(Math.random() * 900)), updated: 'just now', ts: 0, origin: 'manual' };
    if (ok) {
      setState(s => ({
        submitting: false, view: 'queue',
        patients: [{ ...base, status: 'confirmed' }, ...s.patients],
        form: { name: '', dob: '', payer: '', memberId: '' }, err: {},
      }));
      flashRows([id]);
      pushToast('Eligibility confirmed', name.trim() + ' added to the queue.', '#22C55E');
    } else {
      const diag = {
        field: 'member_id',
        rule: (def ? def.name.split(' ')[0].toLowerCase() : 'payer') + '.format',
        expected: def ? def.readable : '—',
        actual: val + '  (does not match)',
      };
      const suggestion = def
        ? `The Member ID entered doesn't match ${payer}'s format (${def.readable}). Suggested correction: ${def.example}. Confirm to re-verify.`
        : 'Member ID could not be validated against the payer format.';
      const rec = { ...base, status: 'flagged', diag, suggestion, suggested: def ? def.example : val };
      setState(s => ({
        submitting: false, view: 'flagged', selectedId: id,
        detail: { phase: 'idle', editing: false, editValue: '', sugLoading: true, attempts: [] },
        patients: [rec, ...s.patients],
        form: { name: '', dob: '', payer: '', memberId: '' }, err: {},
      }));
      setTimer('sug', () => setState(s => ({ detail: { ...s.detail, sugLoading: false } })), 1400);
    }
  }, 850);
}

function openFlagged(id) {
  setState({ view: 'flagged', selectedId: id, detail: { phase: 'idle', editing: false, editValue: '', sugLoading: true, attempts: [] } });
  setTimer('sug', () => setState(s => ({ detail: { ...s.detail, sugLoading: false } })), 1400);
}

function startEdit() {
  const rec = getFlaggedRecord();
  setState(s => ({ detail: { ...s.detail, editing: true, editValue: rec ? rec.member : '', phase: 'idle' } }));
}
function cancelEdit() { setState(s => ({ detail: { ...s.detail, editing: false, phase: 'idle' } })); }

function confirmReverify() {
  const rec = getFlaggedRecord();
  if (!rec) return;
  const value = state.detail.editing ? state.detail.editValue.trim() : rec.suggested;
  reverify(value);
}

function reverify(value) {
  setState(s => ({ detail: { ...s.detail, phase: 'reverifying' } }));
  setTimer('reverify', () => {
    const rec = getFlaggedRecord();
    if (!rec) return;
    const def = PAYERS.find(p => p.name === rec.payer);
    const ok = def && def.re.test((value || '').trim());
    const now = Date.now();
    if (ok) {
      setState(s => ({
        detail: { ...s.detail, phase: 'passed', attempts: [...(s.detail.attempts || []), { time: now, result: 'passed', value }] },
        patients: s.patients.map(p => p.id === rec.id ? { ...p, status: 'confirmed', member: value.trim(), updated: 'just now', ts: 0 } : p),
      }));
      setTimer('redir', () => {
        flashRows([rec.id]);
        pushToast('Re-verification passed', rec.name + ' is now confirmed.', '#22C55E');
        setState({ view: 'queue', selectedId: null, detail: null });
      }, 1800);
    } else {
      setState(s => ({
        detail: {
          ...s.detail, phase: 'failed', editing: true,
          editValue: s.detail.editing ? s.detail.editValue : rec.member,
          attempts: [...(s.detail.attempts || []), { time: now, result: 'failed', value }],
        },
      }));
    }
  }, 900);
}

function toggleRow(id) {
  setState(s => {
    const sel = new Set(s.selectedRows);
    if (sel.has(id)) sel.delete(id); else sel.add(id);
    return { selectedRows: sel };
  });
}

function bulkApply() {
  const ids = [...state.selectedRows];
  if (!ids.length) return;
  let passCount = 0, failCount = 0;
  setState(s => {
    const patients = s.patients.map(p => {
      if (!ids.includes(p.id) || p.status !== 'flagged') return p;
      const def = PAYERS.find(x => x.name === p.payer);
      const ok = def && def.re.test((p.suggested || '').trim());
      if (ok) { passCount++; return { ...p, status: 'confirmed', member: p.suggested, updated: 'just now', ts: 0 }; }
      failCount++; return p;
    });
    return { patients, selectedRows: new Set(), flashIds: new Set(ids) };
  });
  setTimer('flash', () => setState({ flashIds: new Set() }), 1200);
  pushToast(
    passCount > 0 ? 'Bulk suggestions applied' : 'No records updated',
    `${passCount} confirmed${failCount ? ', ' + failCount + ' still need review' : ''}.`,
    passCount > 0 ? '#22C55E' : '#F59E0B'
  );
}

function doSort(key) {
  setState(s => ({ sortKey: key, sortDir: s.sortKey === key && s.sortDir === 'asc' ? 'desc' : 'asc' }));
}

// ===================== COMMAND PALETTE =====================
function getPaletteItems() {
  const q = state.paletteQuery.trim().toLowerCase();
  const navItems = [
    { icon: '⌂', title: 'Go to Intake', sub: 'Load a batch or add a patient', run: () => setState({ view: 'intake', paletteOpen: false }) },
    { icon: '☰', title: 'Go to Queue', sub: 'Live eligibility status', run: () => setState({ view: 'queue', paletteOpen: false }) },
    { icon: '⚙', title: 'Go to Payer Config', sub: 'Member ID format reference + tester', run: () => setState({ view: 'config', paletteOpen: false }) },
  ];
  const navFiltered = q ? navItems.filter(n => n.title.toLowerCase().includes(q)) : navItems;
  const patientItems = state.patients
    .filter(p => !q || (p.name + ' ' + p.payer + ' ' + p.member).toLowerCase().includes(q))
    .slice(0, 6)
    .map(p => ({
      icon: p.status === 'flagged' ? '⚑' : p.status === 'confirmed' ? '✓' : '•',
      title: p.name,
      sub: p.payer + ' · ' + p.member,
      run: () => {
        if (p.status === 'flagged') openFlagged(p.id); else setState({ drawerId: p.id });
        setState({ paletteOpen: false });
      },
    }));
  return [...navFiltered, ...patientItems];
}

// ===================== RENDER: SHARED PIECES =====================
function toastStack() {
  return `<div class="toast-stack">${state.toasts.map(t => `
    <div class="toast">
      <span class="toast-dot" style="background:${t.accent}"></span>
      <div style="flex:1">
        <div class="toast-title">${escapeHtml(t.title)}</div>
        <div class="toast-body">${escapeHtml(t.body)}</div>
      </div>
      <button class="toast-close" data-action="dismissToast" data-tid="${t.id}">✕</button>
    </div>`).join('')}</div>`;
}

function drawerHtml() {
  const rec = state.patients.find(p => p.id === state.drawerId);
  if (!rec) return '';
  return `<div class="overlay" data-action="closeDrawer">
    <div class="drawer" data-action="noop">
      <div class="drawer-head">
        <div>
          <div class="drawer-eyebrow">Patient record</div>
          <div class="drawer-title">${escapeHtml(rec.name)}</div>
        </div>
        <button class="drawer-close" data-action="closeDrawer">✕</button>
      </div>
      <div class="drawer-body">
        <div style="margin-bottom:18px">${statusBadge(rec.status)}</div>
        <div class="kv">
          <div class="kv-row"><span>DOB</span><span>${escapeHtml(rec.dob)}</span></div>
          <div class="kv-row"><span>Payer</span><span>${escapeHtml(rec.payer)}</span></div>
          <div class="kv-row"><span>Member ID</span><span style="font-family:var(--font-mono)">${escapeHtml(rec.member)}</span></div>
          <div class="kv-row"><span>MRN</span><span>#${escapeHtml(rec.mrn)}</span></div>
          <div class="kv-row"><span>Source</span><span>${rec.origin === 'batch' ? 'Seeded batch' : 'Manual entry'}</span></div>
          <div class="kv-row"><span>Last updated</span><span>${escapeHtml(rec.updated)}</span></div>
        </div>
        <div class="hint-text" style="margin-top:16px">This record is ${rec.status} — no action required. Flagged records open the full resolution view instead.</div>
      </div>
      <div class="drawer-foot">
        <button class="btn btn-secondary" data-action="closeDrawer">Close</button>
      </div>
    </div>
  </div>`;
}

function paletteHtml() {
  if (!state.paletteOpen) return '';
  const items = getPaletteItems();
  return `<div class="palette-overlay" data-action="closePalette">
    <div class="palette" data-action="noop">
      <input class="palette-input" type="text" placeholder="Search patients, jump to a page…" autofocus
        data-bind="paletteQuery" data-focus-key="paletteQuery" value="${escapeHtml(state.paletteQuery)}">
      <div class="palette-list">
        ${items.length === 0 ? `<div class="palette-empty">No matches for “${escapeHtml(state.paletteQuery)}”.</div>` :
          items.map((it, i) => `
          <div class="palette-item${i === state.paletteSel ? ' sel' : ''}" data-action="paletteRun" data-idx="${i}">
            <div class="pi-icon">${it.icon}</div>
            <div style="flex:1"><div class="pi-title">${escapeHtml(it.title)}</div><div class="pi-sub">${escapeHtml(it.sub)}</div></div>
          </div>`).join('')}
      </div>
      <div class="palette-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>`;
}

// ===================== RENDER: SIDEBAR =====================
const NAV_ICONS = {
  intake: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11v2.3a1 1 0 001 1h9a1 1 0 001-1V11"/><path d="M9 2.8v7.4M9 10.2l-3-3M9 10.2l3-3"/></svg>`,
  queue: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h12M3 9h12M3 13h7.5"/></svg>`,
  config: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 13.2V9.6M4.5 6.4V3.2M9 13.2V7.8M9 5.4V3.2M13.5 13.2V10.6M13.5 8.2V3.2"/><circle cx="4.5" cy="7.9" r="1.6"/><circle cx="9" cy="6.6" r="1.6"/><circle cx="13.5" cy="9.4" r="1.6"/></svg>`,
};

function sidebarProgress() {
  const total = state.patients.length;
  if (total === 0) return '';
  const confirmed = state.patients.filter(p => p.status === 'confirmed').length;
  const flagged = state.patients.filter(p => p.status === 'flagged').length;
  const pending = total - confirmed - flagged;
  const pct = Math.round((confirmed / total) * 100);
  return `<div class="sidebar-progress">
    <div class="sp-head"><span>Queue progress</span><span class="sp-pct">${pct}%</span></div>
    <div class="sp-bar">
      <div class="sp-seg" style="width:${confirmed / total * 100}%;background:var(--confirmed-dot)"></div>
      <div class="sp-seg" style="width:${flagged / total * 100}%;background:var(--flagged-dot)"></div>
      <div class="sp-seg" style="width:${pending / total * 100}%;background:var(--pending-dot)"></div>
    </div>
    <div class="sp-legend">
      <span><i style="background:var(--confirmed-dot)"></i>${confirmed} confirmed</span>
      <span><i style="background:var(--flagged-dot)"></i>${flagged} flagged</span>
      ${pending > 0 ? `<span><i style="background:var(--pending-dot)"></i>${pending} pending</span>` : ''}
    </div>
  </div>`;
}

function sidebarHtml() {
  const flaggedCount = state.patients.filter(p => p.status === 'flagged').length;
  const nav = [
    { key: 'intake', label: 'Intake' },
    { key: 'queue', label: 'Queue', badge: flaggedCount },
    { key: 'config', label: 'Payer Config' },
  ];
  return `<aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-mark"><i></i></div>
      <div>
        <div class="sidebar-brand-name">Verified</div>
        <div class="sidebar-brand-sub">RCM Eligibility</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${nav.map(n => {
        const active = state.view === n.key || (n.key === 'queue' && state.view === 'flagged');
        return `<div class="nav-item${active ? ' active' : ''}" data-action="nav" data-view="${n.key}">
          <span class="nav-bar"></span>
          <span class="nav-icon">${NAV_ICONS[n.key]}</span>
          <span class="nav-label">${n.label}</span>
          ${n.badge ? `<span class="nav-badge${n.badge > 0 ? ' pulse' : ''}">${n.badge}</span>` : ''}
        </div>`;
      }).join('')}
    </nav>
    ${sidebarProgress()}
    <div class="sidebar-kbd-hint" data-action="openPalette">
      <span>Search &amp; jump to…</span>
      <kbd>⌘K</kbd>
    </div>
    <div class="sidebar-foot">
      Front desk · Bay 3
      <b>Demo build v1.0 · live</b>
    </div>
  </aside>`;
}

// ===================== RENDER: INTAKE =====================
const ICON_CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.3v3.6"/><circle cx="8" cy="11.2" r="0.15" fill="currentColor" stroke-width="2.6"/></svg>';
function fieldCheck(status) {
  if (status === 'valid') return `<span class="field-check field-check-valid">${ICON_CHECK}</span>`;
  if (status === 'invalid') return `<span class="field-check field-check-invalid">${ICON_WARN}</span>`;
  return '';
}

function viewIntake() {
  const { batch, form, err, submitting } = state;
  const def = PAYERS.find(p => p.name === form.payer);
  const nameValid = form.name.trim().length > 0;
  const dobValid = !!form.dob;
  const payerValid = !!form.payer;
  const midTrim = form.memberId.trim();
  const midStatus = def && midTrim ? (def.re.test(midTrim) ? 'valid' : 'invalid') : null;
  const stepsDone = [nameValid, dobValid, payerValid, midStatus === 'valid'].filter(Boolean).length;
  return `<div class="view view-narrow">
    <div class="view-header">
      <h1 class="page-title">Intake</h1>
      <p class="page-sub">Load a batch for verification, or enter a patient manually.</p>
    </div>
    <div class="two-col" style="grid-template-columns:1fr 1fr">
      <div class="card">
        <div class="card-head">
          <div class="card-title">Load seeded batch</div>
          <div class="card-subtitle">Simulate an overnight ingestion run.</div>
        </div>
        <div class="card-body">
          ${batch === 'idle' ? `
            <button class="btn btn-primary btn-block" data-action="loadBatch">Load 12 seeded patients</button>
            <div class="hint-text" style="margin-top:13px">Ingests a fixed set of records. Safe to re-run at any time to reset the demo.</div>
          ` : ''}
          ${batch === 'loading' ? `
            <div style="display:flex;align-items:center;gap:12px;padding:11px 4px;color:var(--zinc-600)">
              <span class="spinner spinner-light"></span>
              <span style="font-size:var(--fs-body-sm);font-weight:500">Ingesting batch…</span>
            </div>
          ` : ''}
          ${batch === 'loaded' ? `
            <div style="animation:fadein .22s ease-out">
              <div style="display:flex;align-items:baseline;gap:6px;font-size:var(--fs-body);font-weight:600;margin-bottom:15px;flex-wrap:wrap">
                <span style="color:var(--confirmed-text)">12 patients loaded</span><span style="color:var(--zinc-400);font-weight:400">·</span>
                <span style="color:var(--zinc-600);font-weight:500">8 clean,</span><span style="color:var(--flagged-text);font-weight:600">4 flagged</span>
              </div>
              <div style="display:flex;gap:10px">
                <button class="btn btn-primary" data-action="goQueue">Go to Queue →</button>
                <button class="btn btn-secondary" data-action="loadBatch">Re-run</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-head" style="display:flex;align-items:center;justify-content:space-between;gap:14px">
          <div>
            <div class="card-title">Manual entry</div>
            <div class="card-subtitle">Add and verify a single patient.</div>
          </div>
          <div class="form-progress">
            <div class="fp-dots">
              <span class="fp-dot${nameValid ? ' done' : ''}"></span>
              <span class="fp-dot${dobValid ? ' done' : ''}"></span>
              <span class="fp-dot${payerValid ? ' done' : ''}"></span>
              <span class="fp-dot${midStatus === 'valid' ? ' done' : ''}"></span>
            </div>
            <div class="fp-label">${stepsDone} of 4 ready</div>
          </div>
        </div>
        <div class="card-body">
          <div class="field">
            <label class="field-label">Patient name</label>
            <div class="field-input-wrap">
              <input type="text" class="${fieldStyleClass(!!err.name)}" placeholder="Last, First"
                data-bind="form.name" data-focus-key="form.name" value="${escapeHtml(form.name)}">
              ${fieldCheck(nameValid ? 'valid' : null)}
            </div>
            ${err.name ? `<div class="field-err">${escapeHtml(err.name)}</div>` : ''}
          </div>
          <div class="field-row">
            <div>
              <label class="field-label">Date of birth</label>
              <input type="date" class="${fieldStyleClass(!!err.dob)}" data-bind="form.dob" data-focus-key="form.dob" value="${escapeHtml(form.dob)}">
              ${err.dob ? `<div class="field-err">${escapeHtml(err.dob)}</div>` : ''}
            </div>
            <div>
              <label class="field-label">Payer</label>
              <select class="${fieldStyleClass(!!err.payer)}" data-bind="form.payer" data-focus-key="form.payer">
                <option value="">Select payer…</option>
                ${PAYERS.map(p => `<option value="${escapeHtml(p.name)}" ${form.payer === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
              </select>
              ${err.payer ? `<div class="field-err">${escapeHtml(err.payer)}</div>` : ''}
            </div>
          </div>
          <div class="field">
            <label class="field-label">Member ID</label>
            <div class="field-input-wrap">
              <input type="text" class="${fieldStyleClass(!!err.memberId)}${midStatus === 'valid' ? ' valid' : ''}${midStatus === 'invalid' ? ' invalid' : ''}" placeholder="${def ? escapeHtml(def.example) : 'Member ID'}"
                data-bind="form.memberId" data-focus-key="form.memberId" value="${escapeHtml(form.memberId)}">
              ${fieldCheck(midStatus)}
            </div>
            <div class="field-hint${midStatus === 'invalid' ? ' field-hint-warn' : ''}">${def ? escapeHtml(def.hint) : 'Select a payer to see its ID format.'}</div>
            ${err.memberId ? `<div class="field-err">${escapeHtml(err.memberId)}</div>` : ''}
          </div>
          <button class="btn btn-primary btn-block" data-action="submitIntake" ${submitting ? 'disabled' : ''}>
            ${submitting ? `<span class="spinner"></span> Checking eligibility…` : 'Verify eligibility'}
          </button>
          <div class="hint-text" style="margin-top:11px">Tip: an ID matching the payer format clears instantly (watch the check mark); anything else routes to Flagged Detail with an AI-suggested fix.</div>
        </div>
      </div>
    </div>

    <div class="feature-strip">
      <div class="feature-tile">
        <div class="fi"><i></i></div>
        <h4>Real-time payer rules</h4>
        <p>Six payer formats validated instantly against a deterministic rule engine — no round trip required.</p>
      </div>
      <div class="feature-tile">
        <div class="fi"><i></i></div>
        <h4>AI-assisted correction</h4>
        <p>Every flagged record gets a suggested Member ID, with a character-level diff showing exactly what changed.</p>
      </div>
      <div class="feature-tile">
        <div class="fi"><i></i></div>
        <h4>Full audit trail</h4>
        <p>Every verification attempt is timestamped and kept with the record, from ingestion to confirmation.</p>
      </div>
    </div>
  </div>`;
}

// ===================== RENDER: QUEUE =====================
function viewQueue() {
  const { patients, filter, search, sortKey, sortDir, selectedRows } = state;

  if (patients.length === 0) {
    return `<div class="view">
      <div class="view-header">
        <h1 class="page-title">Patient queue</h1>
        <p class="page-sub">Live eligibility status across today's intake.</p>
      </div>
      <div class="card" style="background:var(--zinc-50);padding:70px 20px;text-align:center;border-style:dashed">
        <div style="font-size:var(--fs-card-title);font-weight:600;color:var(--zinc-600);margin-bottom:7px">No patients in the queue yet</div>
        <div style="font-size:var(--fs-body-sm);color:var(--zinc-400);margin-bottom:22px">Load a seeded batch to populate the dashboard.</div>
        <button class="btn btn-primary" data-action="loadBatchFromQueue">Load seeded batch</button>
      </div>
    </div>`;
  }

  const counts = { all: patients.length, pending: 0, flagged: 0, confirmed: 0 };
  patients.forEach(p => counts[p.status]++);
  const cleanRate = patients.length ? Math.round((counts.confirmed / patients.length) * 100) : 0;

  const chipDef = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'flagged', label: 'Flagged', count: counts.flagged },
    { key: 'confirmed', label: 'Confirmed', count: counts.confirmed },
  ];

  const rows = getQueueRows();
  const arrow = (k) => sortKey === k ? `<span class="th-sort-arrow">${sortDir === 'asc' ? '▲' : '▼'}</span>` : '<span class="th-sort-arrow"></span>';
  const columns = [
    { key: 'name', label: 'Name' }, { key: 'payer', label: 'Payer' }, { key: 'member', label: 'Member ID' },
    { key: 'status', label: 'Status' }, { key: 'updated', label: 'Last Updated', right: true },
  ];

  return `<div class="view">
    <div class="view-header">
      <h1 class="page-title">Patient queue</h1>
      <p class="page-sub">Live eligibility status across today's intake.</p>
    </div>

    <div class="stat-band">
      <div class="stat-tile">
        <div class="stat-tile-label">Total</div>
        <div class="stat-tile-value">${counts.all}</div>
        <div class="stat-tile-sub">records in queue</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label"><span class="stat-dot" style="background:var(--pending-dot)"></span>Pending</div>
        <div class="stat-tile-value">${counts.pending}</div>
        <div class="stat-tile-sub">awaiting first check</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label"><span class="stat-dot" style="background:var(--flagged-dot)"></span>Flagged</div>
        <div class="stat-tile-value">${counts.flagged}</div>
        <div class="stat-tile-sub">need a human look</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label"><span class="stat-dot" style="background:var(--confirmed-dot)"></span>Confirmed</div>
        <div class="stat-tile-value">${counts.confirmed}</div>
        <div class="stat-tile-sub">verified with payer</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Clean rate</div>
        <div class="stat-tile-value">${cleanRate}%</div>
        <div class="composition-bar">
          <div class="composition-seg" style="width:${counts.all ? counts.pending / counts.all * 100 : 0}%;background:var(--pending-dot)"></div>
          <div class="composition-seg" style="width:${counts.all ? counts.flagged / counts.all * 100 : 0}%;background:var(--flagged-dot)"></div>
          <div class="composition-seg" style="width:${counts.all ? counts.confirmed / counts.all * 100 : 0}%;background:var(--confirmed-dot)"></div>
        </div>
      </div>
    </div>

    <div class="chip-row">
      ${chipDef.map(c => `<button class="chip${filter === c.key ? ' active' : ''}" data-action="filter" data-filter="${c.key}">
        <span>${c.label}</span><span class="chip-count">${c.count}</span>
      </button>`).join('')}
      <div class="search-box">
        <span class="search-icon"></span>
        <input type="text" placeholder="Search name, payer, member ID…" data-bind="search" data-focus-key="search" value="${escapeHtml(search)}">
      </div>
    </div>

    ${selectedRows.size > 0 ? `
    <div class="bulk-bar">
      <span><b>${selectedRows.size}</b> flagged record${selectedRows.size > 1 ? 's' : ''} selected</span>
      <button class="btn btn-primary btn-sm" data-action="bulkApply">Apply AI suggestions</button>
      <button class="btn btn-ghost btn-sm" style="color:#8CA0B8" data-action="clearSelection">Clear</button>
    </div>` : ''}

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="checkcol"></th>
            ${columns.map(c => `<th style="${c.right ? 'text-align:right' : ''}" data-action="sort" data-key="${c.key}">
              <span style="display:inline-flex;align-items:center;gap:6px">${c.label}${arrow(c.key)}</span>
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => {
            const flashCls = state.flashIds.has(p.id) ? ' row-flash' : '';
            const flagCls = p.status === 'flagged' ? ' row-flagged' : '';
            const selCls = selectedRows.has(p.id) ? ' row-selected' : '';
            return `<tr class="${(flagCls + flashCls + selCls).trim()}" data-action="rowClick" data-id="${p.id}">
              <td class="checkcol">${p.status === 'flagged' ? `<input type="checkbox" class="checkbox" data-action="toggleRow" data-id="${p.id}" ${selectedRows.has(p.id) ? 'checked' : ''}>` : ''}</td>
              <td><div class="cell-primary">${escapeHtml(p.name)}</div><div class="cell-sub">DOB ${escapeHtml(p.dob)}</div></td>
              <td>${escapeHtml(p.payer)}</td>
              <td class="cell-mono">${escapeHtml(p.member)}</td>
              <td>${statusBadge(p.status)}</td>
              <td class="cell-right">${escapeHtml(p.updated)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${rows.length === 0 ? `<div class="table-empty">No patients match this filter.</div>` : ''}
    </div>
    <div class="hint-text" style="margin-top:11px">Flagged rows sort to the top and tint amber. Click a flagged row to resolve it, tick its box to bulk-apply, or click any other row for a read-only summary.</div>
  </div>`;
}

// ===================== RENDER: FLAGGED DETAIL =====================
function viewFlagged() {
  const rec = getFlaggedRecord();
  if (!rec) return viewQueue();
  const def = PAYERS.find(p => p.name === rec.payer);
  const d = state.detail || {};
  const diff = charDiff(rec.member, rec.suggested || '');

  const trail = [
    { label: rec.origin === 'batch' ? 'Batch ingested' : 'Manual entry submitted', time: rec.updated, state: 'done' },
    { label: 'Eligibility check failed — routed to Flagged', time: rec.updated, state: 'flag' },
    ...(d.attempts || []).map(a => ({
      label: a.result === 'passed' ? 'Re-verification passed' : `Re-verification failed — "${a.value}"`,
      time: relTime(a.time), state: a.result === 'passed' ? 'done' : 'flag',
    })),
    ...(d.phase === 'reverifying' ? [{ label: 'Re-verifying…', time: 'now', state: 'active' }] : []),
  ];

  return `<div class="view">
    <span class="link-back" data-action="backToQueue">← Back to queue</span>
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:6px;flex-wrap:wrap">
      <h1 class="page-title" style="margin:0">${escapeHtml(rec.name)}</h1>
      ${statusBadge('flagged')}
    </div>
    <div style="font-size:var(--fs-body-sm);color:var(--zinc-500);margin-bottom:26px">${escapeHtml(rec.payer)} · DOB ${escapeHtml(rec.dob)} · #${escapeHtml(rec.mrn)}</div>

    <div class="two-col">
      <div>
        <div class="card section-gap">
          <div class="card-head">
            <div class="card-title">Patient context</div>
          </div>
          <div style="padding:18px 20px">
            <div class="kv">
              <div class="kv-row"><span>DOB</span><span>${escapeHtml(rec.dob)}</span></div>
              <div class="kv-row"><span>Payer</span><span>${escapeHtml(rec.payer)}</span></div>
              <div class="kv-row"><span>Member ID entered</span><span style="font-family:var(--font-mono)">${escapeHtml(rec.member)}</span></div>
              <div class="kv-row"><span>MRN</span><span>#${escapeHtml(rec.mrn)}</span></div>
              <div class="kv-row"><span>Source</span><span>${rec.origin === 'batch' ? 'Seeded batch' : 'Manual entry'}</span></div>
            </div>
          </div>
        </div>

        <div class="card section-gap">
          <div class="card-head" style="display:flex;align-items:center;justify-content:space-between">
            <div class="card-title">What failed</div>
            <div class="pill-mini">Deterministic rule check</div>
          </div>
          <div class="diag-box">
            <div><span class="k">Field:</span><span class="v-field">${escapeHtml(rec.diag.field)}</span></div>
            <div><span class="k">Rule:</span><span class="v-field">${escapeHtml(rec.diag.rule)}</span></div>
            <div><span class="k">Expected:</span><span class="v-exp">${escapeHtml(rec.diag.expected)}</span></div>
            <div><span class="k">Actual:</span><span class="v-act">${escapeHtml(rec.diag.actual)}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title">Audit trail</div></div>
          <div style="padding:20px 22px 4px">
            <div class="trail">
              ${trail.map(t => `<div class="trail-item ${t.state}">
                <div class="trail-title">${escapeHtml(t.label)}</div>
                <div class="trail-time">${escapeHtml(t.time)}</div>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card card-tint section-gap">
          <div style="padding:16px 18px 14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:13px">
              <div style="width:17px;height:17px;border-radius:4px;background:var(--cyan-600);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;border-radius:1px;background:var(--cyan-50)"></div></div>
              <div style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--cyan-600)">AI-generated suggestion</div>
            </div>
            ${d.sugLoading ? `
              <div style="display:flex;align-items:center;gap:11px;color:#0E7490;padding:4px 0 6px">
                <span class="spinner spinner-cyan"></span><span style="font-size:var(--fs-body-sm);font-weight:500">Generating suggestion…</span>
              </div>
            ` : `
              <div style="animation:fadein .22s ease-out">
                <div style="font-size:var(--fs-body);line-height:1.65;color:var(--zinc-900);margin-bottom:16px">${escapeHtml(rec.suggestion)}</div>

                <div style="background:var(--white);border:1px solid var(--cyan-border);border-radius:var(--radius-sm);padding:13px 15px;margin-bottom:${d.editing ? '14px' : '2px'}">
                  <div class="diff-line" style="margin-bottom:8px"><span class="diff-label">Entered</span>${renderDiffChars(diff.a)}</div>
                  <div class="diff-line"><span class="diff-label">Suggested</span>${renderDiffChars(diff.b)}</div>
                </div>

                ${d.editing ? `
                  <div style="margin-top:4px">
                    <label class="field-label" style="color:var(--cyan-700,#0E7490)">Corrected Member ID</label>
                    <input type="text" class="field-input" style="font-family:var(--font-mono);border-color:var(--cyan-border)"
                      data-bind="editValue" data-focus-key="editValue" value="${escapeHtml(d.editValue)}">
                    <div class="field-hint">${def ? escapeHtml(def.hint) : ''}</div>
                  </div>
                ` : ''}
              </div>
            `}
          </div>
        </div>

        ${d.phase === 'passed' ? `
          <div class="banner banner-pass section-gap">
            <span style="font-size:16px">✓</span>
            <div><span class="banner-title">Re-verification passed</span> <span class="banner-sub">— returning to queue…</span></div>
          </div>
        ` : ''}
        ${d.phase === 'failed' ? `
          <div class="banner banner-fail section-gap" style="display:block">
            <div class="banner-title">Still doesn't match — try again</div>
            <div class="banner-sub" style="display:block;margin-top:3px">The value entered still fails the ${escapeHtml(rec.diag.rule)} rule. Edit the Member ID and re-verify.</div>
          </div>
        ` : ''}

        ${d.phase !== 'passed' ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${d.phase === 'reverifying' ? `
              <button class="btn btn-primary" disabled><span class="spinner"></span> Re-verifying…</button>
            ` : `
              <button class="btn btn-primary" data-action="confirmReverify">${d.editing ? 'Re-verify' : 'Confirm & re-verify'}</button>
              ${!d.editing ? `<button class="btn btn-secondary" data-action="startEdit">Edit manually</button>` : `<button class="btn btn-secondary" data-action="cancelEdit">Cancel edit</button>`}
            `}
          </div>
          <div class="hint-text" style="margin-top:13px">The suggested value is never applied automatically — it takes effect only when you confirm or edit and re-verify.</div>
        ` : ''}
      </div>
    </div>
  </div>`;
}

// ===================== RENDER: PAYER CONFIG =====================
function viewConfig() {
  const { tester } = state;
  const def = PAYERS.find(p => p.name === tester.payer);
  let testerBox;
  if (!tester.payer) {
    testerBox = `<div class="tester-result tester-idle">Select a payer to test a Member ID live.</div>`;
  } else if (!tester.value.trim()) {
    testerBox = `<div class="tester-result tester-idle">Type a Member ID above to test it against ${escapeHtml(tester.payer)}'s format.</div>`;
  } else {
    const ok = def.re.test(tester.value.trim());
    if (ok) {
      testerBox = `<div class="tester-result tester-pass"><strong>✓ Matches</strong>&nbsp; ${escapeHtml(tester.payer)}'s format (${escapeHtml(def.readable)}).</div>`;
    } else {
      const diff = charDiff(tester.value.trim(), def.example);
      testerBox = `<div class="tester-result tester-fail" style="display:block">
        <div><strong>✕ Doesn't match</strong>&nbsp; expected ${escapeHtml(def.readable)} — e.g. <span style="font-family:var(--font-mono)">${escapeHtml(def.example)}</span></div>
        <div class="diff-line" style="margin-top:9px;font-size:13px"><span class="diff-label">vs example</span>${renderDiffChars(diff.a)}</div>
      </div>`;
    }
  }

  return `<div class="view view-narrow">
    <div class="view-header">
      <h1 class="page-title">Payer config</h1>
      <p class="page-sub">Reference for the Member ID rules each payer enforces, plus a live format tester.</p>
    </div>

    <div class="card section-gap" style="margin-bottom:26px">
      <div class="card-head">
        <div class="card-title">Format tester</div>
        <div class="card-subtitle">Type any Member ID and see instantly whether it clears — the same check used across the app.</div>
      </div>
      <div class="card-body">
        <div class="field-row" style="margin-bottom:0">
          <div>
            <label class="field-label">Payer</label>
            <select class="field-input" data-bind="tester.payer" data-focus-key="tester.payer">
              <option value="">Select payer…</option>
              ${PAYERS.map(p => `<option value="${escapeHtml(p.name)}" ${tester.payer === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label">Member ID to test</label>
            <input type="text" class="field-input" style="font-family:var(--font-mono)" placeholder="${def ? escapeHtml(def.example) : 'e.g. AE-3082-A'}"
              data-bind="tester.value" data-focus-key="tester.value" value="${escapeHtml(tester.value)}">
          </div>
        </div>
        ${testerBox}
      </div>
    </div>

    <div class="grid3" style="grid-template-columns:1fr 1fr">
      ${PAYERS.map(p => `
        <div class="card" style="background:var(--zinc-50)">
          <div style="padding:17px 19px">
            <div class="card-title" style="margin-bottom:13px">${escapeHtml(p.name)}</div>
            <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:9px">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">Format</span>
              <span style="font-size:var(--fs-body-sm);color:var(--zinc-700)">${escapeHtml(p.readable)}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:9px">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">Example</span>
              <span style="font-family:var(--font-mono);font-size:var(--fs-mono);color:var(--zinc-600)">${escapeHtml(p.example)}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:9px">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">Rule</span>
              <span style="font-size:var(--fs-hint);color:var(--zinc-500);line-height:1.5">${escapeHtml(p.rule)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ===================== APP ROOT =====================
function App() {
  const views = { intake: viewIntake, queue: viewQueue, flagged: viewFlagged, config: viewConfig };
  const view = views[state.view] || viewIntake;
  return `${sidebarHtml()}<main>${view()}</main>${drawerHtml()}${toastStack()}${paletteHtml()}`;
}

// ===================== RENDER LOOP (focus-preserving) =====================
const root = document.getElementById('app');

function render() {
  const active = document.activeElement;
  let focusKey = null, selStart = null, selEnd = null;
  if (active && active.dataset && active.dataset.focusKey) {
    focusKey = active.dataset.focusKey;
    if ('selectionStart' in active) { try { selStart = active.selectionStart; selEnd = active.selectionEnd; } catch (e) {} }
  }
  root.innerHTML = App();
  if (focusKey) {
    const el = root.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    if (el) {
      el.focus();
      if (selStart != null && 'setSelectionRange' in el) { try { el.setSelectionRange(selStart, selEnd); } catch (e) {} }
    }
  }
}

// ===================== EVENT DELEGATION =====================
function handleBind(bind, value) {
  switch (bind) {
    case 'form.name': setState(s => ({ form: { ...s.form, name: value }, err: { ...s.err, name: undefined } })); break;
    case 'form.dob': setState(s => ({ form: { ...s.form, dob: value }, err: { ...s.err, dob: undefined } })); break;
    case 'form.payer': setState(s => ({ form: { ...s.form, payer: value }, err: { ...s.err, payer: undefined } })); break;
    case 'form.memberId': setState(s => ({ form: { ...s.form, memberId: value }, err: { ...s.err, memberId: undefined } })); break;
    case 'editValue': setState(s => ({ detail: { ...s.detail, editValue: value } })); break;
    case 'search': setState({ search: value }); break;
    case 'tester.payer': setState(s => ({ tester: { ...s.tester, payer: value } })); break;
    case 'tester.value': setState(s => ({ tester: { ...s.tester, value } })); break;
    case 'paletteQuery': setState({ paletteQuery: value, paletteSel: 0 }); break;
  }
}

const Actions = {
  nav(el) { setState({ view: el.dataset.view, drawerId: null }); },
  loadBatch() { loadBatch(); },
  loadBatchFromQueue() { loadBatchFromQueue(); },
  goQueue() { setState({ view: 'queue' }); },
  backToQueue() { setState({ view: 'queue', selectedId: null, detail: null }); },
  submitIntake() { submitIntake(); },
  sort(el) { doSort(el.dataset.key); },
  filter(el) { setState({ filter: el.dataset.filter }); },
  rowClick(el) {
    const p = state.patients.find(x => x.id === el.dataset.id);
    if (!p) return;
    if (p.status === 'flagged') openFlagged(p.id); else setState({ drawerId: p.id });
  },
  toggleRow(el) { toggleRow(el.dataset.id); },
  clearSelection() { setState({ selectedRows: new Set() }); },
  bulkApply() { bulkApply(); },
  startEdit() { startEdit(); },
  cancelEdit() { cancelEdit(); },
  confirmReverify() { confirmReverify(); },
  openDrawer(el) { setState({ drawerId: el.dataset.id }); },
  closeDrawer() { setState({ drawerId: null }); },
  dismissToast(el) { dismissToast(Number(el.dataset.tid)); },
  openPalette() { setState({ paletteOpen: true, paletteQuery: '', paletteSel: 0 }); },
  closePalette() { setState({ paletteOpen: false }); },
  paletteRun(el) { const items = getPaletteItems(); const it = items[Number(el.dataset.idx)]; if (it) it.run(); },
  noop() {},
};

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = Actions[el.dataset.action];
  if (fn) fn(el, e);
});

root.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.bind) handleBind(el.dataset.bind, el.value);
});
root.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.bind) handleBind(el.dataset.bind, el.value);
});
root.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const el = e.target;
    if (el && el.dataset && el.dataset.bind && el.dataset.bind.startsWith('form.') && el.tagName !== 'SELECT') {
      e.preventDefault();
      submitIntake();
    }
  }
});

window.addEventListener('keydown', (e) => {
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    setState(s => ({ paletteOpen: !s.paletteOpen, paletteQuery: '', paletteSel: 0 }));
    return;
  }
  if (e.key === 'Escape') {
    if (state.paletteOpen) { setState({ paletteOpen: false }); return; }
    if (state.drawerId) { setState({ drawerId: null }); return; }
  }
  if (state.paletteOpen) {
    const items = getPaletteItems();
    if (e.key === 'ArrowDown') { e.preventDefault(); setState(s => ({ paletteSel: Math.min(s.paletteSel + 1, Math.max(items.length - 1, 0)) })); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setState(s => ({ paletteSel: Math.max(s.paletteSel - 1, 0) })); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[state.paletteSel]; if (it) it.run(); }
  }
});

// ===================== INIT =====================
render();
