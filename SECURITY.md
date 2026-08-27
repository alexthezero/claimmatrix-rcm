# Security policy

## Prototype data restriction

ClaimMatrix RCM v0.1 is a development prototype. **Do not enter real protected health information (PHI), payer credentials, clearinghouse credentials, production NPIs tied to a real workflow, or other sensitive production data.**

The current frontend keeps draft state in React memory and intentionally does not use `localStorage`, IndexedDB, cookies, analytics, or an API backend.

## Before PHI is allowed

A production deployment must have a documented security and compliance architecture, including at minimum:

- authenticated users and session controls
- least-privilege role-based access control
- organization / tenant isolation
- encryption in transit and at rest
- immutable or tamper-evident audit logging
- secrets management
- secure backups and recovery procedures
- vulnerability management and dependency scanning
- rate limiting and abuse controls
- documented retention and deletion behavior
- appropriate business associate agreements for infrastructure and vendors where required
- secure EDI / clearinghouse integration
- incident-response procedures

HIPAA compliance is not created by using any one hosting provider or technical control. Production readiness requires legal, administrative, physical and technical safeguards appropriate to the actual deployment and business relationships.

## Repository visibility

Source code can be developed in GitHub, but repository visibility is not a substitute for application security. Do not commit secrets, credentials, PHI, licensed CPT datasets, or licensed X12 implementation-guide content to the repository.
