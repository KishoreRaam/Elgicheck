// ===================== DATA =====================
const PAYERS = [
  { name: 'Aetna PPO',        readable: '2 letters · 4 digits · 1 letter', example: 'AE-3082-A',    hint: 'Aetna format: XX-NNNN-A',              rule: 'Two alpha, four digits, one trailing alpha, dash-separated.', re: /^[A-Za-z]{2}-\d{4}-[A-Za-z]$/,
    sample_deductible: '₹1,24,500 individual / ₹2,49,000 family', out_of_network_ucr_note: 'Out-of-network reimbursed at 70% of UCR; member balance-billed for the remainder.' },
  { name: 'UnitedHealthcare', readable: '9 digits',                        example: '493210087',     hint: 'UHC format: 9 digits',                 rule: 'Exactly nine numeric digits, no separators.',                 re: /^\d{9}$/ },
  { name: 'Cigna OAP',        readable: 'U + 8 digits',                    example: 'U40021398',     hint: 'Cigna format: U + 8 digits',           rule: 'Leading U followed by eight numeric digits.',                 re: /^[Uu]\d{8}$/,
    sample_deductible: '₹62,250 individual / ₹1,24,500 family', out_of_network_ucr_note: 'Out-of-network UCR cap set at the 80th percentile; no balance-billing protection.' },
  { name: 'BCBS TX',          readable: '3 letters + 9 digits',            example: 'BCT004521190',  hint: 'BCBS format: 3-letter prefix + 9 digits', rule: 'Three-letter plan prefix then nine numeric digits.',       re: /^[A-Za-z]{3}\d{9}$/,
    sample_deductible: '₹1,66,000 individual / ₹3,32,000 family', out_of_network_ucr_note: 'Out-of-network claims priced at 60% of billed charges vs. UCR, whichever is lower.' },
  { name: 'Humana Gold',      readable: 'H + 8 digits',                    example: 'H55830921',     hint: 'Humana format: H + 8 digits',          rule: 'Leading H followed by eight numeric digits.',                 re: /^[Hh]\d{8}$/ },
  { name: 'Kaiser',           readable: '10 digits',                       example: '6120094475',    hint: 'Kaiser format: 10 digits',             rule: 'Exactly ten numeric digits, no separators.',                  re: /^\d{10}$/,
    sample_deductible: '₹0 individual (HMO, in-network only)', out_of_network_ucr_note: 'Out-of-network care is not covered except emergencies — no UCR schedule applies.' },
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
    C('Reddy, Ananya', '1994-05-12', 'Aetna PPO', 'AE-4521-B', 'confirmed'),
    C('Fernandes, Lucas', '1988-02-28', 'UnitedHealthcare', '785412093', 'confirmed'),
    C('Whitfield, Grace', '1975-09-03', 'Cigna OAP', 'U88213045', 'confirmed'),
    C('Osei, Kwame', '1992-11-19', 'BCBS TX', 'BXR009812345', 'confirmed'),
    C('Alvarez, Sofia', '1980-06-07', 'Humana Gold', 'H83920156', 'confirmed'),
    C('Park, Min-jun', '1997-01-25', 'Kaiser', '7723560194', 'confirmed'),
    C('Dubois, Camille', '1969-04-30', 'Aetna PPO', 'AE-2290-D', 'confirmed'),
    C('Singh, Arjun', '1985-08-14', 'UnitedHealthcare', '601234789', 'confirmed'),
    F('Moreno, Diego', '1990-03-22', 'Cigna OAP', '712345678',
      { field: 'member_id', rule: 'cigna.format', expected: 'U + 8 digits', actual: '712345678  (missing U prefix · 9 digits)' },
      'The value has no leading U and is nine digits long. Cigna OAP expects a leading U followed by eight digits. Suggested correction: U71234567. Confirm to re-verify.',
      'U71234567'),
    F('Ibrahim, Amina', '1978-12-11', 'BCBS TX', 'BX12345678',
      { field: 'member_id', rule: 'bcbs.prefix', expected: 'AAA + 9 digits  (12 chars)', actual: 'BX12345678  (2-letter prefix · 8 digits)' },
      'The prefix is two letters and the numeric body is short. BCBS TX uses a three-letter plan prefix plus nine digits. Suggested correction: BXR123456789. Confirm to re-verify.',
      'BXR123456789'),
    F('Novak, Petra', '1993-07-05', 'Kaiser', '88134502',
      { field: 'member_id', rule: 'kaiser.length', expected: '10 digits  (no separators)', actual: '88134502  (8 digits, missing 2)' },
      'The value is only eight digits. Kaiser expects exactly ten numeric digits. Suggested correction: 8813450256. Confirm to re-verify.',
      '8813450256'),
    F('Thompson, Grace', '1971-10-09', 'Humana Gold', 'HG-4471',
      { field: 'member_id', rule: 'humana.format', expected: 'H + 8 digits', actual: 'HG-4471  (extra alpha · 4 digits)' },
      'There is an extra letter and the numeric body is short. Humana Gold expects a single leading H and eight digits. Suggested correction: H44710001. Confirm to re-verify.',
      'H44710001'),
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

// Single source of truth for the avg-rework-cost figure — quoted in the Overview hero copy,
// and used everywhere a $ amount is computed from a flag count (Profile leakage, Insights),
// so a demo walkthrough never shows two different numbers for the same thing.
const REWORK_COST_PER_FLAG = 2075;

// CARC = Claim Adjustment Reason Code, the code a payer's 835 remittance carries when it
// denies or adjusts a claim. CO-16 and CO-27 come from this app's format/policy rule checks;
// CO-27 and CO-31 also come from the real-time coverage check (Stage 2) once a Member ID has
// passed format — 'coverage_inactive' maps to CO-27 (policy not active), 'name_mismatch' maps
// to CO-31 (identifiers don't match the payer's member record).
const CARC_CODES = {
  'CO-16': "Claim/service lacks information needed for adjudication — a required data element is missing or invalid.",
  'CO-27': 'Expenses incurred after coverage terminated — the policy was not active on the date of service.',
  'CO-31': "Patient cannot be identified as our insured — the identifiers submitted don't match the payer's member record.",
};
function carcForField(field) {
  if (field === 'policy_status' || field === 'coverage_inactive') return 'CO-27';
  if (field === 'member_id') return 'CO-16';
  return 'CO-31';
}

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
  view: 'auth',
  user: null,
  apiStatus: 'offline',
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
  retryingId: null,
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

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3001' : 'http://localhost:3001';

async function apiRequest(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

// Stage 2 of verification: only ever called after a Member ID has already passed its payer
// format regex. The browser never talks to Stedi directly — this hits our own backend, which
// hits Stedi (or a deterministic mock — see server/stedi.js). Never throws to the caller;
// any network failure resolves to { status: 'check_failed' } so it can never be mistaken for
// a real "inactive" result.
async function checkEligibilityApi({ payer, memberId, firstName, lastName, dob }) {
  try {
    return await apiRequest('/api/check-eligibility', {
      method: 'POST',
      body: JSON.stringify({ payer, memberId, firstName, lastName, dob }),
    });
  } catch (error) {
    return { status: 'check_failed', planName: null, nameMatch: false, raw: { error: error.message } };
  }
}

// The intake form only collects a single "Last, First" name field — split it for the
// coverage check API, which (like Stedi) wants first/last separately.
function splitName(fullName) {
  const s = (fullName || '').trim();
  if (s.includes(',')) {
    const [last, first] = s.split(',').map(x => x.trim());
    return { firstName: first || '', lastName: last || '' };
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
  return { firstName: '', lastName: s };
}

function isCoverageDiag(diag) {
  return !!diag && (diag.field === 'name_mismatch' || diag.field === 'coverage_inactive');
}

// 'check_failed' (network/timeout/HTTP error) carries raw.error from our own backend;
// 'unknown' (a 200 the payer itself rejected, e.g. member not found) carries Stedi's raw
// response instead, whose reason lives in errors[0].description.
function describeCheckFailure(result) {
  return result.raw?.error || result.raw?.errors?.[0]?.description || 'The eligibility check with the payer did not complete.';
}

function normalizeApiPatients(rows) {
  const localRows = seedPatients();
  return rows.map((row, index) => {
    const local = localRows.find(item => item.name === row.name) || {};
    return {
      ...local,
      id: row.id || local.id || 'api-' + index,
      mrn: row.id ? row.id.slice(-6) : local.mrn,
      name: row.name,
      dob: row.dob,
      payer: row.payer_name || row.payer_id,
      member: row.member_id,
      status: row.status,
      updated: row.updated_at ? relTime(new Date(row.updated_at).getTime()) : local.updated || 'just now',
      ts: row.updated_at ? new Date(row.updated_at).getTime() : 0,
      origin: 'backend',
      diag: row.flag_field ? { field: row.flag_field, rule: row.flag_rule, expected: row.flag_expected, actual: row.flag_actual } : local.diag,
      suggestion: row.flag_suggestion || local.suggestion,
      suggested: local.suggested,
    };
  });
}

// ===================== ACTIONS =====================
async function loadBatch() {
  setState({ batch: 'loading' });
  try {
    const rows = await apiRequest('/api/patients');
    setState({ batch: 'loaded', patients: normalizeApiPatients(rows), apiStatus: 'online' });
  } catch (error) {
    setState({ batch: 'loaded', patients: seedPatients(), apiStatus: 'offline' });
    pushToast('Backend unavailable', 'Showing the local 12-patient demo batch.', '#F59E0B');
  }
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
    if (!ok) {
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
      return;
    }
    // Format passed — Stage 2: confirm real coverage with the payer before marking confirmed.
    // `submitting` stays true (button already reads "Checking eligibility…") through the call.
    runIntakeCoverageCheck(base);
  }, 850);
}

async function runIntakeCoverageCheck(base) {
  const { firstName, lastName } = splitName(base.name);
  const result = await checkEligibilityApi({ payer: base.payer, memberId: base.member, firstName, lastName, dob: base.dob });

  if (result.status === 'active' && result.nameMatch) {
    setState(s => ({
      submitting: false, view: 'queue',
      patients: [{ ...base, status: 'confirmed', planName: result.planName }, ...s.patients],
      form: { name: '', dob: '', payer: '', memberId: '' }, err: {},
    }));
    flashRows([base.id]);
    pushToast('Eligibility confirmed', base.name + ' added to the queue.', '#22C55E');
    return;
  }

  if (result.status === 'active' && !result.nameMatch) {
    routeIntakeToFlagged(base, {
      field: 'name_mismatch',
      rule: 'coverage.name_match',
      expected: `Payer record matches patient name "${base.name}"`,
      actual: 'The payer returned a different subscriber name for this Member ID.',
    }, 'The Member ID matches an active policy, but the name on file with the payer doesn\'t match the name entered. Verify the patient\'s identity — or correct a typo in the name — before re-checking.');
    return;
  }

  if (result.status === 'inactive') {
    routeIntakeToFlagged(base, {
      field: 'coverage_inactive',
      rule: 'coverage.active_policy',
      expected: 'Active coverage on the date of service',
      actual: 'The payer reports this policy is not currently active.',
    }, 'This Member ID is correctly formatted, but the payer reports the policy is not active. Confirm with the patient or front desk before proceeding.');
    return;
  }

  // 'unknown' or 'check_failed' — the check itself didn't succeed. Never flag on ambiguity;
  // keep the record pending with a retry action instead.
  setState(s => ({
    submitting: false, view: 'queue',
    patients: [{ ...base, status: 'pending', checkReason: describeCheckFailure(result) }, ...s.patients],
    form: { name: '', dob: '', payer: '', memberId: '' }, err: {},
  }));
  pushToast('Couldn\'t verify coverage', base.name + ' added as Pending — retry the check from the queue.', '#F59E0B');
}

function routeIntakeToFlagged(base, diag, suggestion) {
  const rec = { ...base, status: 'flagged', diag, suggestion, suggested: null };
  setState(s => ({
    submitting: false, view: 'flagged', selectedId: base.id,
    detail: { phase: 'idle', editing: false, editValue: '', sugLoading: false, attempts: [] },
    patients: [rec, ...s.patients],
    form: { name: '', dob: '', payer: '', memberId: '' }, err: {},
  }));
}

function openFlagged(id) {
  const rec = state.patients.find(p => p.id === id);
  const coverageFlag = isCoverageDiag(rec && rec.diag);
  setState({ view: 'flagged', selectedId: id, detail: { phase: 'idle', editing: false, editValue: '', sugLoading: !coverageFlag, attempts: [] } });
  if (!coverageFlag) setTimer('sug', () => setState(s => ({ detail: { ...s.detail, sugLoading: false } })), 1400);
}

function startEdit() {
  const rec = getFlaggedRecord();
  setState(s => ({ detail: { ...s.detail, editing: true, editValue: rec ? rec.member : '', phase: 'idle' } }));
}
function cancelEdit() { setState(s => ({ detail: { ...s.detail, editing: false, phase: 'idle' } })); }

function confirmReverify() {
  const rec = getFlaggedRecord();
  if (!rec) return;
  const coverageFlag = isCoverageDiag(rec.diag);
  const fallback = coverageFlag ? rec.member : rec.suggested;
  const value = state.detail.editing ? state.detail.editValue.trim() : fallback;
  reverify(value);
}

function reverify(value) {
  setState(s => ({ detail: { ...s.detail, phase: 'reverifying', checkError: null } }));
  setTimer('reverify', () => {
    const rec = getFlaggedRecord();
    if (!rec) return;
    const def = PAYERS.find(p => p.name === rec.payer);
    const trimmed = (value || '').trim();
    const ok = def && def.re.test(trimmed);
    const now = Date.now();
    if (!ok) {
      setState(s => ({
        detail: {
          ...s.detail, phase: 'failed', editing: true,
          editValue: s.detail.editing ? s.detail.editValue : rec.member,
          attempts: [...(s.detail.attempts || []), { time: now, result: 'failed', value }],
        },
      }));
      return;
    }
    // Format passed — Stage 2: re-confirm real coverage before marking confirmed.
    setState(s => ({ detail: { ...s.detail, phase: 'checking_coverage' } }));
    runReverifyCoverageCheck(rec.id, trimmed, now);
  }, 900);
}

async function runReverifyCoverageCheck(recId, value, attemptTime) {
  const rec = state.patients.find(p => p.id === recId);
  if (!rec) return;
  const { firstName, lastName } = splitName(rec.name);
  const result = await checkEligibilityApi({ payer: rec.payer, memberId: value, firstName, lastName, dob: rec.dob });

  // The user may have navigated away from this record while the check was in flight.
  if (state.selectedId !== recId || !state.detail) return;

  if (result.status === 'active' && result.nameMatch) {
    setState(s => ({
      detail: { ...s.detail, phase: 'passed', attempts: [...(s.detail.attempts || []), { time: attemptTime, result: 'passed', value }] },
      patients: s.patients.map(p => p.id === recId ? { ...p, status: 'confirmed', member: value, planName: result.planName, updated: 'just now', ts: 0 } : p),
    }));
    setTimer('redir', () => {
      flashRows([recId]);
      pushToast('Re-verification passed', rec.name + ' is now confirmed.', '#22C55E');
      setState({ view: 'queue', selectedId: null, detail: null });
    }, 1800);
    return;
  }

  if (result.status === 'active' && !result.nameMatch) {
    setState(s => ({
      patients: s.patients.map(p => p.id === recId ? {
        ...p, member: value,
        diag: { field: 'name_mismatch', rule: 'coverage.name_match', expected: `Payer record matches patient name "${rec.name}"`, actual: 'The payer returned a different subscriber name for this Member ID.' },
        suggestion: 'The Member ID matches an active policy, but the name on file with the payer doesn\'t match the name entered. Verify the patient\'s identity — or correct a typo in the name — before re-checking.',
        suggested: null,
      } : p),
      detail: { ...s.detail, phase: 'idle', editing: false, attempts: [...(s.detail.attempts || []), { time: attemptTime, result: 'failed', value }] },
    }));
    return;
  }

  if (result.status === 'inactive') {
    setState(s => ({
      patients: s.patients.map(p => p.id === recId ? {
        ...p, member: value,
        diag: { field: 'coverage_inactive', rule: 'coverage.active_policy', expected: 'Active coverage on the date of service', actual: 'The payer reports this policy is not currently active.' },
        suggestion: 'This Member ID is correctly formatted, but the payer reports the policy is not active. Confirm with the patient or front desk before proceeding.',
        suggested: null,
      } : p),
      detail: { ...s.detail, phase: 'idle', editing: false, attempts: [...(s.detail.attempts || []), { time: attemptTime, result: 'failed', value }] },
    }));
    return;
  }

  // 'unknown' or 'check_failed' — don't touch the flag, just report that the check itself
  // failed and let the user retry, distinct from a real re-verification failure.
  setState(s => ({ detail: { ...s.detail, phase: 'idle', checkError: describeCheckFailure(result) } }));
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

// Retries a Stage 2 coverage check for a 'pending' record (status distinct from 'flagged' —
// the check itself failed, not the patient's data). Reachable from the queue drawer.
async function retryCoverageCheck(id) {
  const rec = state.patients.find(p => p.id === id);
  if (!rec || state.retryingId) return;
  setState({ retryingId: id });
  const { firstName, lastName } = splitName(rec.name);
  const result = await checkEligibilityApi({ payer: rec.payer, memberId: rec.member, firstName, lastName, dob: rec.dob });

  if (result.status === 'active' && result.nameMatch) {
    setState(s => ({
      retryingId: null, drawerId: null,
      patients: s.patients.map(p => p.id === id ? { ...p, status: 'confirmed', planName: result.planName, checkReason: null, updated: 'just now', ts: 0 } : p),
    }));
    flashRows([id]);
    pushToast('Eligibility confirmed', rec.name + ' is now confirmed.', '#22C55E');
    return;
  }

  if (result.status === 'active' && !result.nameMatch) {
    setState(s => ({
      retryingId: null, drawerId: null,
      patients: s.patients.map(p => p.id === id ? {
        ...p, status: 'flagged', checkReason: null,
        diag: { field: 'name_mismatch', rule: 'coverage.name_match', expected: `Payer record matches patient name "${rec.name}"`, actual: 'The payer returned a different subscriber name for this Member ID.' },
        suggestion: 'The Member ID matches an active policy, but the name on file with the payer doesn\'t match the name entered. Verify the patient\'s identity — or correct a typo in the name — before re-checking.',
        suggested: null,
      } : p),
    }));
    openFlagged(id);
    return;
  }

  if (result.status === 'inactive') {
    setState(s => ({
      retryingId: null, drawerId: null,
      patients: s.patients.map(p => p.id === id ? {
        ...p, status: 'flagged', checkReason: null,
        diag: { field: 'coverage_inactive', rule: 'coverage.active_policy', expected: 'Active coverage on the date of service', actual: 'The payer reports this policy is not currently active.' },
        suggestion: 'This Member ID is correctly formatted, but the payer reports the policy is not active. Confirm with the patient or front desk before proceeding.',
        suggested: null,
      } : p),
    }));
    openFlagged(id);
    return;
  }

  setState(s => ({
    retryingId: null,
    patients: s.patients.map(p => p.id === id ? { ...p, checkReason: describeCheckFailure(result) } : p),
  }));
  pushToast('Still couldn\'t verify', 'The eligibility check failed again — try again shortly.', '#F59E0B');
}

function doSort(key) {
  setState(s => ({ sortKey: key, sortDir: s.sortKey === key && s.sortDir === 'asc' ? 'desc' : 'asc' }));
}

// ===================== COMMAND PALETTE =====================
function getPaletteItems() {
  const q = state.paletteQuery.trim().toLowerCase();
  const navItems = [
    { icon: '📖', title: 'Go to About', sub: 'The long-form story behind Verified', run: () => setState({ view: 'about', paletteOpen: false }) },
    { icon: '◎', title: 'Go to Overview', sub: 'The pitch, the pipeline, the why', run: () => setState({ view: 'overview', paletteOpen: false }) },
    { icon: '⌂', title: 'Go to Intake', sub: 'Load a batch or add a patient', run: () => setState({ view: 'intake', paletteOpen: false }) },
    { icon: '☰', title: 'Go to Queue', sub: 'Live eligibility status', run: () => setState({ view: 'queue', paletteOpen: false }) },
    { icon: '⚙', title: 'Go to Payer Config', sub: 'Member ID format reference + tester', run: () => setState({ view: 'config', paletteOpen: false }) },
    { icon: '◉', title: 'Go to Practice Profile', sub: 'Revenue leakage and no-show signals', run: () => setState({ view: 'profile', paletteOpen: false }) },
    { icon: '▤', title: 'Go to Insights', sub: 'Denial patterns — where errors cluster', run: () => setState({ view: 'insights', paletteOpen: false }) },
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
  const isPending = rec.status === 'pending';
  const retrying = state.retryingId === rec.id;
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
          ${rec.planName ? `<div class="kv-row"><span>Plan</span><span>${escapeHtml(rec.planName)}</span></div>` : ''}
          <div class="kv-row"><span>Source</span><span>${rec.origin === 'batch' ? 'Seeded batch' : 'Manual entry'}</span></div>
          <div class="kv-row"><span>Last updated</span><span>${escapeHtml(rec.updated)}</span></div>
        </div>
        ${isPending ? `
          <div class="banner banner-warn" style="margin-top:16px;display:block">
            <div class="banner-title">Coverage check didn't complete</div>
            <div class="banner-sub" style="display:block;margin-top:3px">${escapeHtml(rec.checkReason || 'The eligibility check with the payer failed or timed out.')} This record isn't flagged — it just needs the check re-run.</div>
          </div>
        ` : `
          <div class="hint-text" style="margin-top:16px">This record is ${rec.status} — no action required. Flagged records open the full resolution view instead.</div>
        `}
      </div>
      <div class="drawer-foot">
        ${isPending ? `<button class="btn btn-primary" data-action="retryCoverageCheck" data-id="${rec.id}" ${retrying ? 'disabled' : ''}>${retrying ? '<span class="spinner"></span> Retrying…' : 'Retry eligibility check'}</button>` : ''}
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
  overview: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="3.5" cy="4.5" r="1.6"/><circle cx="14.5" cy="4.5" r="1.6"/><circle cx="9" cy="13.5" r="1.6"/><path d="M5.1 4.5h7.8M4.3 5.9l3.8 6.2M13.7 5.9l-3.8 6.2"/></svg>`,
  about: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4.3C7.5 3.4 5.4 3.1 3.3 3.4v9.9c2.1-.3 4.2 0 5.7 1M9 4.3c1.5-.9 3.6-1.2 5.7-.9v9.9c-2.1-.3-4.2 0-5.7 1V4.3z"/></svg>`,
  intake: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11v2.3a1 1 0 001 1h9a1 1 0 001-1V11"/><path d="M9 2.8v7.4M9 10.2l-3-3M9 10.2l3-3"/></svg>`,
  queue: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h12M3 9h12M3 13h7.5"/></svg>`,
  config: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 13.2V9.6M4.5 6.4V3.2M9 13.2V7.8M9 5.4V3.2M13.5 13.2V10.6M13.5 8.2V3.2"/><circle cx="4.5" cy="7.9" r="1.6"/><circle cx="9" cy="6.6" r="1.6"/><circle cx="13.5" cy="9.4" r="1.6"/></svg>`,
  profile: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="2.7"/><path d="M3.4 15c.6-3.3 2.5-5 5.6-5s5 1.7 5.6 5"/></svg>`,
  insights: `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 14.5V8M9 14.5V3.5M14.5 14.5v-5"/></svg>`,
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
    { key: 'about', label: 'About' },
    { key: 'overview', label: 'Overview' },
    { key: 'intake', label: 'Intake' },
    { key: 'queue', label: 'Queue', badge: flaggedCount },
    { key: 'config', label: 'Payer Config' },
    { key: 'insights', label: 'Insights' },
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
      <button class="sidebar-profile-btn${state.view === 'profile' ? ' active' : ''}" data-action="nav" data-view="profile">
        <span class="sidebar-profile-avatar">AS</span>
        <span class="sidebar-profile-copy"><b>Arjun Sharma</b><small>Practice admin</small></span>
        <span class="sidebar-profile-arrow">→</span>
      </button>
      <div class="sidebar-foot-meta">Front desk · Bay 3
      <b>Demo build v1.0 · live</b>
      </div>
    </div>
  </aside>`;
}

// ===================== PIPELINE (shared: Overview full strip + Flagged Detail breadcrumb) =====================
// One data array, two renderers — the abstract pipeline on Overview and the concrete
// per-record breadcrumb on Flagged Detail are the same six steps, never redefined twice.
const PIPELINE_STEPS = [
  { key: 'see', label: 'See', desc: 'Intake entered — batch or manual.',
    long: 'Every record starts here — a batch ingested overnight, or a name typed in by hand at the front desk. Nothing is validated yet. This is just the record arriving.',
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9s2.7-4.5 7-4.5S16 9 16 9s-2.7 4.5-7 4.5S2 9 2 9z"/><circle cx="9" cy="9" r="2"/></svg>' },
  { key: 'extract', label: 'Extract', desc: 'Fields parsed: name, DOB, payer, Member ID.',
    long: 'The four fields that matter get pulled out: patient name, date of birth, payer, and Member ID. No inference, no guessing — just what was actually entered.',
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h-2a1 1 0 00-1 1v9a1 1 0 001 1h2M11.5 3.5h2a1 1 0 011 1v9a1 1 0 01-1 1h-2"/></svg>' },
  { key: 'crosscheck', label: 'Cross-check', desc: "Checked against the payer's format rules.",
    long: "The Member ID gets tested against a deterministic regular expression — one per payer, six in total. Not a heuristic, not a model. A pattern match, the same way a form validator would.",
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h7M3 9h5M3 13h5"/><path d="M12.5 11l1.5 1.5L17 9"/></svg>' },
  { key: 'flag', label: 'Flag', desc: 'Specific mismatch surfaced — never a silent guess.',
    long: "A failed match doesn't get silently corrected or silently ignored. It gets surfaced, with the exact rule it broke and the exact character that broke it — visible, not buried in a queue.",
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2.5v13"/><path d="M4.5 3.5h8l-2 2.5 2 2.5h-8"/></svg>' },
  { key: 'confirm', label: 'Confirm', desc: 'A human approves the fix. Never a silent auto-correct.',
    long: 'This is the one place AI enters the picture — and only to suggest, never to decide. A plausible correction is generated and shown with a character-level diff. A human reads it and chooses.',
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><path d="M6.2 9.2l1.8 1.8 3.8-4"/></svg>' },
  { key: 'verify', label: 'Verify', desc: 'Re-checked against the rule — only then Confirmed.',
    long: 'The confirmed value is re-run through the exact same deterministic check from Cross-check. Only a pass moves the record to Confirmed. The loop closes on a rule, not on trust.',
    icon: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.3l5.5 2v4.4c0 3.8-2.4 6.2-5.5 7.1-3.1-.9-5.5-3.3-5.5-7.1V4.3l5.5-2z"/><path d="M6.4 9l1.8 1.8L11.6 7"/></svg>' },
];

function pipelineStripFull() {
  return `<div class="pipeline-strip">
    ${PIPELINE_STEPS.map((s, i) => `
      <div class="pipeline-step">
        <div class="pipeline-node"><span class="pipeline-fill"></span><span class="pipeline-dot"></span></div>
        <div class="feature-tile pipeline-card">
          <div class="pipeline-icon">${s.icon}</div>
          <h4>${i + 1}. ${escapeHtml(s.label)}</h4>
          <p>${escapeHtml(s.desc)}</p>
        </div>
      </div>`).join('')}
  </div>`;
}

function pipelineBreadcrumb(activeKey, doneThrough) {
  return `<div class="pipeline-breadcrumb">
    ${PIPELINE_STEPS.map((s, i) => `<div class="pb-step${i < doneThrough ? ' done' : ''}${activeKey === s.key ? ' active' : ''}">
        <span class="pb-dot"></span><span class="pb-label">${escapeHtml(s.label)}</span>
      </div>${i < PIPELINE_STEPS.length - 1 ? '<span class="pb-arrow">→</span>' : ''}`).join('')}
  </div>`;
}

// Maps a Flagged Detail record's live state onto the shared pipeline: idle/no attempts
// yet means the cross-check just failed and FLAG is the active step; editing means the
// human is mid-CONFIRM; a reverify in flight is VERIFY; a pass marks the whole run done.
function flaggedPipelineState(d) {
  if (!d || d.phase === 'passed') return { activeKey: null, doneThrough: PIPELINE_STEPS.length };
  if (d.phase === 'reverifying' || d.phase === 'checking_coverage') return { activeKey: 'verify', doneThrough: 5 };
  if (d.editing) return { activeKey: 'confirm', doneThrough: 4 };
  return { activeKey: 'flag', doneThrough: 3 };
}

// ===================== RENDER: OVERVIEW =====================
function overviewStatTeaser() {
  if (state.batch === 'loading') {
    return `<div class="card overview-cta-row">
      <div style="display:inline-flex;align-items:center;gap:12px;color:var(--zinc-600)">
        <span class="spinner spinner-light"></span>
        <span style="font-size:var(--fs-body-sm);font-weight:500">Ingesting batch…</span>
      </div>
    </div>`;
  }
  if (state.patients.length === 0) {
    return `<div class="card overview-cta-row">
      <div>
        <div class="card-title" style="margin-bottom:4px">Load a batch to see this in action</div>
        <div class="hint-text">Simulate an overnight ingestion run and watch the pipeline catch real format mismatches.</div>
      </div>
      <button class="btn btn-primary" data-action="loadBatch" style="flex-shrink:0">Load 12 seeded patients</button>
    </div>`;
  }
  const flaggedNow = state.patients.filter(p => p.status === 'flagged').length;
  const caught = state.patients.filter(p => p.status === 'confirmed' && p.diag).length;
  return `<div class="stat-band" style="animation:fadein .25s ease-out">
    <div class="stat-tile">
      <div class="stat-tile-label"><span class="stat-dot" style="background:var(--flagged-dot)"></span>Flagged today</div>
      <div class="stat-tile-value">${flaggedNow}</div>
      <div class="stat-tile-sub">need a human look right now</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile-label">Avg. time to resolve</div>
      <div class="stat-tile-value">1.8 min</div>
      <div class="stat-tile-sub">illustrative for demo</div>
    </div>
    <div class="stat-tile">
      <div class="stat-tile-label"><span class="stat-dot" style="background:var(--confirmed-dot)"></span>Would-be denials caught</div>
      <div class="stat-tile-value">${caught}</div>
      <div class="stat-tile-sub">flagged records fixed &amp; confirmed</div>
    </div>
  </div>`;
}

function practiceMetrics() {
  const total = state.patients.length;
  const flagged = state.patients.filter(p => p.status === 'flagged').length;
  const confirmed = state.patients.filter(p => p.status === 'confirmed').length;
  const estimatedLeakage = flagged * REWORK_COST_PER_FLAG;
  const payerCounts = state.patients.reduce((counts, patient) => {
    counts[patient.payer] = (counts[patient.payer] || 0) + 1;
    return counts;
  }, {});
  const topPayer = Object.entries(payerCounts).sort((a, b) => b[1] - a[1])[0];
  return { total, flagged, confirmed, estimatedLeakage, topPayer };
}

// The bars above are deterministic — counted straight off state.patients, same as every
// other number on this page. This is the one place on the panel where AI enters: plain
// language wrapped around those same numbers, split into "how to find it" (point at the
// exact filter/sort that surfaces the pattern) and "how to fix it" (the one-click confirm
// already sitting in Queue, plus the upstream change that stops it recurring).
function leakageAiSuggestion(metrics) {
  const badgeHead = `<div class="leakage-ai-head"><span class="ai-badge-icon"><i></i></span><span class="ai-badge-label">AI-generated suggestion</span></div>`;

  if (!metrics.total) {
    return `<div class="leakage-ai leakage-ai-empty">${badgeHead}
      <p>Load a batch to get a suggestion — there's no queue data to diagnose yet.</p>
    </div>`;
  }
  if (!metrics.flagged) {
    return `<div class="leakage-ai leakage-ai-clean">${badgeHead}
      <p>Every record currently in view is confirmed — no leakage pattern to chase right now. Re-check this after the next batch lands.</p>
    </div>`;
  }

  const flaggedRate = Math.round((metrics.flagged / metrics.total) * 100);
  const topPayerName = metrics.topPayer ? metrics.topPayer[0] : null;
  const topPayerShare = (metrics.topPayer && metrics.total) ? Math.round((metrics.topPayer[1] / metrics.total) * 100) : 0;
  const exposure = metrics.estimatedLeakage.toLocaleString('en-IN');
  const n = metrics.flagged;

  return `<div class="leakage-ai">${badgeHead}
    <div class="leakage-ai-block">
      <div class="leakage-ai-label">How to find it</div>
      <p>${n} of ${metrics.total} records in view (${flaggedRate}%) are flagged for a malformed Member ID${topPayerName ? ` — <b>${escapeHtml(topPayerName)}</b> alone accounts for ${topPayerShare}% of the queue, so it's carrying the largest share of the ₹${exposure} exposure` : ''}. Open Queue, filter to Flagged, then sort by payer to see the same concentration yourself.</p>
    </div>
    <div class="leakage-ai-block">
      <div class="leakage-ai-label">How to fix it</div>
      <p>Confirm the AI-suggested corrections already waiting on those ${n} flagged record${n === 1 ? '' : 's'} — each is a one-click, character-level diff a human confirms before it re-verifies.${topPayerName ? ` Since ${escapeHtml(topPayerName)} is the concentration point, add its Member ID format as a front-desk intake check so this stops recurring instead of getting caught downstream.` : ''}</p>
    </div>
    <button class="btn btn-primary btn-sm leakage-ai-cta" data-action="nav" data-view="queue">Review ${n} flagged record${n === 1 ? '' : 's'} →</button>
  </div>`;
}

function leakageSignals(compact = false) {
  const metrics = practiceMetrics();
  const exposure = metrics.estimatedLeakage.toLocaleString('en-IN');
  const flaggedRate = metrics.total ? Math.round((metrics.flagged / metrics.total) * 100) : 0;
  const confirmedRate = metrics.total ? Math.round((metrics.confirmed / metrics.total) * 100) : 0;
  const topPayer = metrics.topPayer ? `${metrics.topPayer[0]} · ${metrics.topPayer[1]} records` : 'Waiting for intake data';
  if (compact) return `<div class="signal-grid signal-grid-compact">
    <div class="signal-card signal-card-risk"><div class="signal-card-kicker">Estimated leakage at risk</div><strong>₹${exposure}</strong><span>${metrics.flagged} flagged records × ₹${REWORK_COST_PER_FLAG.toLocaleString('en-IN')} avg rework</span></div>
    <div class="signal-card"><div class="signal-card-kicker">No-show pattern</div><strong>6.9%</strong><span>86 of 1,248 visits · down 1.8 pts vs last month</span></div>
    <div class="signal-card"><div class="signal-card-kicker">Clean intake rate</div><strong>${confirmedRate}%</strong><span>${metrics.confirmed} confirmed of ${metrics.total || 0} loaded records</span></div>
  </div>`;
  return `<div class="profile-insight-grid">
    <div class="profile-panel profile-panel-leakage">
      <div class="profile-panel-head"><div><div class="profile-kicker">Revenue leakage pattern</div><h2>Where money is slipping</h2></div><span class="profile-panel-icon">₹</span></div>
      <div class="leakage-total"><strong>₹${exposure}</strong><span>estimated avoidable rework exposure</span></div>
      <div class="leakage-bars">
        <div class="leakage-row"><div><span>Malformed Member IDs</span><b>${metrics.flagged || 0}</b></div><div class="leakage-track"><i style="width:${Math.max(flaggedRate, 4)}%"></i></div><small>Primary intake leakage</small></div>
        <div class="leakage-row"><div><span>Eligibility rework</span><b>₹${(metrics.flagged * 830).toLocaleString('en-IN')}</b></div><div class="leakage-track"><i class="secondary" style="width:${Math.max(Math.round(flaggedRate * .7), 4)}%"></i></div><small>Staff time and follow-up calls</small></div>
        <div class="leakage-row"><div><span>Highest volume payer</span><b>${escapeHtml(topPayer)}</b></div><div class="leakage-track"><i class="tertiary" style="width:${metrics.total ? Math.max(Math.round((metrics.topPayer[1] / metrics.total) * 100), 4) : 4}%"></i></div><small>Prioritize format QA here first</small></div>
      </div>
      ${leakageAiSuggestion(metrics)}
    </div>
    <div class="profile-panel profile-panel-noshow">
      <div class="profile-panel-head"><div><div class="profile-kicker">Attendance pattern</div><h2>No-show signal</h2></div><span class="profile-panel-icon profile-panel-icon-warn">↘</span></div>
      <div class="noshow-hero"><strong>6.9%</strong><span>current no-show rate</span><em>−1.8 pts</em></div>
      <div class="noshow-chart" aria-label="No-show rate trend: 8.7, 8.1, 7.5, 6.9 percent"><i style="height:72%"></i><i style="height:64%"></i><i style="height:52%"></i><i style="height:43%"></i><i style="height:35%"></i><i style="height:28%"></i></div>
      <div class="noshow-meta"><span>86 no-shows / 1,248 visits</span><span>Last 6 months</span></div>
      <p class="profile-note">Late reminders and unconfirmed appointments are the strongest operational pattern. Protect the slot before it becomes lost capacity.</p>
    </div>
  </div>`;
}

function viewProfile() {
  const metrics = practiceMetrics();
  return `<div class="view view-narrow profile-view">
    <div class="profile-heading">
      <div><div class="hero-eyebrow profile-eyebrow">PRACTICE PROFILE · LIVE SIGNALS</div><h1 class="page-title">Arjun Sharma</h1><p class="page-sub">Practice administrator · Bay 3 front desk · Operational view</p></div>
      <button class="btn btn-secondary" data-action="nav" data-view="overview">Back to dashboard</button>
    </div>
    <div class="profile-identity">
      <div class="profile-avatar-large">AS</div><div><strong>Northstar Family Practice</strong><span>Multi-specialty outpatient clinic · 4 providers</span></div><span class="profile-live"><i></i> Live data</span>
    </div>
    <div class="profile-kpi-grid">
      <div class="profile-kpi"><span>Records in view</span><strong>${metrics.total}</strong><small>Current eligibility queue</small></div>
      <div class="profile-kpi"><span>Leakage at risk</span><strong>₹${metrics.estimatedLeakage.toLocaleString('en-IN')}</strong><small>${metrics.flagged} records need review</small></div>
      <div class="profile-kpi"><span>Clean intake rate</span><strong>${metrics.total ? Math.round((metrics.confirmed / metrics.total) * 100) : 0}%</strong><small>${metrics.confirmed} confirmed records</small></div>
      <div class="profile-kpi"><span>No-show rate</span><strong>6.9%</strong><small>86 of 1,248 visits</small></div>
    </div>
    <div class="profile-section-head"><div><h2>Revenue and capacity signals</h2><p>Patterns that help the front desk act before a denial or empty slot appears.</p></div><span class="profile-benchmark">Demo benchmark + live queue</span></div>
    ${leakageSignals()}
    <div class="profile-actions"><div><strong>Next best actions</strong><span>Small operational changes with measurable upside.</span></div><button class="btn btn-primary" data-action="nav" data-view="queue">Review ${metrics.flagged} flagged records →</button><button class="btn btn-secondary" data-action="nav" data-view="intake">Run new intake check</button></div>
  </div>`;
}

// ===================== RENDER: INSIGHTS =====================
// Every number here is a plain aggregation over state.patients — the same source Overview's
// hero stat and Profile's leakage panel already read from, so nothing on this page can ever
// drift out of sync with what those pages show. No prediction, no per-patient risk score:
// see the framing callout at the bottom of viewInsights() for why that line matters.
function computeInsights() {
  const totalPatients = state.patients.length;
  const everFlagged = state.patients.filter(p => p.diag);
  const totalFlagged = everFlagged.length;

  const fieldCounts = {};
  const payerCounts = {};
  const carcCounts = {};
  everFlagged.forEach(p => {
    const field = p.diag.field || 'unknown';
    fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    payerCounts[p.payer] = (payerCounts[p.payer] || 0) + 1;
    const carc = carcForField(field);
    carcCounts[carc] = (carcCounts[carc] || 0) + 1;
  });

  const byField = Object.entries(fieldCounts).map(([field, count]) => ({ field, count })).sort((a, b) => b.count - a.count);
  const byPayer = PAYERS.map(p => ({ payer: p.name, count: payerCounts[p.name] || 0 })).sort((a, b) => b.count - a.count);
  const byCarc = Object.keys(CARC_CODES).map(code => ({ code, count: carcCounts[code] || 0 })).sort((a, b) => b.count - a.count);

  return {
    totalPatients, totalFlagged,
    topField: byField[0] || null,
    topPayer: byPayer.find(p => p.count > 0) || null,
    estimatedCostAvoided: totalFlagged * REWORK_COST_PER_FLAG,
    byField, byPayer, byCarc,
  };
}

// ---- Insights → PDF export ----
// Client-side only: html2canvas rasterizes whatever is currently in #insights-report — the
// exact DOM computeInsights() just rendered from live state.patients — so there is no
// separate data-fetch to keep in sync. Re-render the page (load a batch, confirm a flag,
// anything that changes state.patients) and the very next export reflects it, because the
// capture happens at click time against whatever render() last put on screen.
async function exportInsightsPdf(btn) {
  const target = document.getElementById('insights-report');
  if (!target) return;
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    pushToast('Export unavailable', 'The PDF library failed to load — check your connection and try again.', '#F59E0B');
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';

  const hidden = Array.from(target.querySelectorAll('.no-export'));
  const prevDisplay = hidden.map(el => el.style.display);
  hidden.forEach(el => { el.style.display = 'none'; });

  try {
    const canvas = await html2canvas(target, { backgroundColor: '#ffffff', scale: 2, useCORS: true });

    const { jsPDF } = window.jspdf;
    // compress:true is not optional here — jsPDF defaults to false, which stores the embedded
    // PNG as raw uncompressed RGBA pixel data (width × height × 4 bytes) instead of a compressed
    // stream. For a single ~1200px-tall report at scale:2 that's a ~24MB PDF; with it, ~400KB.
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 32;
    const footerText = 'Generated from live intake data · Verified RCM Eligibility';

    const now = new Date();
    const headerDate = now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    const drawFooter = () => {
      pdf.setFontSize(8.5);
      pdf.setTextColor(161, 161, 170);
      pdf.text(footerText, margin, pageHeight - 16);
    };
    const drawReportHeader = () => {
      pdf.setFontSize(16);
      pdf.setTextColor(11, 21, 38);
      pdf.text('Verified — Denial Pattern Report', margin, 40);
      pdf.setFontSize(10);
      pdf.setTextColor(113, 113, 122);
      pdf.text(`Generated ${headerDate}`, margin, 56);
      pdf.setDrawColor(228, 228, 231);
      pdf.line(margin, 66, pageWidth - margin, 66);
    };

    const usableWidth = pageWidth - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerPt = canvas.width / imgWidth;

    const firstPageContentTop = 78;
    const firstPageUsableHeight = pageHeight - firstPageContentTop - margin - 20;
    const otherPageUsableHeight = pageHeight - margin * 2 - 20;

    let srcYPx = 0;
    let pageNum = 0;
    while (srcYPx < canvas.height - 0.5 && pageNum < 25) {
      const availableHeightPt = pageNum === 0 ? firstPageUsableHeight : otherPageUsableHeight;
      let sliceHeightPx = Math.min(Math.round(availableHeightPt * pxPerPt), canvas.height - srcYPx);
      sliceHeightPx = Math.max(1, sliceHeightPx);
      const sliceHeightPt = sliceHeightPx / pxPerPt;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      sliceCanvas.getContext('2d').drawImage(canvas, 0, srcYPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

      if (pageNum > 0) pdf.addPage();
      if (pageNum === 0) drawReportHeader();
      const y = pageNum === 0 ? firstPageContentTop : margin;
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, imgWidth, sliceHeightPt);
      drawFooter();

      srcYPx += sliceHeightPx;
      pageNum++;
    }

    const y4 = now.getFullYear(), m2 = String(now.getMonth() + 1).padStart(2, '0'), d2 = String(now.getDate()).padStart(2, '0');
    const filename = `verified-denial-report-${y4}-${m2}-${d2}.pdf`;
    pdf.save(filename);
    pushToast('Report downloaded', `Saved as ${filename}`, '#22C55E');
  } catch (err) {
    pushToast('Export failed', 'Could not generate the PDF — please try again.', '#F59E0B');
  } finally {
    hidden.forEach((el, i) => { el.style.display = prevDisplay[i]; });
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function viewInsights() {
  const ins = computeInsights();

  if (!ins.totalPatients) {
    return `<div class="view insights-view">
      <div class="view-header">
        <h1 class="page-title">Insights</h1>
        <p class="page-sub">Denial patterns across everything Verified has checked so far.</p>
      </div>
      <div class="card"><div class="card-body" style="text-align:center;padding:48px 20px">
        <p class="hint-text" style="margin:0 0 14px">Load a batch to see denial patterns here.</p>
        <button class="btn btn-primary" data-action="loadBatch">Load 12 seeded patients</button>
      </div></div>
    </div>`;
  }

  const maxPayerCount = Math.max(1, ...ins.byPayer.map(p => p.count));

  const topPayerShare = ins.topPayer ? Math.round((ins.topPayer.count / ins.totalFlagged) * 100) : 0;
  const cleanRate = ins.totalPatients ? Math.round(((ins.totalPatients - ins.totalFlagged) / ins.totalPatients) * 100) : 0;

  return `<div class="view insights-view" id="insights-report">
    <div class="view-header" style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap">
      <div>
        <h1 class="page-title">Insights</h1>
        <p class="page-sub">Denial patterns across everything Verified has checked so far — where errors cluster, and what they'd have cost.</p>
      </div>
      <button class="btn btn-secondary no-export" data-action="exportInsightsPdf" id="exportPdfBtn" style="flex-shrink:0">
        <svg viewBox="0 0 18 18" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5v9M9 11.5l-3.3-3.3M9 11.5l3.3-3.3"/><path d="M3 13.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5"/></svg>
        Download PDF
      </button>
    </div>

    <div class="stat-band insight-stat-band">
      <div class="stat-tile">
        <div class="stat-tile-label"><span class="stat-dot" style="background:var(--flagged-dot)"></span>Flagged records</div>
        <div class="stat-tile-value">${ins.totalFlagged}<span style="font-size:15px;color:var(--zinc-400);font-weight:600"> / ${ins.totalPatients}</span></div>
        <div class="stat-tile-sub">of all records processed</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Most common failure field</div>
        <div class="stat-tile-value" style="font-size:19px;font-family:var(--font-mono)">${ins.topField ? escapeHtml(ins.topField.field) : '—'}</div>
        <div class="stat-tile-sub">${ins.topField ? `${ins.topField.count} of ${ins.totalFlagged} flags` : 'no flags yet'}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Most common payer involved</div>
        <div class="stat-tile-value" style="font-size:19px">${ins.topPayer ? escapeHtml(ins.topPayer.payer) : '—'}</div>
        <div class="stat-tile-sub">${ins.topPayer ? `${ins.topPayer.count} of ${ins.totalFlagged} flags` : 'no flags yet'}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">Rework cost avoided</div>
        <div class="stat-tile-value">₹${ins.estimatedCostAvoided.toLocaleString('en-IN')}</div>
        <div class="stat-tile-sub">${ins.totalFlagged} flags × ₹${REWORK_COST_PER_FLAG.toLocaleString('en-IN')} avg rework</div>
      </div>
    </div>

    <div class="insights-content-grid">
    <div class="insights-report-column">
    <div class="card section-gap">
      <div class="card-head">
        <div class="card-title">Where errors cluster</div>
        <div class="card-subtitle">Flags per payer, out of ${ins.totalFlagged} total.</div>
      </div>
      <div class="card-body insight-chart" data-insight-chart>
        ${ins.byPayer.map(p => `
          <div class="insight-bar-row">
            <div class="insight-bar-label">${escapeHtml(p.payer)}</div>
            <div class="insight-bar-track"><div class="insight-bar-fill" style="--w:${Math.round((p.count / maxPayerCount) * 100)}%"></div></div>
            <div class="insight-bar-count">${p.count}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card section-gap">
      <div class="card-head">
        <div class="card-title">CARC code frequency</div>
        <div class="card-subtitle">The denial codes these mismatches map to downstream — same codes as Overview's RCM cycle.</div>
      </div>
      <div class="card-body">
        <div class="carc-list">
          ${ins.byCarc.map(c => `
            <div class="carc-row">
              <span class="carc-chip">${escapeHtml(c.code)}</span>
              <span class="carc-count">${c.count}</span>
              <span class="carc-meaning">${escapeHtml(CARC_CODES[c.code])}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="callout-box">
      <div class="callout-label">What this is — and isn't</div>
      <p>This view surfaces the patterns already present in verified intake data — which payers and fields fail most often. With more volume, this same data becomes the training signal for predictive flagging: catching a likely-wrong Member ID format before a human even submits it, based on historical failure patterns for that payer. Today: pattern visibility. Next: predictive intervention.</p>
    </div>
    </div>

    <aside class="insights-action-column">
      <div class="insights-action-card insights-action-primary">
        <div class="profile-kicker">Decision support</div><h2>What needs attention first?</h2>
        <div class="insights-focus-value">${ins.topPayer ? escapeHtml(ins.topPayer.payer) : 'No pattern yet'}</div>
        <p>${ins.topPayer ? `${topPayerShare}% of all flags come from this payer. Review its ID format at intake before expanding the next batch.` : 'Load a batch to surface payer-level patterns.'}</p>
        <button class="btn btn-primary btn-block" data-action="nav" data-view="config">Review payer rules →</button>
      </div>
      <div class="insights-action-card">
        <div class="profile-kicker">Operational impact</div><h2>Leakage snapshot</h2>
        <div class="impact-row"><span>Preventable rework</span><strong>₹${ins.estimatedCostAvoided.toLocaleString('en-IN')}</strong></div>
        <div class="impact-row"><span>Current clean rate</span><strong>${cleanRate}%</strong></div>
        <div class="impact-row"><span>Flags needing review</span><strong>${ins.totalFlagged}</strong></div>
        <div class="insights-progress"><i style="width:${cleanRate}%"></i></div>
        <small class="insights-muted">Based on ${ins.totalPatients} records in the current queue.</small>
      </div>
      <div class="insights-action-card insights-next-card">
        <div class="profile-kicker">Next best actions</div><h2>Close the loop</h2>
        <div class="next-action"><i>1</i><span><b>Resolve flagged records</b><small>Clear the queue before claim submission.</small></span></div>
        <div class="next-action"><i>2</i><span><b>Align staff on ${ins.topField ? escapeHtml(ins.topField.field) : 'format'} errors</b><small>Use the payer reference during intake.</small></span></div>
        <button class="btn btn-secondary btn-block" data-action="nav" data-view="queue">Open patient queue →</button>
      </div>
    </aside>
    </div>
  </div>`;
}

// ---- RCM Cycle Position: where Verified sits in the standard revenue cycle ----
const RCM_CYCLE_STAGES = [
  { label: 'Pre-Registration & Intake', zone: 'verified',
    tip: 'This is where Verified operates — catching intake errors before they propagate downstream.' },
  { label: 'Eligibility Verification', sub: 'EDI 270/271', zone: 'verified',
    tip: 'This is where Verified operates — catching intake errors before they propagate downstream.' },
  { label: 'Charge Capture & Coding', zone: 'muted',
    tip: 'Procedure and diagnosis codes are assigned to the visit.' },
  { label: 'Claim Submission', zone: 'muted',
    tip: 'The claim is packaged and sent to the payer for adjudication.' },
  { label: 'Payer Adjudication', zone: 'muted',
    tip: "The payer reviews the claim against the policy and the payer's own coding rules." },
  { label: 'Remittance / Denial', sub: 'CO-16 · CO-27 · CO-31', zone: 'denial',
    tip: 'This is what Verified prevents — the same intake error, caught three weeks later as a denial instead of instantly at intake.' },
  { label: 'Patient Billing & Collections', zone: 'muted',
    tip: 'Any patient-responsibility balance is billed once the claim resolves.' },
];

function rcmStageCard(s) {
  const cls = s.zone === 'verified' ? 'rcm-stage rcm-stage-verified' : s.zone === 'denial' ? 'rcm-stage rcm-stage-denial' : 'rcm-stage rcm-stage-muted';
  const tag = s.zone === 'verified' ? '<div class="rcm-stage-tag">Verified operates here</div>'
    : s.zone === 'denial' ? '<div class="rcm-stage-tag rcm-stage-tag-denial">Verified prevents this</div>' : '';
  return `<div class="${cls}" data-tip="${escapeHtml(s.tip)}">
    ${tag}
    <div class="rcm-stage-label">${escapeHtml(s.label)}</div>
    ${s.sub ? `<div class="rcm-stage-sub">${escapeHtml(s.sub)}</div>` : ''}
  </div>`;
}

function rcmCycleSection() {
  return `<div class="section-gap" style="margin-top:34px">
    <div style="font-size:var(--fs-section-title);font-weight:600;letter-spacing:-.01em;margin-bottom:5px">Where Verified fits in the RCM cycle</div>
    <div class="hint-text">Seven stages, one class of error — caught at the cheapest possible point instead of the most expensive one.</div>
    <div class="rcm-cycle-wrap">
      <div class="rcm-cycle-strip">
        ${RCM_CYCLE_STAGES.map((s, i) => `${rcmStageCard(s)}${i < RCM_CYCLE_STAGES.length - 1 ? '<span class="rcm-connector">→</span>' : ''}`).join('')}
      </div>
      <svg class="rcm-loop-svg" viewBox="0 0 1000 90" preserveAspectRatio="none" aria-hidden="true">
        <path class="rcm-loop-path" d="M 770 6 C 770 66, 165 66, 165 6" fill="none"></path>
        <path class="rcm-loop-arrowhead" d="M 165 6 L 156 17 M 165 6 L 178 13" fill="none"></path>
      </svg>
      <div class="rcm-loop-label">Verified breaks this loop before it happens</div>
    </div>
  </div>`;
}

function viewOverview() {
  return `<div class="view">
    <div class="hero-band">
      <div class="hero-content">
        <div class="hero-eyebrow">AI-ASSISTED RCM ELIGIBILITY</div>
        <h1 class="hero-title">Claim denials from bad intake data cost the average practice around ₹2,075 in rework per denial — most trace back to a mismatched Member ID or DOB caught weeks too late.</h1>
        <p class="hero-sub">Verified catches it right at intake, shows exactly what's wrong, and only fixes it once a human confirms — before it ever becomes a denial.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-action="nav" data-view="intake">Try it yourself →</button>
          <button class="btn btn-ghost-light" data-action="nav" data-view="config">Browse payer rules</button>
        </div>
        <div class="hero-chips">
          <span class="hero-chip">6 payer formats</span>
          <span class="hero-chip">No silent auto-correct</span>
          <span class="hero-chip">Full audit trail</span>
        </div>
      </div>
    </div>

    ${rcmCycleSection()}

    <div class="section-gap" style="margin-top:34px">
      <div class="pipeline-section-head">
        <div>
          <div style="font-size:var(--fs-section-title);font-weight:600;letter-spacing:-.01em;margin-bottom:5px">How it works</div>
          <div class="hint-text">Six steps, every one of them visible on screen — nothing happens to a patient record silently. Scroll to trace one through.</div>
        </div>
        <div class="pipeline-progress-tag"><span class="pp-count">0</span>/6 steps</div>
      </div>
      ${pipelineStripFull()}
    </div>

    <div class="callout-box">
      <div class="callout-label">Not just an eligibility lookup</div>
      <p>An EDI 270/271 clearinghouse check confirms a policy is active — it won't catch that the Member ID you're about to submit is malformed. That's an intake-quality problem, not a coverage problem, and it's a leading cause of preventable denials. Verified catches it before submission, and a human always confirms the fix — the agent never silently rewrites patient data.</p>
    </div>

    ${overviewStatTeaser()}

    ${leakageSignals(true)}

    <div class="section-gap" style="margin-top:34px;margin-bottom:0">
      <div style="font-size:var(--fs-section-title);font-weight:600;letter-spacing:-.01em;margin-bottom:5px">Why front-desk teams keep it</div>
      <div class="hint-text">No RCM background required to read any screen in this app.</div>
      <div class="feature-strip">
        <div class="feature-tile">
          <div class="fi"><i></i></div>
          <h4>Built for the front desk</h4>
          <p>Plain-language diagnostics — no clearinghouse jargon, no rejection codes to decode.</p>
        </div>
        <div class="feature-tile">
          <div class="fi"><i></i></div>
          <h4>Nothing is a black box</h4>
          <p>Every payer rule is a visible pattern, every suggestion explains itself, every fix is opt-in.</p>
        </div>
        <div class="feature-tile">
          <div class="fi"><i></i></div>
          <h4>The real build, not a mockup</h4>
          <p>Zero dependencies, zero build step — what you're using right now is the deployable artifact.</p>
        </div>
      </div>
    </div>
  </div>`;
}

// ===================== RENDER: ABOUT =====================
// Deliberately a different layout grammar from Overview: no sidebar-visible card grid, no
// stat tiles, no .view max-width/padding. Long-form, full-bleed, one scroll-driven idea per
// section. Reuses PIPELINE_STEPS' data (not its markup) so the narrative never drifts out of
// sync with the dashboard's own description of the same six stages.
function aboutDiagramSvg() {
  const h = 340, top = 24, bottom = 24, n = PIPELINE_STEPS.length;
  const step = (h - top - bottom) / (n - 1);
  const nodes = PIPELINE_STEPS.map((s, i) => {
    const y = top + i * step;
    return `<g class="about-node" data-idx="${i}">
      <circle cx="20" cy="${y}" r="7"></circle>
      <text x="38" y="${y + 4}">${escapeHtml(s.label)}</text>
    </g>`;
  }).join('');
  return `<svg class="about-diagram" viewBox="0 0 190 ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="20" y1="${top}" x2="20" y2="${h - bottom}" class="about-track"></line>
    ${nodes}
  </svg>`;
}

const ABOUT_ICON_PULSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>';
const ABOUT_ICON_HUB = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="9" r="2"/><circle cx="14" cy="4" r="2"/><circle cx="14" cy="14" r="2"/><path d="M6 8l6-3M6 10l6 3"/></svg>';
const ABOUT_ICON_SHIELD = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.3l5.5 2v4.4c0 3.8-2.4 6.2-5.5 7.1-3.1-.9-5.5-3.3-5.5-7.1V4.3l5.5-2z"/><path d="M6.4 9l1.8 1.8L11.6 7"/></svg>';
const ABOUT_ICON_CARD = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="14" height="10" rx="1.5"/><circle cx="6" cy="8" r="1.3"/><path d="M9.5 7.5h4.5M9.5 9.5h4.5M4 11.5h4"/></svg>';
const ABOUT_ICON_NODEPS = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="12" height="12" rx="2"/><path d="M4 4l10 10"/></svg>';
const ABOUT_ICON_BOLT = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L4.5 10.5h4L7.5 16 14 7h-4.5L10 2z"/></svg>';
const ABOUT_ICON_CLOCK = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><path d="M9 5.5V9l3 2"/></svg>';
const ABOUT_ICON_PERSON = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="6" r="2.6"/><path d="M3.3 15c.6-3.6 3.1-5.2 5.7-5.2s5.1 1.6 5.7 5.2"/></svg>';

// ===================== ABOUT PAGE: PROBLEM VS SOLUTION FLOW =====================
// One seeded record — Ramirez, Elena / Aetna PPO / 8X-3082-A, the same flagged patient
// from seedPatients() above — walked through both worlds side by side, so the "before"
// half of this animation is literally the record sitting in the Queue right now.
const ABOUT_FLOW_ICON_DOC = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2h5l3 3v11H5z"/><path d="M10 2v3h3"/></svg>';
const ABOUT_FLOW_ICON_SEND = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2L2 8.5l5.5 2L10 16l6-14z"/><path d="M7.5 10.5L16 2"/></svg>';
const ABOUT_FLOW_ICON_X = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9"/></svg>';
const ABOUT_FLOW_ICON_REDO = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 9a6 6 0 10-1.8 4.3"/><path d="M15 5v4h-4"/></svg>';
const ABOUT_FLOW_ICON_FLAG = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16V2.5"/><path d="M4.5 3.5h9l-2 3 2 3h-9"/></svg>';
const ABOUT_FLOW_ICON_SPARK = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.5l1.4 4.1 4.1 1.4-4.1 1.4L9 13.5l-1.4-4.1-4.1-1.4 4.1-1.4z"/></svg>';
const ABOUT_FLOW_ICON_CHECK = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="6.5"/><path d="M6.2 9.2l1.8 1.8 3.8-4"/></svg>';

const ABOUT_FLOW_TOP_STEPS = [
  { icon: ABOUT_FLOW_ICON_DOC,   title: 'Intake entered',     sub: 'Aetna · ID 8X-3082-A',        tone: 'neutral' },
  { icon: ABOUT_ICON_SHIELD,     title: 'Eligibility check',  sub: 'EDI 270/271 → Active ✓',      tone: 'pass' },
  { icon: ABOUT_FLOW_ICON_SEND,  title: 'Claim submitted',    sub: 'Sent exactly as entered',     tone: 'neutral' },
  { icon: ABOUT_ICON_CLOCK,      title: '~3 weeks later',     sub: 'No flag, no signal',          tone: 'delay' },
  { icon: ABOUT_FLOW_ICON_X,     title: 'Claim denied',       sub: 'CO-16 · Missing/invalid',     tone: 'bad', tip: 'Rework cost ~₹2,075 · resolution 1–3 weeks' },
  { icon: ABOUT_FLOW_ICON_REDO,  title: 'Manual rework',      sub: '₹2,075 avg · resolution begins', tone: 'rework' },
];
const ABOUT_FLOW_BOT_STEPS = [
  { icon: ABOUT_FLOW_ICON_DOC,   title: 'Intake entered',   sub: 'Aetna · ID 8X-3082-A',     tone: 'navy' },
  { icon: ABOUT_FLOW_ICON_FLAG,  title: 'Format flagged',   sub: 'Rules engine · instant',   tone: 'warn' },
  { icon: ABOUT_FLOW_ICON_SPARK, title: 'AI explains fix',  sub: 'Plain language for staff', tone: 'cyan', tag: 'AI' },
  { icon: ABOUT_FLOW_ICON_CHECK, title: 'Staff confirms',   sub: 'Corrected Member ID',      tone: 'navy' },
  { icon: ABOUT_ICON_SHIELD,     title: 'Re-verified',      sub: 'Clean in seconds',         tone: 'good' },
  { icon: ABOUT_FLOW_ICON_SEND,  title: 'Claim submitted',  sub: 'Same day · zero rework',   tone: 'cyan' },
];
const ABOUT_FLOW_CAPTIONS_LEFT = [
  'Intake keyed in — the Member ID carries a formatting error no one can see.',
  'Eligibility returns Active. It looks fine, because policy status was never the problem — format is.',
  'The claim goes out with the bad Member ID.',
  'Three weeks pass. No flag, no signal, no way to know.',
  'Denied. CO-16: missing or invalid information.',
  'Manual rework begins — roughly ₹2,075 and 1–3 weeks to resolve.',
];
const ABOUT_FLOW_CAPTIONS_RIGHT = [
  'Intake keyed in — the same Member ID, the same hidden formatting error.',
  'The rules engine catches the Member ID format the instant it is entered.',
  'AI writes a plain-language explanation so staff know exactly what to fix.',
  'Staff confirms the corrected Member ID in place.',
  'Re-verified clean in seconds.',
  'Claim submitted clean the same day — zero rework.',
];

function aboutFlowRow(steps, track) {
  return `<div class="about-flow-grid" data-track="${track}">
    <div class="about-flow-track-line"></div>
    <div class="about-flow-track-progress" data-flow-progress="${track}"></div>
    ${steps.map((s, i) => `
      <div class="about-flow-node tone-${s.tone}" data-flow-node="${track}" data-idx="${i}" role="button" tabindex="0">
        <div class="about-flow-circle-wrap">
          <div class="about-flow-ring"></div>
          <div class="about-flow-circle">${s.icon}</div>
          ${s.tag ? `<div class="about-flow-tag">${escapeHtml(s.tag)}</div>` : ''}
          ${s.tip ? `<div class="about-flow-tip">${escapeHtml(s.tip)}</div>` : ''}
        </div>
        <div class="about-flow-title">${escapeHtml(s.title)}</div>
        <div class="about-flow-sub">${escapeHtml(s.sub)}</div>
      </div>`).join('')}
  </div>`;
}

function viewAboutFlow() {
  return `<section class="about-flow">
    <div class="about-flow-inner">
      <div class="about-flow-head" data-reveal="up">
        <div class="about-section-kicker">The cost of unverified intake</div>
        <h2 class="about-section-heading">One intake. Two outcomes.</h2>
        <p class="about-section-lead">The same patient record — Aetna, Member ID 8X-3082-A — carrying one hidden formatting error. Step through both worlds and watch exactly where they diverge.</p>
      </div>

      <div class="about-flow-tracks">
        <div class="about-flow-band" data-flow-band><div class="about-flow-band-chip">Where it diverges</div></div>

        <div class="about-flow-row">
          <div class="about-flow-row-label is-muted"><span class="about-flow-row-dot"></span>Without Verified</div>
          ${aboutFlowRow(ABOUT_FLOW_TOP_STEPS, 'top')}
        </div>

        <div class="about-flow-row">
          <div class="about-flow-row-label is-accent"><span class="about-flow-row-dot"></span>With Verified</div>
          ${aboutFlowRow(ABOUT_FLOW_BOT_STEPS, 'bot')}
        </div>
      </div>

      <div class="about-flow-controls">
        <button class="about-flow-play" data-flow-play type="button" hidden></button>
        <div class="about-flow-scrub" data-flow-scrub>
          <div class="about-flow-scrub-track"></div>
          <div class="about-flow-scrub-fill" data-flow-scrub-fill></div>
          <div class="about-flow-dots">
            ${[1, 2, 3, 4, 5, 6].map(n => `<button class="about-flow-dot" data-flow-dot="${n}" type="button" aria-label="Step ${n}">${n}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="about-flow-captions">
        <div class="about-flow-caption is-muted">
          <div class="about-flow-caption-label">Without Verified</div>
          <div class="about-flow-caption-text" data-flow-caption="top"></div>
        </div>
        <div class="about-flow-caption is-accent">
          <div class="about-flow-caption-label">With Verified</div>
          <div class="about-flow-caption-text" data-flow-caption="bot"></div>
        </div>
      </div>

      <p class="about-flow-reduced-note" data-flow-reduced-note hidden>Reduced motion is on — showing the moment of divergence. Use the steps to compare.</p>
    </div>
  </section>`;
}

function viewAbout() {
  return `<div class="about-page">

    <section class="about-hero">
      <div class="about-hero-inner" data-reveal="up">
        <div class="about-mark">${ABOUT_ICON_PULSE}</div>
        <p class="about-hero-line">Every eligibility check either confirms coverage —<br>or hides a mismatch that becomes a denial three weeks later.</p>
        <p class="about-hero-sub">This is how Verified closes that gap.</p>
      </div>
      <div class="about-scroll-cue" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </section>

    <section class="about-pipeline">
      <div class="about-pipeline-grid">
        <div class="about-pipeline-pin">
          <div class="about-stage-tag">Stage <span class="about-stage-num">1</span> of ${PIPELINE_STEPS.length}</div>
          <div class="about-stage-label">${escapeHtml(PIPELINE_STEPS[0].label)}</div>
          ${aboutDiagramSvg()}
        </div>
        <div class="about-pipeline-scroll">
          ${PIPELINE_STEPS.map((s, i) => `
            <div class="about-stage-block" data-stage-index="${i}">
              <div class="about-stage-icon">${s.icon}</div>
              <div class="about-stage-eyebrow">0${i + 1} / 0${PIPELINE_STEPS.length}</div>
              <h3 class="about-stage-heading">${escapeHtml(s.label)}</h3>
              <p class="about-stage-body">${escapeHtml(s.long)}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="about-compare">
      <div class="about-compare-grid">
        <div class="about-compare-col is-muted" data-reveal="left">
          <div class="about-compare-icon">${ABOUT_ICON_HUB}</div>
          <div class="about-compare-label">What a clearinghouse check does</div>
          <p>Sends an EDI 270 to the payer and gets a 271 back. Confirms the policy is active, the plan, the group.</p>
          <p>It answers one question: is this person covered right now? It has no opinion on whether the Member ID you gave it was even typed correctly.</p>
        </div>
        <div class="about-compare-col is-accent" data-reveal="right">
          <div class="about-compare-icon">${ABOUT_ICON_SHIELD}</div>
          <div class="about-compare-label">What Verified adds</div>
          <p>Catches the malformed Member ID <em>before</em> that 270 ever goes out — a bad request doesn't get a good answer, it gets rejected days later.</p>
          <p>Shows the exact rule that broke, suggests a fix with a character-level diff, and waits for a human to confirm it. Nothing changes in the record silently.</p>
        </div>
      </div>
    </section>

    ${viewAboutFlow()}

    <section class="about-payers">
      <div class="about-payers-inner">
        <div class="about-section-kicker" data-reveal="up">The rulebook</div>
        <h2 class="about-section-heading" data-reveal="up">Six payers. Six patterns. Zero ambiguity.</h2>
        <p class="about-section-lead" data-reveal="up">Every Member ID format below is a plain regular expression — not a model's best guess. If a payer changes its format, the fix is one line, not a retraining run.</p>
        <div class="about-payer-grid" data-reveal="stagger-up">
          ${PAYERS.map(p => `
            <div class="about-payer-card">
              <div class="about-payer-icon">${ABOUT_ICON_CARD}</div>
              <div class="about-payer-name">${escapeHtml(p.name)}</div>
              <div class="about-payer-format">${escapeHtml(p.readable)}</div>
              <div class="about-payer-example">${escapeHtml(p.example)}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>

    <section class="about-boundary">
      <div class="about-boundary-inner">
        <p class="about-boundary-text" data-reveal="up"><b>Deterministic rules</b> decide <b>what</b> is wrong.<br>AI only decides <b>how</b> to explain it.</p>
        <div class="about-boundary-diagram" data-reveal="draw">
          <div class="about-bd-box about-bd-rules">Rules Engine</div>
          <svg class="about-bd-arrow" viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12h64M56 4l10 8-10 8"/></svg>
          <div class="about-bd-box about-bd-suggestion">Suggestion</div>
        </div>
      </div>
    </section>

    <section class="about-proof">
      <div class="about-proof-inner">
        <div class="about-section-kicker" data-reveal="up">Not a mockup</div>
        <h2 class="about-section-heading" data-reveal="up">What you're looking at right now is the actual deployable artifact.</h2>
        <div class="about-proof-grid" data-reveal="stagger-up">
          <div class="about-proof-item">
            <div class="about-proof-icon">${ABOUT_ICON_NODEPS}</div>
            <h4>Zero dependencies</h4>
            <p>No React, no bundler, no node_modules in the browser. One HTML file, one stylesheet, one script.</p>
          </div>
          <div class="about-proof-item">
            <div class="about-proof-icon">${ABOUT_ICON_BOLT}</div>
            <h4>Zero build step</h4>
            <p>Open index.html, or serve the folder — that's the entire deploy story, on this machine or any other.</p>
          </div>
          <div class="about-proof-item">
            <div class="about-proof-icon">${ABOUT_ICON_CLOCK}</div>
            <h4>Real audit trail</h4>
            <p>Every verification attempt — pass or fail — is timestamped on the record the moment it happens, not reconstructed after.</p>
          </div>
          <div class="about-proof-item">
            <div class="about-proof-icon">${ABOUT_ICON_PERSON}</div>
            <h4>Human confirms every fix</h4>
            <p>The suggestion never applies itself. Not once, not by default, not after a timeout. A person clicks confirm.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="about-close">
      <div data-reveal="up">
        <div class="about-mark about-mark-sm">${ABOUT_ICON_PULSE}</div>
        <p class="about-close-line">See it catch a real mismatch.</p>
        <button class="btn btn-primary" data-action="nav" data-view="intake">Load the demo batch →</button>
      </div>
    </section>

  </div>`;
}

// ===================== RENDER: INTAKE =====================
const ICON_CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.3v3.6"/><circle cx="8" cy="11.2" r="0.15" fill="currentColor" stroke-width="2.6"/></svg>';
function fieldCheck(status) {
  if (status === 'valid') return `<span class="field-check field-check-valid">${ICON_CHECK}</span>`;
  if (status === 'invalid') return `<span class="field-check field-check-invalid">${ICON_WARN}</span>`;
  return '';
}

function clearIntakeForm() {
  setState({ form: { name: '', dob: '', payer: '', memberId: '' }, err: {}, submitting: false });
}

function intakeWorkspaceSummary() {
  const total = state.patients.length;
  const flagged = state.patients.filter(p => p.status === 'flagged').length;
  const confirmed = state.patients.filter(p => p.status === 'confirmed').length;
  const recent = [...state.patients].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5);
  return { total, flagged, confirmed, recent };
}

function intakeActivity(summary) {
  if (!summary.recent.length) return `<div class="intake-empty-activity"><span class="intake-empty-icon">↗</span><strong>No intake activity yet</strong><p>Load the seeded batch or verify a patient manually to start the audit stream.</p></div>`;
  return `<div class="intake-activity-list">${summary.recent.map(p => `<div class="intake-activity-item">
    <span class="intake-activity-dot ${p.status}"></span><div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.payer)} · ${escapeHtml(p.member)}</span></div>${statusBadge(p.status)}
  </div>`).join('')}</div>`;
}

function viewIntake() {
  const { batch, form, err, submitting } = state;
  const summary = intakeWorkspaceSummary();
  const def = PAYERS.find(p => p.name === form.payer);
  const nameValid = form.name.trim().length > 0;
  const dobValid = !!form.dob;
  const payerValid = !!form.payer;
  const midTrim = form.memberId.trim();
  const midStatus = def && midTrim ? (def.re.test(midTrim) ? 'valid' : 'invalid') : null;
  const stepsDone = [nameValid, dobValid, payerValid, midStatus === 'valid'].filter(Boolean).length;
  return `<div class="view intake-view">
    <div class="intake-topbar"><div class="view-header"><div class="hero-eyebrow intake-eyebrow">INTAKE WORKSPACE · ${state.apiStatus === 'online' ? 'BACKEND CONNECTED' : 'DEMO FALLBACK'}</div><h1 class="page-title">Intake</h1><p class="page-sub">Load a batch for verification, or enter a patient manually.</p></div><div class="intake-health"><i class="${state.apiStatus === 'online' ? 'online' : 'offline'}"></i><span>${state.apiStatus === 'online' ? 'SQLite queue connected' : 'Local queue active'}</span></div></div>
    <div class="intake-stat-grid">
      <div class="intake-stat"><span>Records loaded</span><strong>${summary.total}</strong><small>${batch === 'loading' ? 'Ingesting now…' : 'Ready for review'}</small></div>
      <div class="intake-stat intake-stat-warn"><span>Needs review</span><strong>${summary.flagged}</strong><small>Format or policy flags</small></div>
      <div class="intake-stat intake-stat-good"><span>Confirmed</span><strong>${summary.confirmed}</strong><small>Passed verification</small></div>
      <div class="intake-stat"><span>Fields checked</span><strong>4</strong><small>Name · DOB · payer · ID</small></div>
    </div>
    <div class="intake-layout">
      <div class="intake-main-column">
      <div class="two-col intake-forms">
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
          <button class="btn btn-ghost btn-block intake-clear-btn" data-action="clearIntakeForm" type="button">Clear form</button>
          <div class="hint-text" style="margin-top:11px">Tip: an ID matching the payer format clears instantly (watch the check mark); anything else routes to Flagged Detail with an AI-suggested fix.</div>
        </div>
      </div>
      </div>
      <div class="intake-feature-rail">
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
      </div>
      <aside class="intake-side-column">
        <div class="card intake-activity-card"><div class="card-head"><div class="card-title">Recent intake activity</div><div class="card-subtitle">Latest records in the verification stream.</div></div><div class="card-body">${intakeActivity(summary)}</div></div>
        <div class="intake-checklist"><div class="profile-kicker">What gets checked</div><h3>Every record follows the same four gates.</h3><div class="intake-check-item"><i>1</i><span><b>Identity fields</b><small>Name and date of birth are present.</small></span></div><div class="intake-check-item"><i>2</i><span><b>Payer pattern</b><small>Member ID matches the selected payer format.</small></span></div><div class="intake-check-item"><i>3</i><span><b>Human review</b><small>Flagged corrections never apply silently.</small></span></div></div>
      </aside>
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
  const pf = flaggedPipelineState(d);
  const coverageFlag = isCoverageDiag(rec.diag);
  const diff = coverageFlag ? null : charDiff(rec.member, rec.suggested || '');

  const trail = [
    { label: rec.origin === 'batch' ? 'Batch ingested' : 'Manual entry submitted', time: rec.updated, state: 'done' },
    { label: coverageFlag ? 'Coverage check flagged this record — routed to Flagged' : 'Eligibility check failed — routed to Flagged', time: rec.updated, state: 'flag' },
    ...(d.attempts || []).map(a => ({
      label: a.result === 'passed' ? 'Re-verification passed' : `Re-verification failed — "${a.value}"`,
      time: relTime(a.time), state: a.result === 'passed' ? 'done' : 'flag',
    })),
    ...(d.phase === 'reverifying' ? [{ label: 'Re-verifying format…', time: 'now', state: 'active' }] : []),
    ...(d.phase === 'checking_coverage' ? [{ label: 'Checking coverage with payer…', time: 'now', state: 'active' }] : []),
  ];

  return `<div class="view">
    <span class="link-back" data-action="backToQueue">← Back to queue</span>
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:6px;flex-wrap:wrap">
      <h1 class="page-title" style="margin:0">${escapeHtml(rec.name)}</h1>
      ${statusBadge('flagged')}
    </div>
    <div style="font-size:var(--fs-body-sm);color:var(--zinc-500);margin-bottom:18px">${escapeHtml(rec.payer)} · DOB ${escapeHtml(rec.dob)} · #${escapeHtml(rec.mrn)}</div>

    ${pipelineBreadcrumb(pf.activeKey, pf.doneThrough)}

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
            ${(rec.diag.field === 'member_id' || rec.diag.field === 'group_number') ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);line-height:1.6">
              <span class="k" style="display:block;width:auto;margin-bottom:3px">Impact:</span>
              <span class="v-act">Until resolved, payer cannot return benefit-tier data (deductible, co-pay, UCR out-of-network cap) for cost estimate.</span>
            </div>` : ''}
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
              <div style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--cyan-600)">${coverageFlag ? 'Payer eligibility response' : 'AI-generated suggestion'}</div>
            </div>
            ${d.sugLoading ? `
              <div style="display:flex;align-items:center;gap:11px;color:#0E7490;padding:4px 0 6px">
                <span class="spinner spinner-cyan"></span><span style="font-size:var(--fs-body-sm);font-weight:500">Generating suggestion…</span>
              </div>
            ` : `
              <div style="animation:fadein .22s ease-out">
                <div style="font-size:var(--fs-body);line-height:1.65;color:var(--zinc-900);margin-bottom:16px">${escapeHtml(rec.suggestion)}</div>

                ${!coverageFlag ? `
                <div style="background:var(--white);border:1px solid var(--cyan-border);border-radius:var(--radius-sm);padding:13px 15px;margin-bottom:${d.editing ? '14px' : '2px'}">
                  <div class="diff-line" style="margin-bottom:8px"><span class="diff-label">Entered</span>${renderDiffChars(diff.a)}</div>
                  <div class="diff-line"><span class="diff-label">Suggested</span>${renderDiffChars(diff.b)}</div>
                </div>
                ` : ''}

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
        ${d.checkError ? `
          <div class="banner banner-warn section-gap" style="display:block">
            <div class="banner-title">Couldn't verify — retry</div>
            <div class="banner-sub" style="display:block;margin-top:3px">${escapeHtml(d.checkError)} This isn't a new flag — the format already checks out.</div>
          </div>
        ` : ''}

        ${d.phase !== 'passed' ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${(d.phase === 'reverifying' || d.phase === 'checking_coverage') ? `
              <button class="btn btn-primary" disabled><span class="spinner"></span> ${d.phase === 'checking_coverage' ? 'Checking coverage…' : 'Re-verifying…'}</button>
            ` : `
              <button class="btn btn-primary" data-action="confirmReverify">${d.editing ? 'Re-verify' : (coverageFlag ? 'Recheck coverage' : 'Confirm & re-verify')}</button>
              ${!d.editing ? `<button class="btn btn-secondary" data-action="startEdit">Edit manually</button>` : `<button class="btn btn-secondary" data-action="cancelEdit">Cancel edit</button>`}
            `}
          </div>
          <div class="hint-text" style="margin-top:13px">${coverageFlag
            ? 'Rechecking re-runs this Member ID and name against the payer. Edit manually first only if you believe the entered ID or name was wrong.'
            : 'The suggested value is never applied automatically — it takes effect only when you confirm or edit and re-verify.'}</div>
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
            <div style="display:flex;align-items:baseline;gap:9px${(p.sample_deductible || p.out_of_network_ucr_note) ? ';margin-bottom:9px' : ''}">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">Rule</span>
              <span style="font-size:var(--fs-hint);color:var(--zinc-500);line-height:1.5">${escapeHtml(p.rule)}</span>
            </div>
            ${(p.sample_deductible || p.out_of_network_ucr_note) ? `
            <div style="border-top:1px solid var(--zinc-200);margin:11px 0 9px"></div>
            ${p.sample_deductible ? `
            <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:9px">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">Deductible</span>
              <span style="font-size:var(--fs-hint);color:var(--zinc-500);line-height:1.5">${escapeHtml(p.sample_deductible)}</span>
            </div>` : ''}
            ${p.out_of_network_ucr_note ? `
            <div style="display:flex;align-items:baseline;gap:9px">
              <span style="font-size:var(--fs-micro);font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--zinc-400);width:70px;flex-shrink:0">OON UCR</span>
              <span style="font-size:var(--fs-hint);color:var(--zinc-500);line-height:1.5">${escapeHtml(p.out_of_network_ucr_note)}</span>
            </div>` : ''}
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ===================== AUTH (LOGIN / SIGNUP) =====================
// Interactions here (tab switch, password toggle, validation) deliberately bypass
// setState/render — that loop replaces #app's whole innerHTML on every call, which
// would restart the ambient particles and stagger-in animation on every keystroke.
// The screen only rejoins the normal render loop once, on hand-off to `intake`.
let authBusy = false;

const EYE_SVG = `<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 9S4.5 3.5 9 3.5 16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9z"/><circle cx="9" cy="9" r="2.4"/></svg>`;
const EYE_OFF_SVG = `<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.3 2.3l13.4 13.4"/><path d="M7.6 4.1A8.2 8.2 0 019 4c4.5 0 7.5 5.5 7.5 5.5a13.6 13.6 0 01-2.9 3.5M5.2 5.3C3 6.9 1.5 9 1.5 9S4.5 14.5 9 14.5c1 0 1.9-.2 2.7-.5"/><path d="M7.1 7.1a2.4 2.4 0 003.4 3.4"/></svg>`;
const ICON_CHECK_BIG = `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;

function htmlToEl(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function flField(name, type, label) {
  return `<div class="fl-field" data-stagger>
    <input class="fl-input" type="${type}" name="${name}" placeholder=" " autocomplete="${name === 'email' ? 'email' : 'off'}">
    <label class="fl-label">${label}</label>
    <div class="fl-err-msg"></div>
  </div>`;
}

function flPwField(name, label) {
  return `<div class="fl-field fl-field-pw" data-stagger>
    <input class="fl-input" type="password" name="${name}" placeholder=" " autocomplete="new-password">
    <label class="fl-label">${label}</label>
    <button type="button" class="pw-eye" data-action="authTogglePw" tabindex="-1" aria-label="Show password">${EYE_SVG}</button>
    <div class="fl-err-msg"></div>
  </div>`;
}

function authFormHtml(mode) {
  if (mode === 'signup') {
    return `<form class="auth-form" data-mode="signup" novalidate>
      ${flField('name', 'text', 'Full name')}
      ${flField('email', 'email', 'Email')}
      ${flPwField('password', 'Password')}
      ${flPwField('confirm', 'Confirm password')}
      <button type="button" class="btn btn-primary btn-block auth-submit-btn" data-action="authSubmit" data-stagger>Create Account</button>
    </form>`;
  }
  return `<form class="auth-form" data-mode="login" novalidate>
    ${flField('email', 'email', 'Email')}
    ${flPwField('password', 'Password')}
    <div class="auth-forgot" data-stagger><a href="javascript:void(0)" class="auth-forgot-link">Forgot password?</a></div>
    <button type="button" class="btn btn-primary btn-block auth-submit-btn" data-action="authSubmit" data-stagger>Sign In</button>
  </form>`;
}

function viewAuth() {
  return `<div class="auth-shell">
    <div class="auth-left">
      <div class="auth-particles"></div>
      <div class="auth-brand">
        <div class="auth-mark"><i></i></div>
        <div class="auth-brand-name">Verified</div>
        <div class="auth-tagline">Catch eligibility errors before they become denials.</div>
      </div>
    </div>
    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-tabs">
          <button class="auth-tab active" data-action="authTab" data-mode="login" type="button">Log In</button>
          <button class="auth-tab" data-action="authTab" data-mode="signup" type="button">Sign Up</button>
          <span class="auth-tab-indicator"></span>
        </div>
        <div class="auth-form-viewport">${authFormHtml('login')}</div>
        <button class="auth-skip" data-action="authSkip" type="button">Skip login · Demo mode →</button>
      </div>
    </div>
  </div>`;
}

function authShowSuccess(user) {
  const rightPanel = root.querySelector('.auth-right');
  if (!rightPanel) return;
  const overlay = document.createElement('div');
  overlay.className = 'auth-success';
  overlay.innerHTML = `<div class="auth-success-check">${ICON_CHECK_BIG}</div>`;
  rightPanel.appendChild(overlay);
  if (window.gsap) {
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: .15 });
    gsap.fromTo(overlay.querySelector('.auth-success-check'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'back.out(2.4)', delay: .05 });
  }
  setTimeout(() => {
    authBusy = false;
    localStorage.setItem('verified_user', JSON.stringify(user));
    setState({ view: 'overview', user });
    loadBatch();
  }, 480);
}

function mountAuthScreen() {
  const particles = root.querySelector('.auth-particles');
  if (particles && !particles.dataset.mounted) {
    particles.dataset.mounted = '1';
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('div');
      p.className = 'auth-particle';
      const size = 2 + Math.random() * 3;
      p.style.width = p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.opacity = (0.04 + Math.random() * 0.05).toFixed(2);
      p.style.setProperty('--dx', (Math.random() * 60 - 30).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.random() * 60 - 30).toFixed(0) + 'px');
      const dur = (14 + Math.random() * 14).toFixed(1) + 's';
      const delay = (Math.random() * -20).toFixed(1) + 's';
      p.style.animation = `particledrift ${dur} ease-in-out ${delay} infinite`;
      particles.appendChild(p);
    }
  }
  const fields = root.querySelectorAll('.auth-card [data-stagger]');
  if (fields.length && window.gsap) {
    gsap.fromTo(fields, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: .04 });
  }
  const rightPanel = root.querySelector('.auth-right');
  if (rightPanel && !rightPanel.dataset.kbBound) {
    rightPanel.dataset.kbBound = '1';
    rightPanel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const form = e.target.closest('.auth-form');
        if (form) { e.preventDefault(); const btn = form.querySelector('.auth-submit-btn'); if (btn) btn.click(); }
      }
    });
  }
}

// ===================== APP ROOT =====================
function App() {
  if (state.view === 'auth') return `${viewAuth()}${toastStack()}`;
  const views = { about: viewAbout, overview: viewOverview, profile: viewProfile, intake: viewIntake, queue: viewQueue, flagged: viewFlagged, config: viewConfig, insights: viewInsights };
  const view = views[state.view] || viewAbout;
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
  if (state.view === 'auth') mountAuthScreen();
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
  clearIntakeForm() { clearIntakeForm(); },
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
  retryCoverageCheck(el) { retryCoverageCheck(el.dataset.id); },
  dismissToast(el) { dismissToast(Number(el.dataset.tid)); },
  openPalette() { setState({ paletteOpen: true, paletteQuery: '', paletteSel: 0 }); },
  closePalette() { setState({ paletteOpen: false }); },
  paletteRun(el) { const items = getPaletteItems(); const it = items[Number(el.dataset.idx)]; if (it) it.run(); },
  exportInsightsPdf(el) { exportInsightsPdf(el); },
  noop() {},

  authTab(el) {
    if (el.classList.contains('active')) return;
    const tabsWrap = el.parentElement;
    tabsWrap.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const mode = el.dataset.mode;
    const idx = mode === 'signup' ? 1 : 0;
    const indicator = tabsWrap.querySelector('.auth-tab-indicator');
    if (window.gsap) gsap.to(indicator, { xPercent: idx * 100, duration: .28, ease: 'power2.out' });
    else indicator.style.transform = `translateX(${idx * 100}%)`;

    const card = tabsWrap.closest('.auth-card');
    const viewport = card.querySelector('.auth-form-viewport');
    const oldForm = viewport.querySelector('.auth-form');
    const newForm = htmlToEl(authFormHtml(mode));
    newForm.style.opacity = '0';
    viewport.appendChild(newForm);
    if (window.gsap) {
      gsap.to(oldForm, {
        opacity: 0, y: -10, duration: .15, ease: 'power1.in',
        onComplete: () => {
          oldForm.remove();
          gsap.fromTo(newForm, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .22, ease: 'power2.out' });
        },
      });
    } else {
      oldForm.remove();
      newForm.style.opacity = '1';
    }
  },

  authTogglePw(el) {
    const wrap = el.closest('.fl-field-pw');
    const input = wrap.querySelector('input');
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    el.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    el.innerHTML = showing ? EYE_SVG : EYE_OFF_SVG;
    if (window.gsap) gsap.fromTo(el, { scale: .7 }, { scale: 1, duration: .22, ease: 'back.out(2.5)' });
  },

  async authSubmit(el) {
    if (authBusy) return;
    const form = el.closest('form.auth-form');
    const mode = form.dataset.mode;
    const names = mode === 'signup' ? ['name', 'email', 'password', 'confirm'] : ['email', 'password'];
    let hasErr = false;
    names.forEach(n => {
      const input = form.querySelector(`[name="${n}"]`);
      const wrap = input.closest('.fl-field');
      const val = input.value.trim();
      let msg = '';
      if (!val) msg = 'This field is required.';
      else if (n === 'confirm' && val !== form.querySelector('[name="password"]').value.trim()) msg = "Passwords don't match.";
      if (msg) {
        hasErr = true;
        wrap.classList.add('has-err');
        wrap.querySelector('.fl-err-msg').textContent = msg;
        wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
      } else {
        wrap.classList.remove('has-err');
      }
    });
    if (hasErr) return;

    authBusy = true;
    el.disabled = true;
    el.innerHTML = '<span class="spinner"></span> Connecting…';
    const payload = Object.fromEntries(names.map(n => [n, form.querySelector(`[name="${n}"]`).value.trim()]));
    try {
      const result = await apiRequest(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      authShowSuccess(result.user);
    } catch (error) {
      authBusy = false;
      el.disabled = false;
      el.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
      const passwordWrap = form.querySelector('[name="password"]').closest('.fl-field');
      passwordWrap.classList.add('has-err');
      passwordWrap.querySelector('.fl-err-msg').textContent = 'Backend is offline. Start the server on port 3001 and try again.';
    }
  },

  authSkip() {
    if (authBusy) return;
    const user = { name: 'Arjun Sharma', email: 'demo@northstar.example', role: 'Practice administrator', practice: 'Northstar Family Practice' };
    localStorage.setItem('verified_user', JSON.stringify(user));
    setState({ view: 'overview', user });
    loadBatch();
  },
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

// ===================== OVERVIEW ENTRANCE ANIMATION =====================
// Purely additive: a MutationObserver watching #app, so it never has to hook into
// render()/Actions. Every rebuild of #app creates brand-new DOM nodes (root.innerHTML
// = App()), so a per-element "already animated" flag can't survive a re-render — it
// has to be a variable that outlives the DOM. `overviewAnimated` plays the entrance
// once per *visit* to Overview (reset the moment state.view leaves 'overview') so
// incidental re-renders while already there — loading a batch, a toast, anything —
// don't replay the whole hero fade-in on top of itself.
let overviewAnimated = false;
if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

// ---- "How it works" scroll-scrubbed progress ----
// Re-created on every DOM rebuild while on Overview (not gated by overviewAnimated) because
// render() replaces #app's innerHTML wholesale — any ScrollTrigger bound to the old nodes
// goes stale the instant a toast or other incidental re-render swaps them out. It's stateless
// (driven entirely by the strip's current position in the viewport), so killing and
// re-creating it on every rebuild just resumes at the same scroll position, no discontinuity.
let pipelineScrollTrigger = null;
function teardownPipelineScroll() {
  if (pipelineScrollTrigger) { pipelineScrollTrigger.kill(); pipelineScrollTrigger = null; }
}
function applyPipelineProgress(steps, countEl, progress) {
  const n = steps.length;
  const raw = progress * n;
  steps.forEach((stepEl, i) => {
    const local = Math.max(0, Math.min(1, raw - i));
    const fill = stepEl.querySelector('.pipeline-fill');
    if (fill) fill.style.width = (local * 100) + '%';
    stepEl.classList.toggle('is-done', local >= 0.999);
    stepEl.classList.toggle('is-active', local > 0 && local < 0.999);
  });
  if (countEl) countEl.textContent = String(Math.min(n, Math.max(0, Math.ceil(raw))));
}
function setupPipelineScroll() {
  teardownPipelineScroll();
  const strip = root.querySelector('.pipeline-strip');
  if (!strip) return;
  const steps = Array.from(strip.querySelectorAll('.pipeline-step'));
  const countEl = root.querySelector('.pp-count');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyPipelineProgress(steps, countEl, 1);
    return;
  }
  if (!window.gsap || !window.ScrollTrigger) { applyPipelineProgress(steps, countEl, 1); return; }
  // `end` is a function (re-evaluated on every ScrollTrigger.refresh) rather than the plain
  // 'bottom 25%' string, because that string is viewport-relative while the page's actual max
  // scroll position is not — on a short page or a tall viewport "25% from the bottom" can land
  // past the last pixel the browser will ever let you scroll to, so progress caps below 1 and
  // the counter gets stuck one step short forever. Clamping to maxScroll guarantees it's reachable.
  pipelineScrollTrigger = ScrollTrigger.create({
    trigger: strip,
    start: 'top 85%',
    end: () => {
      const rect = strip.getBoundingClientRect();
      const desired = rect.bottom + window.scrollY - 0.25 * window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      return Math.min(desired, maxScroll - 10);
    },
    scrub: 0.35,
    onUpdate: (self) => applyPipelineProgress(steps, countEl, self.progress),
  });
}

// ---- RCM Cycle loop-arrow: draws in once, the first time it scrolls into view ----
// Unlike the pipeline scrub above, this isn't scroll-linked — it's a one-shot reveal
// (Framer Motion's whileInView + viewport:{once:true} is the spec's own reference point;
// this project has no Framer Motion, so a plain IntersectionObserver gives the identical
// "animate once on intersect, never again" semantics without adding a dependency).
let rcmLoopObserver = null;
function teardownRcmLoop() {
  if (rcmLoopObserver) { rcmLoopObserver.disconnect(); rcmLoopObserver = null; }
}
function setupRcmLoop() {
  teardownRcmLoop();
  const wrap = root.querySelector('.rcm-cycle-wrap');
  const path = root.querySelector('.rcm-loop-path');
  if (!wrap || !path) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap || !('IntersectionObserver' in window)) {
    return; // no dasharray applied — path renders fully drawn/static, never invisible
  }
  const len = path.getTotalLength ? path.getTotalLength() : 900;
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  rcmLoopObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      rcmLoopObserver.unobserve(entry.target);
      gsap.to(path, {
        strokeDashoffset: 0, duration: 1, ease: 'power2.inOut',
        // draws in as one solid stroke (the reliable version of this trick), then settles
        // back into the CSS dashed pattern once the reveal finishes — dashed at rest,
        // solid mid-draw, which reads fine since the draw only takes ~1s.
        onComplete: () => gsap.set(path, { strokeDasharray: '7 5', strokeDashoffset: 0 }),
      });
    });
  }, { threshold: 0.4 });
  rcmLoopObserver.observe(wrap);
}

if (typeof MutationObserver !== 'undefined') {
  const overviewEntranceObserver = new MutationObserver(() => {
    if (state.view !== 'overview') { overviewAnimated = false; teardownPipelineScroll(); teardownRcmLoop(); return; }
    const strip = root.querySelector('.pipeline-strip');
    if (!strip) return;
    setupPipelineScroll();
    setupRcmLoop();
    if (overviewAnimated) return;
    overviewAnimated = true;
    if (window.gsap) {
      gsap.from('.hero-eyebrow, .hero-title, .hero-sub, .hero-actions, .hero-chips', { opacity: 0, y: 14, duration: .5, stagger: .07, ease: 'power2.out' });
      gsap.from('.callout-box', { opacity: 0, y: 10, duration: .4, delay: .5, ease: 'power2.out' });
      gsap.from('.overview-cta-row, .stat-band', { opacity: 0, y: 10, duration: .4, delay: .62, ease: 'power2.out' });
      gsap.from('.view > .section-gap:last-child .feature-tile', { opacity: 0, y: 12, duration: .4, stagger: .06, delay: .74, ease: 'power2.out' });
    }
  });
  overviewEntranceObserver.observe(root, { childList: true });
}

// ===================== ABOUT PAGE SCROLL BEHAVIOR =====================
// Same additive philosophy as the Overview observer above: nothing here touches render(),
// Actions, or existing listeners. The left-column "pin" in Section 2 is pure CSS
// position:sticky (see .about-pipeline-pin) — there is no GSAP pin/scrub and no locked
// scroll here, so this only ever *reads* scroll position via IntersectionObserver, never
// controls it. Reduced-motion users get every section at full, static visibility with
// zero observers attached — content is never pre-hidden waiting for a trigger that won't fire.
let aboutStagesObserver = null;
function teardownAboutStages() {
  if (aboutStagesObserver) { aboutStagesObserver.disconnect(); aboutStagesObserver = null; }
}
function setupAboutStages() {
  teardownAboutStages();
  const blocks = Array.from(root.querySelectorAll('.about-stage-block'));
  if (!blocks.length) return;
  const countEl = root.querySelector('.about-stage-num');
  const labelEl = root.querySelector('.about-stage-label');
  const nodes = Array.from(root.querySelectorAll('.about-node'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setActive(idx) {
    if (countEl) countEl.textContent = String(idx + 1);
    if (labelEl) labelEl.textContent = PIPELINE_STEPS[idx].label;
    nodes.forEach((n, i) => {
      n.classList.toggle('is-active', i === idx);
      n.classList.toggle('is-done', i < idx);
    });
  }

  if (reduced || !('IntersectionObserver' in window)) {
    setActive(blocks.length - 1);
    return;
  }

  aboutStagesObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const idx = Number(entry.target.dataset.stageIndex);
      if (!entry.isIntersecting) return;
      setActive(idx);
      if (window.gsap && !entry.target.dataset.revealed) {
        entry.target.dataset.revealed = '1';
        gsap.from(entry.target.querySelectorAll('.about-stage-eyebrow, .about-stage-heading, .about-stage-body'),
          { opacity: 0, y: 18, duration: .5, stagger: .06, ease: 'power2.out' });
      }
    });
  }, { threshold: 0.5 });
  blocks.forEach((b) => aboutStagesObserver.observe(b));
}

let aboutRevealObserver = null;
function teardownAboutReveals() {
  if (aboutRevealObserver) { aboutRevealObserver.disconnect(); aboutRevealObserver = null; }
}
function setupAboutReveals() {
  teardownAboutReveals();
  const targets = Array.from(root.querySelectorAll('[data-reveal]'));
  if (!targets.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap || !('IntersectionObserver' in window)) return; // leave at natural full visibility

  aboutRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      aboutRevealObserver.unobserve(el);
      const type = el.dataset.reveal;
      if (type === 'up') {
        gsap.from(el, { opacity: 0, y: 24, duration: .6, ease: 'power2.out' });
      } else if (type === 'left') {
        gsap.from(el, { opacity: 0, x: -36, duration: .6, ease: 'power2.out' });
      } else if (type === 'right') {
        gsap.from(el, { opacity: 0, x: 36, duration: .6, ease: 'power2.out' });
      } else if (type === 'stagger-up') {
        gsap.from(el.children, { opacity: 0, y: 20, duration: .5, stagger: .06, ease: 'power2.out' });
      } else if (type === 'draw') {
        gsap.from(el.querySelectorAll('.about-bd-box'), { opacity: 0, y: 10, duration: .4, stagger: .15, ease: 'power2.out' });
        const path = el.querySelector('.about-bd-arrow path');
        if (path && path.getTotalLength) {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(path, { strokeDashoffset: 0, duration: .7, delay: .25, ease: 'power2.inOut' });
        }
      }
    });
  }, { threshold: 0.35 });
  targets.forEach((el) => aboutRevealObserver.observe(el));
}

// ---- "Problem vs Solution" flow: autoplaying step-through, two tracks ----
// State lives in module variables (not `state`/setState) for the same reason the scroll
// trigger above does: root.innerHTML gets replaced wholesale on every render(), so anything
// that lived only on the old DOM nodes — or that drove a full app re-render per animation
// tick — would either vanish or make this janky. A plain interval mutating the current DOM
// directly, restored to the right visual step on rebuild, is what survives that.
let aboutFlowActive = 1;
let aboutFlowPlaying = false;
let aboutFlowUserPaused = false;
let aboutFlowTimer = null;
let aboutFlowVisibilityObserver = null;
let aboutFlowDragging = false;

function aboutFlowReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function aboutFlowOnMove(e) { if (aboutFlowDragging) aboutFlowScrubTo(e.clientX); }
function aboutFlowOnUp() {
  aboutFlowDragging = false;
  window.removeEventListener('pointermove', aboutFlowOnMove);
  window.removeEventListener('pointerup', aboutFlowOnUp);
}

function teardownAboutFlow() {
  clearInterval(aboutFlowTimer);
  aboutFlowTimer = null;
  if (aboutFlowVisibilityObserver) { aboutFlowVisibilityObserver.disconnect(); aboutFlowVisibilityObserver = null; }
  window.removeEventListener('pointermove', aboutFlowOnMove);
  window.removeEventListener('pointerup', aboutFlowOnUp);
  aboutFlowDragging = false;
}

function aboutFlowRender() {
  const section = root.querySelector('.about-flow');
  if (!section) return;
  const n = aboutFlowActive;
  const fillPct = (83.334 * (n - 1) / 5).toFixed(2) + '%';

  section.querySelectorAll('[data-flow-progress]').forEach(el => { el.style.width = fillPct; });
  section.querySelectorAll('[data-flow-node]').forEach(el => {
    const idx = Number(el.dataset.idx) + 1;
    el.classList.toggle('is-active', idx === n);
    el.classList.toggle('is-done', idx < n);
  });

  const band = section.querySelector('[data-flow-band]');
  if (band) band.classList.toggle('is-visible', n === 2);

  section.querySelectorAll('[data-flow-dot]').forEach(d => {
    const dn = Number(d.dataset.flowDot);
    d.classList.toggle('is-active', dn === n);
    d.classList.toggle('is-done', dn < n);
  });
  const scrubFill = section.querySelector('[data-flow-scrub-fill]');
  if (scrubFill) scrubFill.style.width = `calc((100% - 30px) * ${(n - 1) / 5})`;

  const topCap = section.querySelector('[data-flow-caption="top"]');
  const botCap = section.querySelector('[data-flow-caption="bot"]');
  if (topCap) topCap.textContent = ABOUT_FLOW_CAPTIONS_LEFT[n - 1];
  if (botCap) botCap.textContent = ABOUT_FLOW_CAPTIONS_RIGHT[n - 1];

  const playBtn = section.querySelector('[data-flow-play]');
  if (playBtn && !playBtn.hidden) playBtn.innerHTML = aboutFlowPlaying ? '❚❚&nbsp;Pause' : '▶&nbsp;Play walkthrough';
}

function aboutFlowSetActive(n) {
  n = Math.max(1, Math.min(6, n));
  if (n === aboutFlowActive) return;
  aboutFlowActive = n;
  aboutFlowRender();
}

function aboutFlowStop() {
  clearInterval(aboutFlowTimer);
  aboutFlowTimer = null;
  aboutFlowPlaying = false;
  aboutFlowRender();
}

function aboutFlowStart() {
  if (aboutFlowReducedMotion()) return;
  clearInterval(aboutFlowTimer);
  if (aboutFlowActive >= 6) aboutFlowActive = 1;
  aboutFlowPlaying = true;
  aboutFlowRender();
  // Loops rather than stopping at step 6 — this section has no user-driven reason to end,
  // it exists purely to demonstrate the divergence for as long as it's on screen.
  aboutFlowTimer = setInterval(() => {
    aboutFlowActive = aboutFlowActive >= 6 ? 1 : aboutFlowActive + 1;
    aboutFlowRender();
  }, 1200);
}

function aboutFlowScrubTo(clientX) {
  const section = root.querySelector('.about-flow');
  const track = section && section.querySelector('[data-flow-scrub]');
  if (!track) return;
  const r = track.getBoundingClientRect();
  const inner = r.width - 30;
  const t = (clientX - r.left - 15) / (inner || 1);
  aboutFlowSetActive(Math.round(Math.max(0, Math.min(1, t)) * 5) + 1);
}

function aboutFlowUserInterrupt() {
  aboutFlowUserPaused = true;
  aboutFlowStop();
}

function setupAboutFlow() {
  teardownAboutFlow();
  const section = root.querySelector('.about-flow');
  if (!section) return;

  const reduced = aboutFlowReducedMotion();
  const playBtn = section.querySelector('[data-flow-play]');
  const note = section.querySelector('[data-flow-reduced-note]');
  if (reduced) {
    aboutFlowActive = 2; // land on the moment of divergence, no motion
    aboutFlowPlaying = false;
    if (note) note.hidden = false;
  } else {
    if (playBtn) playBtn.hidden = false;
  }
  aboutFlowRender();

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (aboutFlowPlaying) { aboutFlowUserPaused = true; aboutFlowStop(); }
      else { aboutFlowUserPaused = false; aboutFlowStart(); }
    });
  }
  section.querySelectorAll('[data-flow-dot]').forEach(dot => {
    dot.addEventListener('click', () => { aboutFlowUserInterrupt(); aboutFlowSetActive(Number(dot.dataset.flowDot)); });
  });
  section.querySelectorAll('[data-flow-node]').forEach(node => {
    node.addEventListener('click', () => { aboutFlowUserInterrupt(); aboutFlowSetActive(Number(node.dataset.idx) + 1); });
  });
  const scrub = section.querySelector('[data-flow-scrub]');
  if (scrub) {
    scrub.addEventListener('pointerdown', (e) => {
      aboutFlowUserInterrupt();
      aboutFlowDragging = true;
      aboutFlowScrubTo(e.clientX);
      window.addEventListener('pointermove', aboutFlowOnMove);
      window.addEventListener('pointerup', aboutFlowOnUp);
    });
  }

  if (reduced || !('IntersectionObserver' in window)) return;

  // Autoplay starts the moment the section is actually visible (including immediately, if
  // it's already in the initial viewport) and pauses while scrolled away — never a click
  // required, never animating a section nobody can see.
  aboutFlowVisibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!aboutFlowUserPaused && !aboutFlowPlaying) aboutFlowStart();
      } else if (aboutFlowPlaying) {
        clearInterval(aboutFlowTimer);
        aboutFlowTimer = null;
        aboutFlowPlaying = false;
        aboutFlowRender();
      }
    });
  }, { threshold: 0.4 });
  aboutFlowVisibilityObserver.observe(section);
}

if (typeof MutationObserver !== 'undefined') {
  const aboutObserver = new MutationObserver(() => {
    if (state.view !== 'about') {
      teardownAboutStages(); teardownAboutReveals(); teardownAboutFlow();
      aboutFlowActive = 1; aboutFlowPlaying = false; aboutFlowUserPaused = false;
      return;
    }
    const page = root.querySelector('.about-page');
    if (!page) return;
    setupAboutStages();
    setupAboutReveals();
    setupAboutFlow();
  });
  aboutObserver.observe(root, { childList: true });
}

// ===================== INSIGHTS PAGE: bar chart reveal on scroll ====================
// Same reasoning as overviewAnimated above: root.innerHTML is replaced wholesale on every
// render(), so "has this already played" has to live in a variable outside the DOM. Plays
// once per visit to Insights, reset the moment state.view leaves it.
let insightsChartRevealed = false;
let insightsChartObserver = null;
function teardownInsightsChart() {
  if (insightsChartObserver) { insightsChartObserver.disconnect(); insightsChartObserver = null; }
}
function setupInsightsChart() {
  teardownInsightsChart();
  const chart = root.querySelector('[data-insight-chart]');
  if (!chart) return;
  if (insightsChartRevealed || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    chart.classList.add('is-revealed');
    insightsChartRevealed = true;
    return;
  }
  insightsChartObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      chart.classList.add('is-revealed');
      insightsChartRevealed = true;
      teardownInsightsChart();
    });
  }, { threshold: 0.3 });
  insightsChartObserver.observe(chart);
}

if (typeof MutationObserver !== 'undefined') {
  const insightsObserver = new MutationObserver(() => {
    if (state.view !== 'insights') { teardownInsightsChart(); insightsChartRevealed = false; return; }
    setupInsightsChart();
  });
  insightsObserver.observe(root, { childList: true });
}

// ===================== INIT =====================
render();
