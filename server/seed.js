import 'dotenv/config';
import db from './db.js';
import { checkEligibility } from './rules.js';
import { generateSuggestion } from './correction.js';

const NOW = '2026-01-01T00:00:00.000Z';

const PAYERS = [
  { id: 'aetna', name: 'Aetna', id_format_regex: '^[A-Z]{2}-\\d{4}-[A-Z]$', readable_format: 'XX-NNNN-A', ucr_note: 'Out-of-network reimbursed at 70% of UCR; member balance-billed for the remainder.', sample_deductible: '$1,500 individual / $3,000 family' },
  { id: 'uhc', name: 'UnitedHealthcare', id_format_regex: '^\\d{9}$', readable_format: 'NNNNNNNNN (9 digits)', ucr_note: 'Out-of-network UCR cap set at the 80th percentile; no balance-billing protection.', sample_deductible: '$750 individual / $1,500 family' },
  { id: 'cigna', name: 'Cigna', id_format_regex: '^U\\d{8}$', readable_format: 'U + 8 digits', ucr_note: 'Out-of-network claims priced at 60% of billed charges vs. UCR, whichever is lower.', sample_deductible: '$2,000 individual / $4,000 family' },
  { id: 'bcbs', name: 'BCBS', id_format_regex: '^[A-Z]{3}\\d{9}$', readable_format: 'AAA + 9 digits (12 chars)', ucr_note: 'Out-of-network reimbursed at 70% of UCR; member balance-billed for the remainder.', sample_deductible: '$2,000 individual / $4,000 family' },
  { id: 'humana', name: 'Humana', id_format_regex: '^H\\d{8}$', readable_format: 'H + 8 digits', ucr_note: 'Out-of-network care reimbursed at 65% of UCR schedule.', sample_deductible: '$1,000 individual / $2,000 family' },
  { id: 'kaiser', name: 'Kaiser', id_format_regex: '^\\d{10}$', readable_format: 'NNNNNNNNNN (10 digits)', ucr_note: 'Out-of-network care is not covered except emergencies — no UCR schedule applies.', sample_deductible: '$0 individual (HMO, in-network only)' },
];

const CONFIRMED_PATIENTS = [
  { id: 'p1', name: 'Okafor, James', dob: '1991-08-02', payer_id: 'uhc', member_id: '493210087' },
  { id: 'p2', name: 'Chen, Wei', dob: '1979-11-23', payer_id: 'cigna', member_id: 'U40021398' },
  { id: 'p3', name: 'Nguyen, Tran', dob: '1983-02-17', payer_id: 'humana', member_id: 'H55830921' },
  { id: 'p4', name: 'Patel, Riya', dob: '1996-07-09', payer_id: 'kaiser', member_id: '6120094475' },
  { id: 'p5', name: 'Johnson, Marcus', dob: '1974-12-01', payer_id: 'aetna', member_id: 'AE-7741-C' },
  { id: 'p6', name: 'Kim, Soo-jin', dob: '1990-04-11', payer_id: 'cigna', member_id: 'U71230045' },
  { id: 'p7', name: 'Brooks, Daniel', dob: '1969-06-19', payer_id: 'bcbs', member_id: 'BCT004521190' },
  { id: 'p8', name: 'Torres, Miguel', dob: '1982-10-06', payer_id: 'kaiser', member_id: '8890041267' },
];

const FLAGGED_PATIENTS = [
  { id: 'p9', name: 'Ramirez, Elena', dob: '1987-03-14', payer_id: 'aetna', member_id: '8X-3082-A', policy_status: 'active' },
  { id: 'p10', name: 'Delacroix, Marie', dob: '1965-05-30', payer_id: 'bcbs', member_id: 'TX9912003', policy_status: 'active' },
  { id: 'p11', name: 'Silva, Ana', dob: '1988-09-25', payer_id: 'uhc', member_id: '4432-119', policy_status: 'active' },
  { id: 'p12', name: 'Hassan, Layla', dob: '1993-01-28', payer_id: 'humana', member_id: 'H22050991', policy_status: 'expired' },
];

function reset() {
  db.exec('DELETE FROM flags; DELETE FROM patients; DELETE FROM payers;');
}

function insertPayers() {
  const stmt = db.prepare(`INSERT INTO payers (id, name, id_format_regex, readable_format, ucr_note, sample_deductible)
    VALUES (@id, @name, @id_format_regex, @readable_format, @ucr_note, @sample_deductible)`);
  for (const p of PAYERS) stmt.run(p);
}

function insertPatient(p) {
  db.prepare(`INSERT INTO patients (id, name, dob, payer_id, member_id, status, policy_status, created_at, updated_at)
    VALUES (@id, @name, @dob, @payer_id, @member_id, @status, @policy_status, @created_at, @updated_at)`)
    .run({ ...p, created_at: NOW, updated_at: NOW });
}

async function seed() {
  reset();
  insertPayers();

  for (const p of CONFIRMED_PATIENTS) {
    insertPatient({ ...p, status: 'confirmed', policy_status: 'active' });
  }

  const payerById = Object.fromEntries(PAYERS.map((p) => [p.id, p]));

  for (const p of FLAGGED_PATIENTS) {
    insertPatient({ ...p, status: 'flagged' });
    const payer = payerById[p.payer_id];
    const violations = checkEligibility(p, payer);
    const violation = violations[0];
    const suggestion = await generateSuggestion(violation, payer.name);
    db.prepare(`INSERT INTO flags (id, patient_id, field, rule_violated, expected, actual, carc_code, suggestion, confirmed_at)
      VALUES (@id, @patient_id, @field, @rule_violated, @expected, @actual, @carc_code, @suggestion, NULL)`)
      .run({
        id: 'f' + p.id.slice(1),
        patient_id: p.id,
        field: violation.field,
        rule_violated: violation.rule_violated,
        expected: violation.expected,
        actual: violation.actual,
        carc_code: violation.carc_code,
        suggestion,
      });
    console.log(`Seeded flag for ${p.name}: ${suggestion}`);
  }

  console.log('Seed complete.');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
