export function checkEligibility(patient, payerRules) {
  const violations = [];

  if (payerRules && payerRules.id_format_regex) {
    const re = new RegExp(payerRules.id_format_regex);
    if (!re.test(patient.member_id || '')) {
      violations.push({
        field: 'member_id',
        rule_violated: 'id_format',
        expected: payerRules.readable_format,
        actual: patient.member_id,
        carc_code: 'CO-16',
      });
    }
  }

  if (patient.policy_status !== 'active') {
    violations.push({
      field: 'policy_status',
      rule_violated: 'policy_active',
      expected: 'active',
      actual: patient.policy_status,
      carc_code: 'CO-27',
    });
  }

  return violations;
}
