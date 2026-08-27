# ClaimMatrix research notes — August 2026

This file records the product assumptions used to shape the initial architecture. It is not coding advice and should be revalidated as standards and payer policies change.

## CMS NCCI is quarterly and effective-date sensitive

CMS publishes Medicare NCCI Procedure-to-Procedure (PTP) edit files quarterly. For Q3 2026, CMS lists practitioner and hospital PTP files effective July 1, 2026. A production rule engine therefore needs historical versions keyed to the date of service rather than a single “current rules” table.

Source: https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits

## MUEs cannot produce a truthful zero-denial promise

CMS defines MUEs as maximum units of service used to reduce improper payments, but CMS also states that some MUE values are confidential and not releasable. ClaimMatrix should optimize preventable-denial interception rather than claim it can know every payer edit in advance.

Source: https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits-mues

## Add-on-code edits need a dedicated rule family

CMS maintains add-on-code edit files and changed the published AOC file format in 2026. Importers must be version-aware and resilient to upstream format revisions.

Source: https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-add-code-edits

## Medicare coverage data has an API

CMS provides a Medicare Coverage API with National and Local Coverage data from the Medicare Coverage Database. This creates a cleaner path to NCD/LCD/article context than scraping web pages. Some endpoints require acceptance of applicable license agreements and a short-lived license token.

Sources:
- https://api.coverage.cms.gov/
- https://api.coverage.cms.gov/docs/

## HIPAA transaction standards

CMS currently describes ASC X12 Version 5010 as the adopted standard for HIPAA healthcare transactions such as 837 claims, 270/271 eligibility, 276/277 claim status, 278 prior authorization/referrals and 835 payment/remittance transactions.

Source: https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/hipaa/adopted-standards-operating-rules

## CPT licensing

The AMA offers a CPT Developer Program for eligible organizations to access CPT content for development under a development license. A production product must follow the applicable CPT licensing terms. Source code should not redistribute licensed CPT datasets.

Source: https://www.ama-assn.org/practice-management/cpt/cpt-developer-program

## Competitive workflow observation

Mainstream claim scrubbers emphasize pre-bill / pre-submission review with general and payer-specific edits. ClaimMatrix should differentiate through continuous in-context editing, clearer rule provenance, keyboard speed, effective-date transparency and a closed feedback loop from actual remittance outcomes.

Example competitor source: https://www.experian.com/healthcare/products/claims-management/claim-scrubber

## Product design conclusions

1. Never represent a formatting check as proof that a code is clinically or payer-valid.
2. Keep authoritative policy separate from predictive denial risk.
3. Never silently add modifier 25/59/X{EPSU} or change diagnosis/procedure coding to bypass an edit.
4. Every authoritative finding needs provenance and effective-date context.
5. Payer-specific policy belongs in a versioned policy layer, not hard-coded UI logic.
6. Make the fastest path the safest path: validation should happen inside the billing matrix rather than as a separate cleanup workflow.
