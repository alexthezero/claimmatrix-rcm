import { describe, expect, it } from 'vitest';
import type { ClaimDraft } from '../domain/types';
import { scrubClaim } from './scrubber';

const cleanDraft: ClaimDraft = {
  header: {
    claimType: 'professional',
    payerName: 'Demo Health Plan',
    memberId: 'MEM123456',
    patientFirstName: 'Sample',
    patientLastName: 'Patient',
    dateOfBirth: '1985-05-10',
    dateOfService: '2026-08-01',
    placeOfService: '11',
    billingNpi: '1234567893',
  },
  diagnoses: [{ id: 1, code: 'Z00.00' }],
  lines: [{
    id: 'line-1', procedureCode: '99213', modifier1: '', modifier2: '', units: 1,
    diagnosisPointers: [1], charge: 125,
  }],
};

describe('scrubClaim', () => {
  it('allows a structurally clean draft through prototype preflight', () => {
    const result = scrubClaim(cleanDraft, new Date('2026-08-27T12:00:00'));
    expect(result.blockerCount).toBe(0);
    expect(result.readyForSubmission).toBe(true);
  });

  it('blocks the synthetic demo pair', () => {
    const result = scrubClaim({
      ...cleanDraft,
      lines: [
        { ...cleanDraft.lines[0], procedureCode: 'TEST1' },
        { ...cleanDraft.lines[0], id: 'line-2', procedureCode: 'TEST2' },
      ],
    }, new Date('2026-08-27T12:00:00'));
    expect(result.findings.some((item) => item.title === 'Demo code-pair edit triggered')).toBe(true);
    expect(result.readyForSubmission).toBe(false);
  });

  it('blocks a future date of service', () => {
    const result = scrubClaim({
      ...cleanDraft,
      header: { ...cleanDraft.header, dateOfService: '2026-09-01' },
    }, new Date('2026-08-27T12:00:00'));
    expect(result.findings.some((item) => item.title === 'Future date of service')).toBe(true);
  });
});
