import { demoRules, formatSource } from '../data/rules';
import type { ClaimDraft, Finding, ScrubResult } from '../domain/types';
import { isValidNpi } from '../lib/npi';

const procedurePattern = /^[A-Z0-9]{5}$/;
const modifierPattern = /^[A-Z0-9]{2}$/;
const icd10Pattern = /^[A-TV-Z][0-9A-Z][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/;
const posPattern = /^\d{2}$/;

function finding(input: Omit<Finding, 'id'>): Finding {
  const seed = [input.severity, input.title, input.field ?? '', input.lineId ?? '', input.source.id].join('|');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return { ...input, id: `f-${hash.toString(16)}` };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function scrubClaim(claim: ClaimDraft, today = new Date()): ScrubResult {
  const findings: Finding[] = [];
  const { header, diagnoses, lines } = claim;

  if (!header.payerName.trim()) findings.push(finding({ severity: 'blocker', title: 'Payer is required', message: 'A payer or clearinghouse routing destination has not been selected.', correction: 'Enter or select the payer before submission.', field: 'payerName', source: formatSource }));
  if (!header.memberId.trim()) findings.push(finding({ severity: 'blocker', title: 'Member ID is required', message: 'The subscriber/member identifier is blank.', correction: 'Enter the member ID exactly as shown by the payer eligibility record.', field: 'memberId', source: formatSource }));
  if (!header.patientFirstName.trim() || !header.patientLastName.trim()) findings.push(finding({ severity: 'blocker', title: 'Patient name is incomplete', message: 'Both patient first and last name are required for this prototype preflight.', correction: 'Complete the patient name fields.', field: 'patientName', source: formatSource }));
  if (!header.dateOfBirth) findings.push(finding({ severity: 'blocker', title: 'Date of birth is required', message: 'Patient date of birth is blank.', correction: 'Enter the patient date of birth.', field: 'dateOfBirth', source: formatSource }));

  if (!header.dateOfService) {
    findings.push(finding({ severity: 'blocker', title: 'Date of service is required', message: 'The claim does not have a date of service.', correction: 'Enter the date on which the service occurred.', field: 'dateOfService', source: formatSource }));
  } else {
    const dos = new Date(`${header.dateOfService}T12:00:00`);
    const compareToday = new Date(today);
    compareToday.setHours(23, 59, 59, 999);
    if (!Number.isNaN(dos.getTime()) && dos > compareToday) findings.push(finding({ severity: 'blocker', title: 'Future date of service', message: `The date of service ${header.dateOfService} is in the future.`, correction: 'Correct the date of service before submission.', field: 'dateOfService', source: formatSource }));
  }

  if (!posPattern.test(header.placeOfService.trim())) findings.push(finding({ severity: 'blocker', title: 'Place of service format', message: 'Place of service must be entered as a two-digit code.', correction: 'Enter a valid two-digit POS code and verify it against the current code set.', field: 'placeOfService', source: formatSource }));
  if (!isValidNpi(header.billingNpi.trim())) findings.push(finding({ severity: 'blocker', title: 'Billing NPI failed validation', message: 'The billing NPI is missing, malformed, or fails the NPI check digit.', correction: 'Verify the 10-digit billing NPI before submission.', field: 'billingNpi', source: formatSource }));

  const activeDiagnoses = diagnoses.filter((diagnosis) => diagnosis.code.trim());
  if (activeDiagnoses.length === 0) findings.push(finding({ severity: 'blocker', title: 'Diagnosis required', message: 'At least one diagnosis is required before a service line can be submitted.', correction: 'Add the diagnosis supported by the clinical documentation.', field: 'diagnoses', source: formatSource }));

  activeDiagnoses.forEach((diagnosis) => {
    const code = normalizeCode(diagnosis.code);
    if (!icd10Pattern.test(code)) findings.push(finding({ severity: 'warning', title: `Diagnosis ${diagnosis.id} needs code-set validation`, message: `${code || 'Blank'} does not match the basic ICD-10-CM formatting expected by this prototype.`, correction: 'Verify the diagnosis against the effective ICD-10-CM code set for the date of service.', field: `diagnosis-${diagnosis.id}`, source: formatSource }));
  });

  if (lines.length === 0) findings.push(finding({ severity: 'blocker', title: 'Service line required', message: 'The claim contains no billable service lines.', correction: 'Add at least one supported service line.', field: 'lines', source: formatSource }));
  const codeSet = new Set(lines.map((line) => normalizeCode(line.procedureCode)).filter(Boolean));

  lines.forEach((line, index) => {
    const code = normalizeCode(line.procedureCode);
    if (!procedurePattern.test(code)) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: procedure code format`, message: 'Procedure/HCPCS code must be five alphanumeric characters in this prototype.', correction: 'Enter the supported procedure code and later validate it against the licensed/effective code set.', lineId: line.id, field: 'procedureCode', source: formatSource }));

    [line.modifier1, line.modifier2].filter(Boolean).forEach((modifier) => {
      if (!modifierPattern.test(normalizeCode(modifier))) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: modifier format`, message: `Modifier ${modifier} is not two alphanumeric characters.`, correction: 'Correct the modifier and confirm that documentation supports its use.', lineId: line.id, field: 'modifier', source: formatSource }));
    });

    if (!Number.isFinite(line.units) || line.units <= 0) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: units must be positive`, message: 'Units of service must be greater than zero.', correction: 'Enter the supported units of service.', lineId: line.id, field: 'units', source: formatSource }));
    if (!Number.isFinite(line.charge) || line.charge <= 0) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: charge is required`, message: 'The service line charge must be greater than zero.', correction: 'Enter the charge from the applicable fee schedule.', lineId: line.id, field: 'charge', source: formatSource }));

    if (line.diagnosisPointers.length === 0) {
      findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: diagnosis pointer missing`, message: 'The service line does not point to any diagnosis on the claim.', correction: 'Assign the diagnosis or diagnoses supported for this service line.', lineId: line.id, field: 'diagnosisPointers', source: formatSource }));
    } else {
      line.diagnosisPointers.forEach((pointer) => {
        if (!activeDiagnoses.some((diagnosis) => diagnosis.id === pointer)) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: invalid diagnosis pointer`, message: `Diagnosis pointer ${pointer} does not reference an active diagnosis.`, correction: 'Correct the pointer or add the referenced diagnosis.', lineId: line.id, field: 'diagnosisPointers', source: formatSource }));
      });
    }

    const unitRule = demoRules.unitLimits.find((rule) => rule.code === code);
    if (unitRule && line.units > unitRule.maxUnits) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: demo unit limit exceeded`, message: `${code} has ${line.units} units; the synthetic demo threshold is ${unitRule.maxUnits}.`, correction: 'Review units. Production behavior will use effective CMS/payer MUE data where legally available.', lineId: line.id, field: 'units', source: unitRule.source }));

    const addOnRule = demoRules.addOnRequirements.find((rule) => rule.addOnCode === code);
    if (addOnRule && !addOnRule.primaryCodes.some((primary) => codeSet.has(primary))) findings.push(finding({ severity: 'blocker', title: `Line ${index + 1}: demo add-on code lacks primary service`, message: `${code} is configured as a synthetic add-on code and requires ${addOnRule.primaryCodes.join(' or ')} in this demo.`, correction: 'Review whether the add-on service and required primary service are supported by the encounter.', lineId: line.id, field: 'procedureCode', source: addOnRule.source }));
  });

  for (let first = 0; first < lines.length; first += 1) {
    for (let second = first + 1; second < lines.length; second += 1) {
      const a = lines[first];
      const b = lines[second];
      const aCode = normalizeCode(a.procedureCode);
      const bCode = normalizeCode(b.procedureCode);
      const sameLineSignature = aCode === bCode && normalizeCode(a.modifier1) === normalizeCode(b.modifier1) && normalizeCode(a.modifier2) === normalizeCode(b.modifier2) && [...a.diagnosisPointers].sort().join(',') === [...b.diagnosisPointers].sort().join(',');
      if (sameLineSignature && aCode) findings.push(finding({ severity: 'warning', title: `Possible duplicate lines ${first + 1} and ${second + 1}`, message: 'The procedure, modifiers, and diagnosis pointers match on both lines.', correction: 'Confirm the services are intentionally separate and the units/modifiers support separate reporting.', lineId: b.id, source: formatSource }));

      const pairRule = demoRules.incompatiblePairs.find((rule) => (rule.columnOne === aCode && rule.columnTwo === bCode) || (rule.columnOne === bCode && rule.columnTwo === aCode));
      if (pairRule) findings.push(finding({ severity: 'blocker', title: 'Demo code-pair edit triggered', message: `${pairRule.columnOne} and ${pairRule.columnTwo} are configured as an incompatible synthetic pair for the prototype.`, correction: pairRule.modifierAllowed ? 'Review documentation. A production NCCI rule may permit an associated modifier only when clinically appropriate; ClaimMatrix will never add one automatically.' : 'Review the services and remove/correct the unsupported combination.', lineId: b.id, source: pairRule.source }));
    }
  }

  if (findings.some((item) => item.source.category === 'demo')) findings.push(finding({ severity: 'info', title: 'Synthetic rule data is active', message: 'TEST1–TEST5 behavior exists only to demonstrate the rule engine. It is not a representation of CMS, AMA, or payer coding policy.', correction: 'Replace demo adapters with versioned authoritative rule imports before production use.', source: formatSource }));

  const blockerCount = findings.filter((item) => item.severity === 'blocker').length;
  const warningCount = findings.filter((item) => item.severity === 'warning').length;
  const infoCount = findings.filter((item) => item.severity === 'info').length;
  const score = Math.max(0, Math.min(100, 100 - blockerCount * 18 - warningCount * 5 - infoCount));

  return { findings, blockerCount, warningCount, infoCount, score, readyForSubmission: blockerCount === 0 };
}
