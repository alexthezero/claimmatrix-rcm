# ClaimMatrix architecture direction

## Product principle

The application should validate continuously instead of waiting for a final “scrub claim” step. Every finding should have:

- severity (`blocker`, `warning`, `info`)
- a human-readable explanation
- an actionable correction path
- source / authority
- rule version
- effective date when applicable
- affected claim field or service line
- override metadata when an authorized user overrides a non-absolute rule

## Target services

### 1. Web client

Keyboard-first billing interface, claim worklists, rule explanations, payer context, denial analytics and operational dashboards.

### 2. Claim API

Canonical claim model independent of any one clearinghouse. The internal claim model is converted to transaction-specific EDI by dedicated adapters.

### 3. Rule engine

Rules execute against a normalized claim and return deterministic findings. A rule must not mutate a claim silently. Suggested corrections are separate from claim changes.

### 4. Rule registry / provenance store

Versioned rule metadata:

- source authority
- data-set version
- effective / termination dates
- payer / line-of-business scope
- jurisdiction
- claim type
- rule category
- original source URL or licensed source reference
- ingestion timestamp and checksum

This is essential because “the rule existed” is not enough; the system must know which rule was effective for the date of service.

### 5. CMS ingestion workers

Planned adapters:

- Medicare NCCI PTP quarterly files
- Medicare published MUE files
- Medicare add-on-code files
- Medicaid NCCI files
- HCPCS effective-date updates
- CMS Medicare Coverage API for NCD/LCD/article data

Importers should stage, validate, checksum and version a dataset before activating it.

### 6. Licensed terminology adapter

CPT content must enter through a licensed AMA-supported source. Licensed material should not be stored in source control.

### 7. Payer policy layer

Commercial and plan-specific policies should be modeled as independently versioned overlays rather than hard-coded conditionals inside application code.

### 8. EDI gateway

Planned transaction lifecycle:

`837P/837I -> clearinghouse -> 999/277CA -> payer -> 835`

Other planned transactions include 270/271 eligibility, 276/277 status and applicable 278 workflows. X12 implementation details must be handled under the appropriate license.

### 9. Denial intelligence

835 remittance data maps back to claim and service-line history. CARC/RARC patterns can produce predictive risk findings, but those findings must be labeled as historical/predictive rather than authoritative coding policy.

## Proposed backend stack

A later milestone can use:

- TypeScript API service
- PostgreSQL
- background workers for rule-data imports
- object storage for controlled source artifacts
- queue/event bus for EDI state transitions
- centralized audit/event log

The specific hosting provider should be selected only after BAA, security, operational and cost requirements are defined.

## Initial domain model

Core entities:

- Organization
- User
- Role
- Patient
- Coverage
- Provider
- Payer
- Claim
- ClaimDiagnosis
- ClaimLine
- ClaimEvent
- RuleDefinition
- RuleVersion
- RuleFinding
- Override
- Submission
- TransactionArtifact
- Remittance
- RemittanceAdjustment

## Submission gates

A production submission gate should distinguish:

- **Absolute blocker** — transaction cannot be emitted safely/validly
- **Policy blocker** — authoritative rule indicates the claim should not be submitted as built
- **Warning** — risk or ambiguity requiring review
- **Info** — contextual guidance

Overrides must require identity, timestamp, reason and the rule version being overridden.
