import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import db from './db.js';
import { checkEligibility } from './rules.js';
import { generateSuggestion } from './correction.js';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  res.json({ user: { name: 'Arjun Sharma', email, role: 'Practice administrator', practice: 'Northstar Family Practice' }, demo: true });
});

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
  res.status(201).json({ user: { name, email, role: 'Practice administrator', practice: 'Northstar Family Practice' }, demo: true });
});

function now() {
  return new Date().toISOString();
}

function getPayer(payerId) {
  return db.prepare('SELECT * FROM payers WHERE id = ?').get(payerId);
}

function getFlagForPatient(patientId) {
  return db.prepare('SELECT * FROM flags WHERE patient_id = ?').get(patientId);
}

app.post('/api/intake', async (req, res) => {
  const { name, dob, payer_id, member_id } = req.body || {};
  if (!name || !dob || !payer_id || !member_id) {
    return res.status(400).json({ error: 'name, dob, payer_id, and member_id are required' });
  }

  const payer = getPayer(payer_id);
  if (!payer) {
    return res.status(400).json({ error: `unknown payer_id: ${payer_id}` });
  }

  const patient = {
    id: crypto.randomUUID(),
    name,
    dob,
    payer_id,
    member_id,
    status: 'pending',
    policy_status: 'active',
    created_at: now(),
    updated_at: now(),
  };

  const violations = checkEligibility(patient, payer);

  if (violations.length === 0) {
    patient.status = 'confirmed';
    db.prepare(`INSERT INTO patients (id, name, dob, payer_id, member_id, status, policy_status, created_at, updated_at)
      VALUES (@id, @name, @dob, @payer_id, @member_id, @status, @policy_status, @created_at, @updated_at)`).run(patient);
    return res.json({ patient: { ...patient, payer_name: payer.name }, status: 'confirmed' });
  }

  patient.status = 'flagged';
  db.prepare(`INSERT INTO patients (id, name, dob, payer_id, member_id, status, policy_status, created_at, updated_at)
    VALUES (@id, @name, @dob, @payer_id, @member_id, @status, @policy_status, @created_at, @updated_at)`).run(patient);

  const violation = violations[0];
  const suggestion = await generateSuggestion(violation, payer.name);
  const flag = {
    id: crypto.randomUUID(),
    patient_id: patient.id,
    field: violation.field,
    rule_violated: violation.rule_violated,
    expected: violation.expected,
    actual: violation.actual,
    carc_code: violation.carc_code,
    suggestion,
    confirmed_at: null,
  };
  db.prepare(`INSERT INTO flags (id, patient_id, field, rule_violated, expected, actual, carc_code, suggestion, confirmed_at)
    VALUES (@id, @patient_id, @field, @rule_violated, @expected, @actual, @carc_code, @suggestion, @confirmed_at)`).run(flag);

  res.json({ patient: { ...patient, payer_name: payer.name }, status: 'flagged', flag });
});

app.get('/api/patients', (req, res) => {
  const patients = db.prepare(`SELECT patients.*, payers.name AS payer_name,
      flags.field AS flag_field, flags.rule_violated AS flag_rule, flags.expected AS flag_expected,
      flags.actual AS flag_actual, flags.suggestion AS flag_suggestion
    FROM patients LEFT JOIN payers ON payers.id = patients.payer_id
    LEFT JOIN flags ON flags.patient_id = patients.id
    ORDER BY patients.created_at DESC`).all();
  res.json(patients);
});

app.get('/api/patients/:id', (req, res) => {
  const patient = db.prepare(`SELECT patients.*, payers.name AS payer_name
    FROM patients LEFT JOIN payers ON payers.id = patients.payer_id
    WHERE patients.id = ?`).get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'patient not found' });
  const flag = getFlagForPatient(patient.id) || null;
  res.json({ patient, flag });
});

app.post('/api/patients/:id/confirm', async (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ error: 'patient not found' });

  const { corrected_fields } = req.body || {};
  const allowed = ['name', 'dob', 'payer_id', 'member_id', 'policy_status'];
  const safeFields = Object.fromEntries(
    Object.entries(corrected_fields || {}).filter(([k]) => allowed.includes(k))
  );
  const updated = { ...patient, ...safeFields, updated_at: now() };

  const payer = getPayer(updated.payer_id);
  const violations = checkEligibility(updated, payer);

  db.prepare(`UPDATE patients SET name=@name, dob=@dob, payer_id=@payer_id, member_id=@member_id,
    policy_status=@policy_status, status=@status, updated_at=@updated_at WHERE id=@id`).run({
    ...updated,
    status: violations.length === 0 ? 'confirmed' : 'flagged',
  });

  let flag = getFlagForPatient(patient.id);

  if (violations.length === 0) {
    if (flag) {
      db.prepare('UPDATE flags SET confirmed_at = ? WHERE id = ?').run(now(), flag.id);
    }
    return res.json({ status: 'confirmed' });
  }

  const violation = violations[0];
  const suggestion = await generateSuggestion(violation, payer.name);

  if (flag) {
    db.prepare(`UPDATE flags SET field=@field, rule_violated=@rule_violated, expected=@expected,
      actual=@actual, carc_code=@carc_code, suggestion=@suggestion, confirmed_at=NULL WHERE id=@id`).run({
      id: flag.id,
      field: violation.field,
      rule_violated: violation.rule_violated,
      expected: violation.expected,
      actual: violation.actual,
      carc_code: violation.carc_code,
      suggestion,
    });
    flag = getFlagForPatient(patient.id);
  } else {
    flag = {
      id: crypto.randomUUID(),
      patient_id: patient.id,
      field: violation.field,
      rule_violated: violation.rule_violated,
      expected: violation.expected,
      actual: violation.actual,
      carc_code: violation.carc_code,
      suggestion,
      confirmed_at: null,
    };
    db.prepare(`INSERT INTO flags (id, patient_id, field, rule_violated, expected, actual, carc_code, suggestion, confirmed_at)
      VALUES (@id, @patient_id, @field, @rule_violated, @expected, @actual, @carc_code, @suggestion, @confirmed_at)`).run(flag);
  }

  res.json({ status: 'flagged', flag });
});

app.get('/api/payers', (req, res) => {
  const payers = db.prepare('SELECT * FROM payers').all();
  res.json(payers);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
