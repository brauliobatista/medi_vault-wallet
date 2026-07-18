# Skill: MediVault Business Context

## Trigger
Load this skill at the start of every session on this project, or whenever you need context about what MediVault is, who the users are, how the product works, or what the business model is.

---

## What is MediVault?

**MediVault: Health Wallet** is a SaaS platform that creates a unified, secure digital health identity for patients. It lets patients carry their complete medical history and gives doctors instant access to accurate, up-to-date clinical information — both online and offline.

**Tagline:** "Bridge the gap between bank-grade security and human accessibility."

**Confluence source:** https://monicacccerquido.atlassian.net/wiki/spaces/~71202052b1aa8dba4c4a99b5f01900bb31f1ed/pages/2785299/MEDI_VAULT+health+wallet

---

## Two types of users

### Patients (Utilizadores)
- Access the platform via web or mobile app (iOS/Android)
- Introduce and manage their own health data:
  - Personal identification
  - Health habits and dependencies (alcohol, tobacco, drugs, gambling, physical activity)
  - Family medical history (direct family)
  - Medical imaging exams + reports
  - Analytical exam results
  - Chronic medications, allergies, vaccinations
- All data is saved in **historical mode** (never deleted, just archived)
- **The patient has full control** over who accesses their data — a doctor must request access and the patient must approve, except in pre-authorised emergency situations

### Doctors (Médicos)
- Access via the **Doctor Web Interface**
- Authenticated via Ordem dos Médicos credentials + password
- Can view, edit and validate all patient records
- See **flags/icons** when a patient has introduced new data that hasn't been reviewed yet — flags disappear after review
- Have access to a **confidential notes section** not visible to the patient
- Can access patient data via QR code, Security Card reader, or SMS access code

---

## Access methods (doctor → patient data)

| Method | How |
|---|---|
| QR Code | Patient shows QR code; doctor scans with reader device |
| Security Card | Patient passes card through wallet card reader |
| SMS Code | Doctor requests code; patient receives SMS and shares it |

> All methods require patient authorisation **except** emergency mode (SC2 card or pre-authorised emergency access).

---

## Hardware

### Security Wallet Card (SWC)
A smart SIM card (similar to a bank card) with two ICs: one for bootload, one for storage. Three storage tiers:

| Plan | Storage |
|---|---|
| Basic | XXX MB — basic profile, blood type, allergies, vaccinations |
| Medium | XXXX MB | + health habits, chronic medications, family history |
| Premium | XXXX MB | + latest MCDTs (imaging, analytics, reports) |

Two card types:
- **SC1** — user controls access; doctor needs explicit authorisation each time
- **SC2** — admin mode; all data displayed immediately on card read (for users who pre-authorise emergency access); more expensive

Plans renew annually. Upgrades allowed (pay the difference); downgrades not permitted. Alerts sent by email and SMS 1 month before expiry.

### Wallet Card Reader
Sold once per medical institution. Two modes:
- **Normal** — requires patient authorisation
- **Emergency** — admin rights, no authorisation needed

Volume pricing for institutions with multiple units.

---

## Software components

| Component | Who | Features |
|---|---|---|
| Doctor Web Interface | Healthcare professionals | Read, write, validate records; connected to card reader |
| User Web Interface | Patients | Read, write own data; confidential doctor notes hidden |
| iOS/Android App | Patients | Full access to health data anywhere *(future release)* |

Doctor web interface is accessed via an executable (Windows/iOS) that opens a web page. Doctors authenticate once; then access patients via code or card reader.

---

## Business model

Three revenue segments:

1. **Hardware** — Security cards (SC1/SC2) and card readers (normal/emergency)
2. **Software licenses** — Sold to health institutions for the doctor web interface
   - Annual: XX € (lower cost)
   - Monthly: XX € (higher cost)
   - Individual or package license pools
3. **Wallet subscriptions** — Sold to patients; determines card storage tier (Basic/Medium/Premium)
   - User web interface and mobile app are **included** in the subscription — no extra cost
   - Annual renewal

---

## Development strategy (from team comments)

- **Demo 1** — Responsive web application
- **Demo 2** — TBD
- **Release** — TBD
- Two-factor authentication: doctor sends SMS code to patient to access the platform
- Confidential menu for doctor notes and comments (not visible to patient)

---

## Key design principles

- Patient owns their data — explicit consent required for each doctor access
- Emergency exception — hospitals can access all data without consent if patient is incapacitated. Consent is `users.emergency_access_code`, defaulted to `true` at signup (opt-out, not opt-in) — the patient implicitly accepts emergency access when subscribing and can disable it afterwards. Enforced at the DB level: `access_requests.is_emergency = true` is only accepted if `users.emergency_access_code = true` (KAN-23, see [`database-sync.md`](database-sync.md#trigger-pattern-for-cross-table-business-rules))
- Offline-first — Security Card works without internet; storage limited to card capacity
- Historical mode — data is never permanently deleted, only archived (`is_active` flag)
- Doctor notes are encrypted at rest (`note_text` stored as binary, encrypted at application layer)
- Files (PDFs, DICOM) stored in Object Storage (e.g. S3/Azure Blob) — only file path stored in DB

---

## Related documentation

| Resource | Link |
|---|---|
| Database Schema | https://monicacccerquido.atlassian.net/wiki/spaces/~71202052b1aa8dba4c4a99b5f01900bb31f1ed/pages/22740994/Esquema+de+Base+de+Dados+-+MediVault |
| Database skill | `skills/database-sync.md` |
| Confluence field tables skill | `skills/confluence-field-tables.md` |
