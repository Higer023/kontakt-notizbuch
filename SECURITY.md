# Security Policy

## Supported version

Security fixes are intended for the current `main` branch. Archived snapshots under `stable/` are historical copies and should not be assumed to receive security updates.

## Reporting a vulnerability

Please do not publish exploitable details, personal data, credentials, or reproduction steps for a live vulnerability in a public issue. Use GitHub's private vulnerability reporting / Security Advisories feature for this repository when available. Include the affected path or endpoint, impact, prerequisites, and a minimal reproduction that uses synthetic data only.

Do not include real contact records, production tokens, passwords, recovery codes, or encryption keys in a report. Rotate any credential that may have been exposed.

## Scope notes

This project stores personal contact information. A passing CI run is not a security certification. Authentication, WebAuthn, encryption, recovery, migration, authorization isolation, and backup restoration should be reviewed and tested before production use.
