export type ClaimType = 'professional' | 'institutional';
export type Severity = 'blocker' | 'warning' | 'info';

export interface ClaimHeader {
  claimType: ClaimType;
  payerName: string;
  memberId: string;
  patientFirstName: string;
  patientLastName: string;
  dateOfBirth: string;
  dateOfService: string;
  placeOfService: string;
  billingNpi: string;
}

export interface Diagnosis {
  id: number;
  code: string;
}

export interface ClaimLine {
  id: string;
  procedureCode: string;
  modifier1: string;
  modifier2: string;
  units: number;
  diagnosisPointers: number[];
  charge: number;
}

export interface ClaimDraft {
  header: ClaimHeader;
  diagnoses: Diagnosis[];
  lines: ClaimLine[];
}

export interface RuleSource {
  id: string;
  title: string;
  authority: string;
  category: 'format' | 'cms' | 'payer' | 'practice' | 'demo';
  effectiveDate?: string;
  version?: string;
  url?: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  correction: string;
  field?: string;
  lineId?: string;
  source: RuleSource;
}

export interface ScrubResult {
  findings: Finding[];
  blockerCount: number;
  warningCount: number;
  infoCount: number;
  score: number;
  readyForSubmission: boolean;
}
