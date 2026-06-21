-- =============================================================
-- MediVault -- Database Schema
-- Target: PostgreSQL 14+
-- =============================================================

-- -------------------------------------------------------
-- INDEPENDENT REFERENCE TABLES
-- -------------------------------------------------------

CREATE TABLE subscription_plans (
    id               SERIAL        PRIMARY KEY,
    name             TEXT          NOT NULL CHECK (name IN ('basic', 'medium', 'premium')),
    storage_limit_mb INT           NOT NULL,
    price_annual     NUMERIC(10,2) NOT NULL,
    price_monthly    NUMERIC(10,2) NOT NULL
);

CREATE TABLE institutions (
    id        SERIAL  PRIMARY KEY,
    name      TEXT    NOT NULL,
    type      TEXT    NOT NULL CHECK (type IN ('hospital', 'clinic', 'lab', 'pharmacy', 'other')),
    address   TEXT,
    phone     TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vaccines (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT
);

CREATE TABLE icpc2_codes (
    id          SERIAL PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    chapter     TEXT
);

CREATE TABLE medical_specialties (
    id   SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- -------------------------------------------------------
-- USERS
-- -------------------------------------------------------

CREATE TABLE users (
    id                    SERIAL    PRIMARY KEY,
    utent_number          TEXT      NOT NULL UNIQUE,
    fiscal_number         TEXT      NOT NULL UNIQUE,
    citizen_number        TEXT      NOT NULL UNIQUE,
    email                 TEXT      NOT NULL UNIQUE,
    password_hash         TEXT      NOT NULL,
    first_name            TEXT      NOT NULL,
    last_name             TEXT      NOT NULL,
    birthday              DATE      NOT NULL,
    biological_gender     TEXT      NOT NULL CHECK (biological_gender IN ('M', 'F')),
    sex                   TEXT      NOT NULL CHECK (sex IN ('M', 'F', 'Other')),
    marital_status        TEXT,
    blood_type            TEXT      CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    accepts_transfusion   BOOLEAN   NOT NULL DEFAULT TRUE,
    accepts_resuscitation BOOLEAN   NOT NULL DEFAULT TRUE,
    emergency_access_code BOOLEAN   NOT NULL DEFAULT FALSE,
    is_dependent          BOOLEAN   NOT NULL DEFAULT FALSE,
    profession            TEXT,
    phone                 TEXT,
    is_active             BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- DOCTORS
-- -------------------------------------------------------

CREATE TABLE doctors (
    id               SERIAL    PRIMARY KEY,
    ordem_medicos_id TEXT      NOT NULL UNIQUE,
    first_name       TEXT      NOT NULL,
    last_name        TEXT      NOT NULL,
    email            TEXT      NOT NULL UNIQUE,
    password_hash    TEXT      NOT NULL,
    speciality       TEXT,
    institution_id   INT       NOT NULL,
    is_active        BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_doctors_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- -------------------------------------------------------
-- USER PROFILE
-- -------------------------------------------------------

CREATE TABLE user_addresses (
    id          SERIAL  PRIMARY KEY,
    user_id     INT     NOT NULL,
    street      TEXT,
    city        TEXT,
    postal_code TEXT,
    country     TEXT,
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE emergency_contacts (
    id      SERIAL PRIMARY KEY,
    user_id INT    NOT NULL,
    type    TEXT   NOT NULL CHECK (type IN ('emergency', 'tutor')),
    name    TEXT   NOT NULL,
    phone   TEXT,
    address TEXT,
    CONSTRAINT fk_emergency_contacts_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE female_medical_info (
    id                   SERIAL  PRIMARY KEY,
    user_id              INT     NOT NULL UNIQUE,
    menarche_age         INT,
    pregnancies          INT     NOT NULL DEFAULT 0,
    births               INT     NOT NULL DEFAULT 0,
    abortions            INT     NOT NULL DEFAULT 0,
    menopause            BOOLEAN NOT NULL DEFAULT FALSE,
    menopause_age        INT,
    contraceptive_use    BOOLEAN NOT NULL DEFAULT FALSE,
    intraceptive_method  TEXT,
    contraceptive_reason TEXT,
    CONSTRAINT fk_female_medical_info_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- -------------------------------------------------------
-- SUBSCRIPTIONS & LICENSES
-- -------------------------------------------------------

CREATE TABLE user_subscriptions (
    id         SERIAL  PRIMARY KEY,
    user_id    INT     NOT NULL,
    plan_id    INT     NOT NULL,
    card_type  TEXT    NOT NULL CHECK (card_type IN ('SC1', 'SC2')),
    start_date DATE    NOT NULL,
    end_date   DATE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_user_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE TABLE institution_licenses (
    id             SERIAL  PRIMARY KEY,
    institution_id INT     NOT NULL,
    billing_type   TEXT    NOT NULL CHECK (billing_type IN ('annual', 'monthly')),
    start_date     DATE    NOT NULL,
    end_date       DATE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_institution_licenses_institution FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- -------------------------------------------------------
-- ACCESS CONTROL
-- -------------------------------------------------------

CREATE TABLE access_requests (
    id           SERIAL    PRIMARY KEY,
    user_id      INT       NOT NULL,
    doctor_id    INT       NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at  TIMESTAMP,
    expires_at   TIMESTAMP,
    status       TEXT      NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
    is_emergency BOOLEAN   NOT NULL DEFAULT FALSE,
    access_code  TEXT,
    CONSTRAINT fk_access_requests_user   FOREIGN KEY (user_id)   REFERENCES users(id),
    CONSTRAINT fk_access_requests_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- -------------------------------------------------------
-- FILES
-- -------------------------------------------------------

CREATE TABLE medical_files (
    id          SERIAL    PRIMARY KEY,
    user_id     INT       NOT NULL,
    file_name   TEXT      NOT NULL,
    file_type   TEXT,
    file_path   TEXT      NOT NULL,
    uploaded_by INT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_medical_files_user   FOREIGN KEY (user_id)     REFERENCES users(id),
    CONSTRAINT fk_medical_files_doctor FOREIGN KEY (uploaded_by) REFERENCES doctors(id)
);

-- -------------------------------------------------------
-- MEDICAL HISTORY
-- -------------------------------------------------------

CREATE TABLE surgical_history (
    id             SERIAL    PRIMARY KEY,
    user_id        INT       NOT NULL,
    surgery_name   TEXT      NOT NULL,
    surgery_date   DATE,
    location       TEXT,
    notes          TEXT,
    report_file_id INT,
    added_by       INT,
    is_active      BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_surgical_history_user   FOREIGN KEY (user_id)        REFERENCES users(id),
    CONSTRAINT fk_surgical_history_file   FOREIGN KEY (report_file_id) REFERENCES medical_files(id),
    CONSTRAINT fk_surgical_history_doctor FOREIGN KEY (added_by)       REFERENCES doctors(id)
);

CREATE TABLE chronic_medications (
    id               SERIAL    PRIMARY KEY,
    user_id          INT       NOT NULL,
    active_substance TEXT      NOT NULL,
    dose             TEXT,
    posology         TEXT,
    start_date       DATE,
    end_date         DATE,
    prescribed_by    INT,
    is_active        BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_chronic_medications_user   FOREIGN KEY (user_id)       REFERENCES users(id),
    CONSTRAINT fk_chronic_medications_doctor FOREIGN KEY (prescribed_by) REFERENCES doctors(id)
);

CREATE TABLE drug_allergies (
    id                SERIAL    PRIMARY KEY,
    user_id           INT       NOT NULL,
    active_substance  TEXT      NOT NULL,
    allergic_reaction TEXT,
    severity          TEXT      CHECK (severity IN ('mild', 'moderate', 'severe')),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drug_allergies_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE family_history (
    id             SERIAL  PRIMARY KEY,
    user_id        INT     NOT NULL,
    condition      TEXT    NOT NULL CHECK (condition IN ('cardiovascular', 'cancer', 'autoimmune', 'genetic', 'ophthalmic', 'psychological', 'consanguinity', 'other')),
    has_condition  BOOLEAN NOT NULL DEFAULT FALSE,
    kinship_degree TEXT,
    notes          TEXT,
    CONSTRAINT fk_family_history_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE user_pathologies (
    id           SERIAL PRIMARY KEY,
    user_id      INT    NOT NULL,
    icpc2_id     INT    NOT NULL,
    type         TEXT   NOT NULL CHECK (type IN ('active', 'passive')),
    diagnosed_at DATE,
    notes        TEXT,
    added_by     INT,
    CONSTRAINT fk_user_pathologies_user   FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_user_pathologies_icpc2  FOREIGN KEY (icpc2_id) REFERENCES icpc2_codes(id),
    CONSTRAINT fk_user_pathologies_doctor FOREIGN KEY (added_by) REFERENCES doctors(id)
);

CREATE TABLE user_specialty_followups (
    id           SERIAL PRIMARY KEY,
    user_id      INT    NOT NULL,
    specialty_id INT    NOT NULL,
    institution  TEXT,
    start_date   DATE,
    notes        TEXT,
    CONSTRAINT fk_user_specialty_followups_user      FOREIGN KEY (user_id)      REFERENCES users(id),
    CONSTRAINT fk_user_specialty_followups_specialty FOREIGN KEY (specialty_id) REFERENCES medical_specialties(id)
);

-- -------------------------------------------------------
-- EXAMS (MCDTS)
-- -------------------------------------------------------

CREATE TABLE analytical_exams (
    id         SERIAL    PRIMARY KEY,
    user_id    INT       NOT NULL,
    exam_date  DATE      NOT NULL,
    laboratory TEXT,
    file_id    INT,
    notes      TEXT,
    added_by   INT,
    is_active  BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_analytical_exams_user   FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_analytical_exams_file   FOREIGN KEY (file_id)  REFERENCES medical_files(id),
    CONSTRAINT fk_analytical_exams_doctor FOREIGN KEY (added_by) REFERENCES doctors(id)
);

CREATE TABLE analytical_exam_parameters (
    id             SERIAL         PRIMARY KEY,
    exam_id        INT            NOT NULL,
    parameter_name TEXT           NOT NULL,
    value          NUMERIC(18,6),
    unit           TEXT,
    reference_min  NUMERIC(18,6),
    reference_max  NUMERIC(18,6),
    is_abnormal    BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_analytical_exam_parameters_exam FOREIGN KEY (exam_id) REFERENCES analytical_exams(id)
);

CREATE TABLE imaging_exams (
    id          SERIAL    PRIMARY KEY,
    user_id     INT       NOT NULL,
    exam_type   TEXT      NOT NULL,
    body_area   TEXT,
    exam_date   DATE      NOT NULL,
    institution TEXT,
    file_id     INT,
    report_text TEXT,
    added_by    INT,
    is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_imaging_exams_user   FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_imaging_exams_file   FOREIGN KEY (file_id)  REFERENCES medical_files(id),
    CONSTRAINT fk_imaging_exams_doctor FOREIGN KEY (added_by) REFERENCES doctors(id)
);

CREATE TABLE optometry_exams (
    id             SERIAL         PRIMARY KEY,
    user_id        INT            NOT NULL,
    exam_date      DATE           NOT NULL,
    right_sphere   NUMERIC(5,2),
    right_cylinder NUMERIC(5,2),
    right_axis     INT,
    left_sphere    NUMERIC(5,2),
    left_cylinder  NUMERIC(5,2),
    left_axis      INT,
    disease_report TEXT,
    added_by       INT,
    is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP      NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_optometry_exams_user   FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_optometry_exams_doctor FOREIGN KEY (added_by) REFERENCES doctors(id)
);

-- -------------------------------------------------------
-- VACCINATIONS
-- -------------------------------------------------------

CREATE TABLE user_vaccinations (
    id              SERIAL PRIMARY KEY,
    user_id         INT    NOT NULL,
    vaccine_id      INT    NOT NULL,
    dose_number     TEXT,
    administered_at DATE,
    next_due_date   DATE,
    batch_number    TEXT,
    institution     TEXT,
    notes           TEXT,
    added_by        INT,
    CONSTRAINT fk_user_vaccinations_user    FOREIGN KEY (user_id)    REFERENCES users(id),
    CONSTRAINT fk_user_vaccinations_vaccine FOREIGN KEY (vaccine_id) REFERENCES vaccines(id),
    CONSTRAINT fk_user_vaccinations_doctor  FOREIGN KEY (added_by)   REFERENCES doctors(id)
);

-- -------------------------------------------------------
-- HEALTH HABITS (consolidated)
-- details (JSONB): type-specific fields
--   alcohol  -> { consumes, alcohol_type, in_detox, audit_c_score, audit_score }
--   tobacco  -> { consumes, cigarettes_per_day, years_consumption, pack_years, fagerstrom_score, richmond_score }
--   drugs    -> { drug_name, quantity }
--   gambling -> { game_name }
--   physical_activity -> { activity }
-- -------------------------------------------------------

CREATE TABLE health_habits (
    id         SERIAL    PRIMARY KEY,
    user_id    INT       NOT NULL,
    type       TEXT      NOT NULL CHECK (type IN ('alcohol', 'tobacco', 'drugs', 'gambling', 'physical_activity')),
    name       TEXT,
    consumes   BOOLEAN,
    frequency  TEXT,
    quantity   TEXT,
    start_date DATE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    details    JSONB,
    CONSTRAINT fk_health_habits_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- -------------------------------------------------------
-- DOCTOR NOTES & FLAGS
-- note_text stored encrypted (application-layer encryption)
-- -------------------------------------------------------

CREATE TABLE doctor_notes (
    id         SERIAL    PRIMARY KEY,
    user_id    INT       NOT NULL,
    doctor_id  INT       NOT NULL,
    section    TEXT      NOT NULL CHECK (section IN ('identification', 'medical_info', 'mcdts', 'habits', 'history', 'other')),
    note_text  BYTEA,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_doctor_notes_user   FOREIGN KEY (user_id)   REFERENCES users(id),
    CONSTRAINT fk_doctor_notes_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE pending_review_flags (
    id          SERIAL    PRIMARY KEY,
    user_id     INT       NOT NULL,
    section     TEXT      NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by INT,
    CONSTRAINT fk_pending_review_flags_user   FOREIGN KEY (user_id)     REFERENCES users(id),
    CONSTRAINT fk_pending_review_flags_doctor FOREIGN KEY (reviewed_by) REFERENCES doctors(id)
);

-- -------------------------------------------------------
-- VERSIONING
-- -------------------------------------------------------

CREATE TABLE schema_versions (
    id          SERIAL    PRIMARY KEY,
    version     TEXT      NOT NULL,
    description TEXT,
    script      TEXT,
    applied_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    applied_by  TEXT,
    checksum    TEXT,
    success     BOOLEAN   NOT NULL DEFAULT TRUE
);

CREATE TABLE app_versions (
    id           SERIAL    PRIMARY KEY,
    version      TEXT      NOT NULL,
    release_date DATE,
    description  TEXT,
    deployed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deployed_by  TEXT,
    environment  TEXT      NOT NULL CHECK (environment IN ('dev', 'staging', 'prod')),
    is_current   BOOLEAN   NOT NULL DEFAULT FALSE
);
