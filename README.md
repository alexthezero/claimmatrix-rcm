# ClaimMatrix RCM

**ClaimMatrix RCM** is an early-stage medical claims billing and pre-submission validation platform focused on preventing avoidable denials while a claim is being built.

The product direction is intentionally different from a traditional “finish the claim, run a scrubber, then chase errors” workflow. ClaimMatrix runs a continuous preflight and surfaces blocking edits, warnings, plain-English fixes, and rule provenance directly alongside the coding matrix.

## Current prototype (v0.1)

The repository currently contains a browser-based React/TypeScript prototype with:

- Quick Bill service-line matrix
- Patient, payer, claim-type, DOS, POS and billing-NPI fields
- ICD-10-CM formatting checks
- Diagnosis-pointer validation
- NPI check-digit validation
- Missing-field and future-date blocking edits
- Procedure/modifier/units/charge structural validation
- Possible duplicate-line warnings
- Synthetic NCCI-style pair, MUE-style unit and add-on-code demo rules
- Clear blocker / warning / informational severity levels
- Human-readable correction guidance and rule provenance
- Submission lock when hard blockers exist
- No persistence and no EDI transmission

> **Important:** The `TEST1`–`TEST5` examples are synthetic demonstration rules. They are not real CPT/HCPCS policy, CMS edits, or payer guidance.

## Run locally

```bash
npm install
npm run dev
```

Production build and tests:

```bash
npm run test
npm run build
```

## What this is not yet

This repository is **not production billing software** and must not be used to make live coding, coverage, payment, or submission decisions. The prototype does not include a licensed CPT dataset, authoritative X12 implementation-guide content, clearinghouse connectivity, payer credentials, persistent storage, authentication, or a HIPAA production environment.

Do not enter real PHI into the prototype.

## Product architecture direction

The intended production rule stack is layered:

1. Structural / transaction readiness
2. Effective-date-aware code-set validity
3. CMS NCCI PTP
4. Published MUE rules
5. Add-on-code rules
6. Place-of-service / demographic / provider rules
7. Medicare NCD/LCD/article coverage checks
8. Medicaid and commercial payer overlays
9. Practice-specific rules
10. Historical denial-risk intelligence from 835/CARC/RARC feedback

Authoritative policy and predictive risk must remain visibly distinct. ClaimMatrix should never silently add a modifier or change a code solely to get a claim through edits.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Licensing constraints

CPT is copyrighted by the American Medical Association. A licensed integration must be used for CPT content in a production product. X12 implementation content is also licensed. This repository deliberately does not redistribute either dataset.

## Security status

The prototype is designed for synthetic data only and intentionally does not persist browser data. See [`SECURITY.md`](SECURITY.md) before any development involving PHI.

## License

No open-source license has been granted at this stage. All rights are reserved unless and until a project license is added.
