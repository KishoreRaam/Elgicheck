// Second-stage eligibility verification: after a Member ID passes the payer's format regex
// (checked client-side / via rules.js), this module checks REAL coverage status with the
// payer through Stedi's Eligibility Check API (270/271).
//
// MOCK MODE is automatic: if STEDI_API_KEY is unset, every check is answered locally and
// deterministically (no network call), so the demo works offline. This is logged loudly at
// startup and on every request so a live demo can never be mistaken for mock mode.

const STEDI_URL = 'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3';
const REQUEST_TIMEOUT_MS = 10000;

// Best-effort Stedi trading partner service IDs for the six demo payers. These identify the
// payer inside Stedi's network and are NOT the same as the app's own PAYERS format rules —
// confirm each one against Stedi's live payer directory before using this in production.
const TRADING_PARTNER_IDS = {
  'Aetna PPO': '60054',
  'UnitedHealthcare': '87726',
  'Cigna OAP': '62308',
  'BCBS TX': 'G84980',
  'Humana Gold': '61101',
  'Kaiser': '47198',
};

// Deterministic demo fixtures, keyed by Member ID (case-insensitive). Repeatable regardless
// of network conditions — exactly the three outcomes the frontend branches on.
const MOCK_FIXTURES = {
  'AE-1000-A': { status: 'active', planName: 'Aetna PPO Choice 1000', nameMatch: true },
  'AE-2000-B': { status: 'inactive', planName: null, nameMatch: true },
  'AE-3000-C': { status: 'active', planName: 'Aetna PPO Choice 3000', nameMatch: false },
};

export const eligibilityMode = process.env.STEDI_API_KEY ? 'live' : 'mock';

if (eligibilityMode === 'live') {
  console.log('[stedi] LIVE mode — STEDI_API_KEY is set. Coverage checks call the real Stedi API.');
} else {
  console.log('[stedi] MOCK mode — STEDI_API_KEY is not set. Coverage checks return deterministic mock data.');
  console.log('[stedi] Demo Member IDs: AE-1000-A (active/match), AE-2000-B (inactive), AE-3000-C (active/name mismatch).');
}

function mockCheck({ memberId }) {
  const key = (memberId || '').trim().toUpperCase();
  if (MOCK_FIXTURES[key]) {
    return { ...MOCK_FIXTURES[key], raw: { mock: true, fixture: key } };
  }
  if (key.includes('INACTIVE')) {
    return { status: 'inactive', planName: null, nameMatch: true, raw: { mock: true, matchedRule: 'contains INACTIVE' } };
  }
  if (key.includes('MISMATCH')) {
    return { status: 'active', planName: 'Mock Standard Plan', nameMatch: false, raw: { mock: true, matchedRule: 'contains MISMATCH' } };
  }
  if (key.includes('FAIL')) {
    const err = new Error('Simulated mock failure (Member ID contained FAIL)');
    err.code = 'MOCK_SIMULATED_FAILURE';
    throw err;
  }
  return { status: 'active', planName: 'Mock Standard Plan', nameMatch: true, raw: { mock: true, matchedRule: 'default' } };
}

function toStediDate(dob) {
  return (dob || '').replace(/-/g, '');
}

async function liveCheck({ payer, memberId, firstName, lastName, dob }) {
  const tradingPartnerServiceId = TRADING_PARTNER_IDS[payer];
  if (!tradingPartnerServiceId) {
    const err = new Error(`No Stedi trading partner ID configured for payer "${payer}"`);
    err.code = 'UNKNOWN_PAYER';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(STEDI_URL, {
      method: 'POST',
      headers: {
        Authorization: process.env.STEDI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tradingPartnerServiceId,
        provider: { organizationName: 'Northstar Family Practice', npi: '1999999984' },
        subscriber: { firstName, lastName, memberId, dateOfBirth: toStediDate(dob) },
        encounter: { serviceTypeCodes: ['30'] },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Stedi request timed out');
      e.code = 'STEDI_TIMEOUT';
      throw e;
    }
    err.code = err.code || 'STEDI_NETWORK_ERROR';
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body) {
    const err = new Error(`Stedi request failed (HTTP ${response.status})`);
    err.code = 'STEDI_HTTP_ERROR';
    err.raw = body;
    throw err;
  }

  // A 200 can still carry a payer-side rejection (e.g. member not found) in `errors` —
  // that's not "inactive coverage", it's "we don't actually know" — never conflate the two.
  if (Array.isArray(body.errors) && body.errors.length) {
    return { status: 'unknown', planName: null, nameMatch: false, raw: body };
  }

  const benefits = Array.isArray(body.benefitsInformation) ? body.benefitsInformation : [];
  const activeEntry = benefits.find(b => b.code === '1');
  const inactiveEntry = benefits.find(b => b.code === '6' || b.code === '7');
  const status = activeEntry ? 'active' : inactiveEntry ? 'inactive' : 'unknown';

  const planEntry = benefits.find(b => b.planCoverage || b?.benefitsAdditionalInformation?.planDescription);
  const planName = planEntry?.planCoverage || planEntry?.benefitsAdditionalInformation?.planDescription || null;

  const returned = body.subscriber || {};
  const norm = s => (s || '').trim().toLowerCase();
  const nameMatch = Boolean(
    returned.firstName && returned.lastName &&
    norm(returned.firstName) === norm(firstName) &&
    norm(returned.lastName) === norm(lastName)
  );

  return { status, planName, nameMatch, raw: body };
}

// Never throws — a failure of any kind (network, timeout, 4xx/5xx, unmapped payer) resolves
// to status: 'check_failed' so callers can never mistake "we couldn't check" for "inactive".
export async function checkCoverage(input) {
  try {
    return eligibilityMode === 'live' ? await liveCheck(input) : mockCheck(input);
  } catch (err) {
    console.error(`[stedi] check_failed (${eligibilityMode} mode):`, err.code || err.message, err.message);
    return {
      status: 'check_failed',
      planName: null,
      nameMatch: false,
      raw: { error: err.message, code: err.code || null, details: err.raw || null },
    };
  }
}
