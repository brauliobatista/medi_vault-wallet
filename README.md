# MediVault: Health Wallet

> A secure digital health identity that allows patients to carry their complete medical history, while giving doctors instant access to accurate, up-to-date clinical information.

---

## Table of Contents

- [Concept](#concept)
- [How It Works](#how-it-works)
  - [User Perspective](#user-perspective)
  - [Doctor Perspective](#doctor-perspective)
- [Access Methods](#access-methods)
- [Business Model](#business-model)
  - [Hardware Devices](#1-hardware-devices)
  - [Software Components](#2-software-components)
- [Database](#database)
- [Documentation](#documentation)

---

## Concept

**MediVault: Health Wallet** is a Software-as-a-Service platform that creates a unified and secure environment for all medical records of a user/patient.

The platform bridges the gap between bank-grade security and human accessibility — enabling patients to own their health data and share it with healthcare providers instantly and securely, both online and offline.

---

## How It Works

### User Perspective

The user has access to a platform with a **Security Wallet Card (SWC)** where all medical records, exams and health information can be accessed and consulted.

Users can introduce and manage:

- Personal identification data
- Health habits and dependencies
- Family medical history (direct family)
- Medical imaging exams and respective reports
- Analytical exam results
- Chronic medications and allergies
- Vaccination records

All information is saved in **historical mode**, allowing bioimpedance, aging and health performance analysis over time.

The platform is accessible via:
- **Mobile app** (iOS / Android) — for use anywhere
- **Security Wallet Card** — for offline access without internet connection (storage limited to card capacity)

> The user has **full control** over who accesses and edits their information. A doctor must request access, and the user must approve it — except in emergency situations.

---

### Doctor Perspective

Doctors access an organised platform with all medical records from the patient they need to assist, including:

- Timestamped diagnostic history (imaging, reports, analytics)
- Graphical representation of key health metrics
- Flags indicating new data introduced by the user that requires validation
- Confidential notes section (not visible to the user)

Information is validated by medical specialists, reducing the risk of misinformation.

> Every time a user introduces new medical records, the relevant section is flagged with an icon. Once the doctor reviews the data, the flag disappears.

---

## Access Methods

Doctors can access a patient's MediVault through three methods:

| Method | Description |
|---|---|
| **QR Code** | Doctor scans the user's QR code with the reader device |
| **Security Card** | User passes the card through the wallet card reader |
| **Access Code** | Doctor receives an SMS code from the user and enters it directly on the platform |

> All access methods require user authorisation — except when using the SC2 card in emergency mode or when the user has pre-authorised emergency access.

---

## Business Model

The business model is composed of three segments:

1. **Hardware Devices** — Security cards and card readers
2. **Software Acquisition** — Institutional licenses for the doctor web interface
3. **Wallet Subscription** — User subscription plans tied to card storage capacity

---

### 1. Hardware Devices

#### (a) Security Wallet Card (SWC)

A smart SIM card, similar to a bank card, integrating an IC for bootload and a storage IC. Available in three storage tiers:

| Plan | Storage | Contents |
|---|---|---|
| **Basic** | XXX MB | Basic user profile, blood type, allergies, vaccinations |
| **Medium** | XXXX MB | + Health habits, chronic medications, family history |
| **Premium** | XXXX MB | + Latest MCDTs (imaging, analytics, reports) |

**Card types:**

| Type | Description |
|---|---|
| **SC1** | User controls access — requires explicit authorisation for each doctor access |
| **SC2** | Admin mode — all information is displayed immediately when card is read (for users who pre-authorise emergency access) |

Plans renew every 12 months. Users receive an alert by email and SMS 1 month before expiry. Upgrades are allowed (paying the difference); downgrades are not permitted.

#### (b) Wallet Card Reader

A device sold once per medical institution, capable of reading the Security Wallet Card. Available in two modes:

| Mode | Description |
|---|---|
| **Normal reader** | Requires user authorisation to access data |
| **Emergency reader** | Admin rights — accesses all data without user authorisation |

Volume pricing available for institutions requiring multiple units.

---

### 2. Software Components

| Component | Users | Access |
|---|---|---|
| **Web Interface — Doctor** | Healthcare professionals | Read, write, validate; authenticated via Ordem dos Médicos credentials + password |
| **Web Interface — User** | Patients | Read, write; authenticated via utent number + password; confidential doctor notes are hidden |
| **iOS / Android App** | Patients | Full access to health data anywhere *(future release)* |

**Licensing:**

- The user web interface and mobile app are **included** in the wallet subscription — no extra cost.
- The **doctor web interface** requires an **institutional license**, charged per institution:

| Billing | Cost |
|---|---|
| Annual | XX € *(lower cost)* |
| Monthly | XX € *(higher cost)* |

Individual and package license pools are available.

---

## Database

The full database schema (30 tables) is documented here:

> **[Esquema de Base de Dados — MediVault](https://monicacccerquido.atlassian.net/wiki/spaces/~71202052b1aa8dba4c4a99b5f01900bb31f1ed/pages/22740994/Esquema+de+Base+de+Dados+-+MediVault)**

SQL scripts for all supported database engines are available in the [`database/`](database/) folder:

| File | Engine |
|---|---|
| [`schema_sqlserver.sql`](database/schema_sqlserver.sql) | SQL Server 2016+ |
| [`schema_sqlite.sql`](database/schema_sqlite.sql) | SQLite 3.x |
| [`schema_mysql.sql`](database/schema_mysql.sql) | MySQL 8+ / MariaDB 10.5+ |
| [`schema_postgres.sql`](database/schema_postgres.sql) | PostgreSQL 14+ |
| [`seed.sql`](database/seed.sql) | Test data (Portuguese) |
| [`erd.md`](database/erd.md) | Entity Relationship Diagram |

---

## Documentation

| Resource | Link |
|---|---|
| Product Overview | [MEDI_VAULT: health wallet](https://monicacccerquido.atlassian.net/wiki/spaces/~71202052b1aa8dba4c4a99b5f01900bb31f1ed/pages/2785299/MEDI_VAULT+health+wallet) |
| Database Schema | [Esquema de Base de Dados](https://monicacccerquido.atlassian.net/wiki/spaces/~71202052b1aa8dba4c4a99b5f01900bb31f1ed/pages/22740994/Esquema+de+Base+de+Dados+-+MediVault) |
