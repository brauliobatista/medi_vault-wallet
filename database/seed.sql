-- =============================================================
-- MediVault -- Dados de Teste (Português)
-- Compatível com SQL Server, SQLite, MySQL, PostgreSQL
-- Nota: booleanos usam 1/0 (SQL Server/SQLite) — em PostgreSQL
--       substituir por TRUE/FALSE; em MySQL ambos funcionam.
-- Nota: users.id, doctors.id e institutions.id são GUIDs fixos
--       (literais), para manter as relações determinísticas entre
--       dialetos. Gerados normalmente pela aplicação (Guid.NewGuid()).
-- =============================================================

-- -------------------------------------------------------
-- SUBSCRIPTION_PLANS
-- -------------------------------------------------------
INSERT INTO subscription_plans (name, storage_limit_mb, price_annual, price_monthly) VALUES
('basic',   512,  49.99,  4.99),
('medium',  2048, 99.99,  9.99),
('premium', 5120, 199.99, 19.99);

-- -------------------------------------------------------
-- INSTITUTIONS
-- id: GUID fixo (10000000-0000-0000-0000-00000000000X)
-- -------------------------------------------------------
INSERT INTO institutions (id, name, type, address, phone, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'Hospital de Santa Maria',        'hospital', 'Av. Professor Egas Moniz, Lisboa',      '217 805 000', 1),
('10000000-0000-0000-0000-000000000002', 'Clínica CUF Descobertas',        'clinic',   'R. Mário Botas, Lisboa',                '210 025 200', 1),
('10000000-0000-0000-0000-000000000003', 'Laboratório Germano de Sousa',   'lab',      'Av. Liberdade 110, Lisboa',             '213 185 100', 1),
('10000000-0000-0000-0000-000000000004', 'Centro Hospitalar do Porto',     'hospital', 'Largo Prof. Abel Salazar, Porto',       '222 077 500', 1);

-- -------------------------------------------------------
-- VACCINES (Programa Nacional de Vacinação - PNV)
-- -------------------------------------------------------
INSERT INTO vaccines (name, description) VALUES
('BCG',   'Vacina contra a tuberculose'),
('VHB',   'Vacina contra a hepatite B'),
('DTPa',  'Vacina contra difteria, tétano e tosse convulsa'),
('VIP',   'Vacina inativada contra a poliomielite'),
('Hib',   'Vacina contra Haemophilus influenzae tipo b'),
('MenC',  'Vacina contra meningite C'),
('VASPR', 'Vacina contra sarampo, parotidite e rubéola'),
('VVZ',   'Vacina contra a varicela'),
('VHA',   'Vacina contra a hepatite A'),
('Flu',   'Vacina contra a gripe (dose anual)');

-- -------------------------------------------------------
-- ICPC2_CODES (amostra de códigos relevantes)
-- -------------------------------------------------------
INSERT INTO icpc2_codes (code, description, chapter) VALUES
('K86', 'Hipertensão sem complicações',       'K - Circulatório'),
('K87', 'Hipertensão com complicações',        'K - Circulatório'),
('T90', 'Diabetes mellitus tipo 1',            'T - Endócrino/Metabólico/Nutricional'),
('T89', 'Diabetes mellitus tipo 2',            'T - Endócrino/Metabólico/Nutricional'),
('R05', 'Tosse',                               'R - Respiratório'),
('R74', 'Infecção respiratória alta',          'R - Respiratório'),
('A97', 'Sem doença',                          'A - Geral/Inespecífico'),
('L87', 'Espondilartrose',                     'L - Músculo-esquelético'),
('P76', 'Depressão',                           'P - Psicológico'),
('D73', 'Gastroenterite',                      'D - Digestivo');

-- -------------------------------------------------------
-- MEDICAL_SPECIALTIES
-- -------------------------------------------------------
INSERT INTO medical_specialties (name) VALUES
('Cardiologia'),
('Oncologia'),
('Neurologia'),
('Ortopedia'),
('Oftalmologia'),
('Gastrenterologia'),
('Endocrinologia'),
('Pneumologia'),
('Psiquiatria'),
('Medicina Interna');

-- -------------------------------------------------------
-- USERS (utentes portugueses)
-- id: GUID fixo (30000000-0000-0000-0000-00000000000X)
-- -------------------------------------------------------
INSERT INTO users (id, utent_number, fiscal_number, citizen_number, email, password_hash, first_name, last_name, birthday, biological_gender, sex, marital_status, blood_type, accepts_transfusion, accepts_resuscitation, emergency_access_code, is_dependent, profession, phone, is_active) VALUES
('30000000-0000-0000-0000-000000000001', '123456789', '123456789', '12345678', 'joao.silva@email.pt',      '$2b$12$hash1', 'João',   'Silva',     '1985-03-12', 'M', 'M', 'Casado',    'A+',  1, 1, 0, 0, 'Engenheiro', '912 345 678', 1),
('30000000-0000-0000-0000-000000000002', '234567890', '234567890', '23456789', 'ana.santos@email.pt',      '$2b$12$hash2', 'Ana',    'Santos',    '1990-07-24', 'F', 'F', 'Solteira',  'O+',  1, 1, 0, 0, 'Médica',     '913 456 789', 1),
('30000000-0000-0000-0000-000000000003', '345678901', '345678901', '34567890', 'miguel.ferreira@email.pt', '$2b$12$hash3', 'Miguel', 'Ferreira',  '1978-11-05', 'M', 'M', 'Divorciado','B-',  0, 1, 0, 0, 'Professor',  '914 567 890', 1),
('30000000-0000-0000-0000-000000000004', '456789012', '456789012', '45678901', 'maria.pereira@email.pt',   '$2b$12$hash4', 'Maria',  'Pereira',   '1965-02-18', 'F', 'F', 'Viúva',     'AB+', 1, 0, 1, 0, 'Reformada',  '915 678 901', 1),
('30000000-0000-0000-0000-000000000005', '567890123', '567890123', '56789012', 'pedro.costa@email.pt',     '$2b$12$hash5', 'Pedro',  'Costa',     '2005-09-30', 'M', 'M', 'Solteiro',  'O-',  1, 1, 0, 1, 'Estudante',  '916 789 012', 1);

-- -------------------------------------------------------
-- DOCTORS
-- id: GUID fixo (20000000-0000-0000-0000-00000000000X)
-- institution_id referencia INSTITUTIONS.id
-- -------------------------------------------------------
INSERT INTO doctors (id, ordem_medicos_id, first_name, last_name, email, password_hash, speciality, institution_id, is_active) VALUES
('20000000-0000-0000-0000-000000000001', 'OM-12345', 'Carlos',  'Rodrigues', 'carlos.rodrigues@hsm.pt', '$2b$12$dhash1', 'Cardiologia',    '10000000-0000-0000-0000-000000000001', 1),
('20000000-0000-0000-0000-000000000002', 'OM-23456', 'Sofia',   'Martins',   'sofia.martins@cuf.pt',    '$2b$12$dhash2', 'Medicina Geral', '10000000-0000-0000-0000-000000000002', 1),
('20000000-0000-0000-0000-000000000003', 'OM-34567', 'António', 'Carvalho',  'antonio.carvalho@chp.pt', '$2b$12$dhash3', 'Neurologia',     '10000000-0000-0000-0000-000000000004', 1),
('20000000-0000-0000-0000-000000000004', 'OM-45678', 'Filipa',  'Alves',     'filipa.alves@hsm.pt',     '$2b$12$dhash4', 'Endocrinologia', '10000000-0000-0000-0000-000000000001', 1);

-- -------------------------------------------------------
-- USER_ADDRESSES
-- -------------------------------------------------------
INSERT INTO user_addresses (user_id, street, city, postal_code, country, is_primary) VALUES
('30000000-0000-0000-0000-000000000001', 'Rua da Liberdade, 45 2º Dto',  'Lisboa', '1250-096', 'Portugal', 1),
('30000000-0000-0000-0000-000000000002', 'Av. da República, 120 3º Esq', 'Lisboa', '1050-187', 'Portugal', 1),
('30000000-0000-0000-0000-000000000003', 'R. de Santa Catarina, 78',     'Porto',  '4000-447', 'Portugal', 1),
('30000000-0000-0000-0000-000000000004', 'Largo do Chiado, 5 1º',        'Lisboa', '1200-108', 'Portugal', 1),
('30000000-0000-0000-0000-000000000005', 'R. Direita, 12',               'Braga',  '4700-223', 'Portugal', 1);

-- -------------------------------------------------------
-- EMERGENCY_CONTACTS
-- -------------------------------------------------------
INSERT INTO emergency_contacts (user_id, type, name, phone, address) VALUES
('30000000-0000-0000-0000-000000000001', 'emergency', 'Marta Silva',    '917 111 222', 'Rua da Liberdade, 45 2º Dto, Lisboa'),
('30000000-0000-0000-0000-000000000002', 'emergency', 'Rui Santos',     '918 222 333', 'Av. da República, 120 3º Esq, Lisboa'),
('30000000-0000-0000-0000-000000000003', 'emergency', 'Luísa Ferreira', '919 333 444', 'R. de Santa Catarina, 78, Porto'),
('30000000-0000-0000-0000-000000000004', 'emergency', 'José Pereira',   '920 444 555', 'Largo do Chiado, 5 1º, Lisboa'),
('30000000-0000-0000-0000-000000000005', 'tutor',     'Beatriz Costa',  '921 555 666', 'R. Direita, 12, Braga');

-- -------------------------------------------------------
-- FEMALE_MEDICAL_INFO (users 2 e 4 são do sexo feminino)
-- -------------------------------------------------------
INSERT INTO female_medical_info (user_id, menarche_age, pregnancies, births, abortions, menopause, menopause_age, contraceptive_use, intraceptive_method, contraceptive_reason) VALUES
('30000000-0000-0000-0000-000000000002', 13, 0, 0, 0, 0, NULL, 1, 'Pílula combinada', NULL),
('30000000-0000-0000-0000-000000000004', 12, 3, 3, 0, 1, 52,  0, NULL,                NULL);

-- -------------------------------------------------------
-- USER_SUBSCRIPTIONS
-- -------------------------------------------------------
INSERT INTO user_subscriptions (user_id, plan_id, card_type, start_date, end_date, is_active) VALUES
('30000000-0000-0000-0000-000000000001', 2, 'SC1', '2026-01-01', '2027-01-01', 1),
('30000000-0000-0000-0000-000000000002', 3, 'SC1', '2026-01-15', '2027-01-15', 1),
('30000000-0000-0000-0000-000000000003', 1, 'SC2', '2026-02-01', '2027-02-01', 1),
('30000000-0000-0000-0000-000000000004', 2, 'SC2', '2025-06-01', '2026-06-01', 1),
('30000000-0000-0000-0000-000000000005', 1, 'SC1', '2026-03-01', '2027-03-01', 1);

-- -------------------------------------------------------
-- INSTITUTION_LICENSES
-- -------------------------------------------------------
INSERT INTO institution_licenses (institution_id, billing_type, start_date, end_date, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'annual',  '2026-01-01', '2027-01-01', 1),
('10000000-0000-0000-0000-000000000002', 'monthly', '2026-01-01', '2026-12-31', 1),
('10000000-0000-0000-0000-000000000004', 'annual',  '2026-01-01', '2027-01-01', 1);

-- -------------------------------------------------------
-- ACCESS_REQUESTS
-- -------------------------------------------------------
INSERT INTO access_requests (user_id, doctor_id, requested_at, approved_at, expires_at, status, is_emergency, access_code) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-06-01 09:00:00', '2026-06-01 09:05:00', '2026-06-01 17:00:00', 'approved', 0, '847291'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '2026-06-10 14:30:00', '2026-06-10 14:32:00', '2026-06-10 18:00:00', 'approved', 0, '319284'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '2026-06-15 11:00:00', NULL,                   NULL,                  'pending',  0, '562938'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '2026-06-18 08:00:00', '2026-06-18 08:01:00', '2026-06-18 09:00:00', 'approved', 1, NULL);

-- -------------------------------------------------------
-- MEDICAL_FILES
-- -------------------------------------------------------
INSERT INTO medical_files (user_id, file_name, file_type, file_path, uploaded_by, uploaded_at) VALUES
('30000000-0000-0000-0000-000000000001', 'ecg_joao_silva_2026-06.pdf',      'application/pdf', 'users/1/exams/ecg_2026-06.pdf',        '20000000-0000-0000-0000-000000000001', '2026-06-01 10:00:00'),
('30000000-0000-0000-0000-000000000002', 'analises_ana_santos_2026-05.pdf', 'application/pdf', 'users/2/exams/analises_2026-05.pdf',   '20000000-0000-0000-0000-000000000002', '2026-05-15 09:30:00'),
('30000000-0000-0000-0000-000000000003', 'ressonancia_miguel_2025-12.pdf',  'application/pdf', 'users/3/exams/rmn_2025-12.pdf',        '20000000-0000-0000-0000-000000000003', '2025-12-10 14:00:00'),
('30000000-0000-0000-0000-000000000004', 'analises_maria_2026-04.pdf',      'application/pdf', 'users/4/exams/analises_2026-04.pdf',   '20000000-0000-0000-0000-000000000004', '2026-04-20 11:15:00'),
('30000000-0000-0000-0000-000000000001', 'relatorio_cirurgia_2020.pdf',     'application/pdf', 'users/1/history/cirurgia_2020.pdf',    '20000000-0000-0000-0000-000000000001', '2026-05-01 16:00:00');

-- -------------------------------------------------------
-- SURGICAL_HISTORY
-- -------------------------------------------------------
INSERT INTO surgical_history (user_id, surgery_name, surgery_date, location, notes, report_file_id, added_by, is_active) VALUES
('30000000-0000-0000-0000-000000000001', 'Apendicectomia',                '2020-03-15', 'Hospital de Santa Maria, Lisboa', 'Intervenção sem complicações. Alta ao 2º dia.',                    5,    '20000000-0000-0000-0000-000000000001', 1),
('30000000-0000-0000-0000-000000000004', 'Colecistectomia laparoscópica', '2018-09-22', 'CUF Descobertas, Lisboa',         'Remoção da vesícula biliar por cálculos. Bem tolerada.',            NULL, '20000000-0000-0000-0000-000000000002', 1),
('30000000-0000-0000-0000-000000000003', 'Artroscopia do joelho direito', '2022-05-10', 'Centro Hospitalar do Porto',      'Limpeza articular. Recuperação com fisioterapia durante 6 semanas.',NULL, '20000000-0000-0000-0000-000000000003', 1);

-- -------------------------------------------------------
-- CHRONIC_MEDICATIONS
-- -------------------------------------------------------
INSERT INTO chronic_medications (user_id, active_substance, dose, posology, start_date, end_date, prescribed_by, is_active) VALUES
('30000000-0000-0000-0000-000000000001', 'Ramipril',      '5 mg',   '1 comprimido/dia em jejum',                         '2022-01-10', NULL,         '20000000-0000-0000-0000-000000000001', 1),
('30000000-0000-0000-0000-000000000001', 'Atorvastatina', '20 mg',  '1 comprimido/dia ao jantar',                         '2022-01-10', NULL,         '20000000-0000-0000-0000-000000000001', 1),
('30000000-0000-0000-0000-000000000004', 'Metformina',    '850 mg', '1 comprimido 2x/dia às refeições',                  '2019-06-01', NULL,         '20000000-0000-0000-0000-000000000004', 1),
('30000000-0000-0000-0000-000000000004', 'Levotiroxina',  '75 µg',  '1 comprimido/dia 30 min antes do pequeno-almoço',  '2020-03-01', NULL,         '20000000-0000-0000-0000-000000000004', 1),
('30000000-0000-0000-0000-000000000003', 'Sertralina',    '50 mg',  '1 comprimido/dia de manhã',                         '2023-11-15', '2024-11-15', '20000000-0000-0000-0000-000000000003', 0);

-- -------------------------------------------------------
-- DRUG_ALLERGIES
-- -------------------------------------------------------
INSERT INTO drug_allergies (user_id, active_substance, allergic_reaction, severity) VALUES
('30000000-0000-0000-0000-000000000001', 'Penicilina',   'Erupção cutânea generalizada e edema facial', 'severe'),
('30000000-0000-0000-0000-000000000002', 'Ibuprofeno',   'Urticária e prurido',                         'moderate'),
('30000000-0000-0000-0000-000000000004', 'Sulfonamidas', 'Eritema multiforme',                          'severe'),
('30000000-0000-0000-0000-000000000003', 'Codeína',      'Náuseas e vómitos intensos',                  'mild');

-- -------------------------------------------------------
-- FAMILY_HISTORY
-- -------------------------------------------------------
INSERT INTO family_history (user_id, condition, has_condition, kinship_degree, notes) VALUES
('30000000-0000-0000-0000-000000000001', 'cardiovascular', 1, 'Pai',         'Pai faleceu de enfarte agudo do miocárdio aos 62 anos'),
('30000000-0000-0000-0000-000000000001', 'cancer',         0, NULL,           NULL),
('30000000-0000-0000-0000-000000000002', 'cancer',         1, 'Avó materna', 'Cancro da mama diagnosticado aos 55 anos'),
('30000000-0000-0000-0000-000000000004', 'cardiovascular', 1, 'Mãe',         'Hipertensão arterial e AVC isquémico'),
('30000000-0000-0000-0000-000000000004', 'genetic',        0, NULL,           NULL),
('30000000-0000-0000-0000-000000000003', 'psychological',  1, 'Irmão',       'Esquizofrenia diagnosticada na adolescência');

-- -------------------------------------------------------
-- USER_PATHOLOGIES
-- -------------------------------------------------------
INSERT INTO user_pathologies (user_id, icpc2_id, type, diagnosed_at, notes, added_by) VALUES
('30000000-0000-0000-0000-000000000001', 1, 'active',  '2022-01-10', 'HTA controlada com medicação. Monitorizar PA mensalmente.', '20000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000004', 4, 'active',  '2019-06-01', 'DM2 com bom controlo glicémico. HbA1c 6.8%.',              '20000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000003', 8, 'active',  '2021-03-15', 'Dor lombar crónica. Fisioterapia com melhoria parcial.',    '20000000-0000-0000-0000-000000000003'),
('30000000-0000-0000-0000-000000000002', 7, 'passive', '2020-09-01', 'Episódio resolvido sem sequelas.',                          '20000000-0000-0000-0000-000000000002');

-- -------------------------------------------------------
-- USER_SPECIALTY_FOLLOWUPS
-- -------------------------------------------------------
INSERT INTO user_specialty_followups (user_id, specialty_id, institution, start_date, notes) VALUES
('30000000-0000-0000-0000-000000000001', 1, 'Hospital de Santa Maria',    '2022-01-15', 'Seguimento em cardiologia por HTA e dislipidémia'),
('30000000-0000-0000-0000-000000000004', 7, 'Hospital de Santa Maria',    '2019-06-15', 'Seguimento em endocrinologia por DM2 e hipotiroidismo'),
('30000000-0000-0000-0000-000000000003', 9, 'Centro Hospitalar do Porto', '2023-11-20', 'Consulta de psiquiatria por episódio depressivo maior');

-- -------------------------------------------------------
-- ANALYTICAL_EXAMS
-- -------------------------------------------------------
INSERT INTO analytical_exams (user_id, exam_date, laboratory, file_id, notes, added_by, is_active) VALUES
('30000000-0000-0000-0000-000000000002', '2026-05-10', 'Germano de Sousa', 2,    'Análises de rotina anuais',              '20000000-0000-0000-0000-000000000002', 1),
('30000000-0000-0000-0000-000000000004', '2026-04-15', 'Germano de Sousa', 4,    'Controlo de DM2 e perfil lipídico',      '20000000-0000-0000-0000-000000000004', 1),
('30000000-0000-0000-0000-000000000001', '2026-06-01', 'Germano de Sousa', NULL, 'Perfil cardiovascular',                  '20000000-0000-0000-0000-000000000001', 1);

-- -------------------------------------------------------
-- ANALYTICAL_EXAM_PARAMETERS
-- -------------------------------------------------------
INSERT INTO analytical_exam_parameters (exam_id, parameter_name, value, unit, reference_min, reference_max, is_abnormal) VALUES
-- exam 1 — Ana Santos
(1, 'Glicose',          89.0,  'mg/dL', 70.0, 110.0, 0),
(1, 'Colesterol total', 195.0, 'mg/dL', NULL, 200.0, 0),
(1, 'HDL',              62.0,  'mg/dL', 50.0, NULL,  0),
(1, 'LDL',              118.0, 'mg/dL', NULL, 130.0, 0),
(1, 'Triglicerídeos',   85.0,  'mg/dL', NULL, 150.0, 0),
(1, 'Hemoglobina',      13.8,  'g/dL',  12.0, 16.0,  0),
-- exam 2 — Maria Pereira
(2, 'HbA1c',            6.8,   '%',     NULL, 7.0,   0),
(2, 'Glicose em jejum', 128.0, 'mg/dL', 70.0, 110.0, 1),
(2, 'TSH',              2.1,   'µUI/mL',0.4,  4.0,   0),
(2, 'Colesterol total', 212.0, 'mg/dL', NULL, 200.0, 1),
-- exam 3 — João Silva
(3, 'Colesterol total', 178.0, 'mg/dL', NULL, 200.0, 0),
(3, 'LDL',              95.0,  'mg/dL', NULL, 130.0, 0),
(3, 'PCR',              0.3,   'mg/L',  NULL, 1.0,   0);

-- -------------------------------------------------------
-- IMAGING_EXAMS
-- -------------------------------------------------------
INSERT INTO imaging_exams (user_id, exam_type, body_area, exam_date, institution, file_id, report_text, added_by, is_active) VALUES
('30000000-0000-0000-0000-000000000003', 'Ressonância Magnética', 'Coluna lombar', '2025-12-05', 'Centro Hospitalar do Porto', 3,    'Hérnias discais L4-L5 e L5-S1 com componente extrusivo. Compromisso radicular moderado.', '20000000-0000-0000-0000-000000000003', 1),
('30000000-0000-0000-0000-000000000001', 'Ecocardiograma',        'Coração',       '2026-05-20', 'Hospital de Santa Maria',    NULL, 'FE preservada 62%. Sem alterações valvulares significativas. HVE ligeira.',               '20000000-0000-0000-0000-000000000001', 1);

-- -------------------------------------------------------
-- OPTOMETRY_EXAMS
-- -------------------------------------------------------
INSERT INTO optometry_exams (user_id, exam_date, right_sphere, right_cylinder, right_axis, left_sphere, left_cylinder, left_axis, disease_report, added_by, is_active) VALUES
('30000000-0000-0000-0000-000000000002', '2026-03-10', -1.25, -0.50, 180, -1.00, -0.25, 175, 'Sem patologia ocular. Miopia ligeira bilateral.',   '20000000-0000-0000-0000-000000000002', 1),
('30000000-0000-0000-0000-000000000004', '2025-11-20', -0.50,  0.00,   0, -0.75,  0.00,   0, 'Presbiopia. Sem outras alterações de relevo.',      '20000000-0000-0000-0000-000000000002', 1);

-- -------------------------------------------------------
-- USER_VACCINATIONS
-- -------------------------------------------------------
INSERT INTO user_vaccinations (user_id, vaccine_id, dose_number, administered_at, next_due_date, batch_number, institution, notes, added_by) VALUES
('30000000-0000-0000-0000-000000000001', 3,  '5ª dose (reforço)', '2010-09-01', NULL,         'DTP-2010-A', 'Centro de Saúde da Ajuda',           'Reforço em adulto',  '20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000001', 10, 'Dose anual',        '2025-10-15', '2026-10-15', 'FLU-2025-B', 'Farmácia Saúde Lisboa',              'Gripe sazonal',      '20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000002', 10, 'Dose anual',        '2025-10-20', '2026-10-20', 'FLU-2025-C', 'Centro de Saúde de Arroios',         'Gripe sazonal',      '20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000004', 7,  '2ª dose (reforço)', '2005-05-10', NULL,         'MMR-2005-X', 'Centro de Saúde de Campolide',       'Reforço VASPR',      '20000000-0000-0000-0000-000000000002'),
('30000000-0000-0000-0000-000000000005', 1,  '1ª dose',           '2005-09-15', NULL,         'BCG-2005-Z', 'Maternidade Dr. Alfredo Costa',      NULL,                 '20000000-0000-0000-0000-000000000002');

-- -------------------------------------------------------
-- HEALTH_HABITS
-- details: JSON com campos específicos por tipo
-- -------------------------------------------------------
INSERT INTO health_habits (user_id, type, name, consumes, frequency, quantity, start_date, details) VALUES
('30000000-0000-0000-0000-000000000001', 'alcohol',           NULL,       1,    'Fins de semana', '2-3 bebidas', '2010-01-01', '{"alcohol_type":"Vinho tinto","in_detox":false,"audit_c_score":3,"audit_score":5}'),
('30000000-0000-0000-0000-000000000001', 'physical_activity', 'Corrida',  NULL, '3x por semana',  '5-8 km',     '2018-06-01', '{"activity":"Corrida"}'),
('30000000-0000-0000-0000-000000000002', 'physical_activity', 'Natação',  NULL, '2x por semana',  '1 hora',     '2020-01-01', '{"activity":"Natação"}'),
('30000000-0000-0000-0000-000000000003', 'tobacco',           NULL,       0,    NULL,              NULL,         '2015-03-01', '{"consumes":false,"cigarettes_per_day":0,"years_consumption":8,"pack_years":4.0,"fagerstrom_score":0,"richmond_score":9}'),
('30000000-0000-0000-0000-000000000004', 'alcohol',           NULL,       0,    NULL,              NULL,         NULL,          '{"alcohol_type":null,"in_detox":false,"audit_c_score":0,"audit_score":0}'),
('30000000-0000-0000-0000-000000000005', 'physical_activity', 'Futebol',  NULL, '2x por semana',  '90 min',     '2023-09-01', '{"activity":"Futebol"}');

-- -------------------------------------------------------
-- DOCTOR_NOTES
-- note_text é NULL — a encriptação é feita na camada de aplicação
-- -------------------------------------------------------
INSERT INTO doctor_notes (user_id, doctor_id, section, note_text) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'medical_info', NULL),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'medical_info', NULL),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'habits',       NULL);

-- -------------------------------------------------------
-- PENDING_REVIEW_FLAGS
-- -------------------------------------------------------
INSERT INTO pending_review_flags (user_id, section, created_at, reviewed_at, reviewed_by) VALUES
('30000000-0000-0000-0000-000000000002', 'habits',        '2026-06-10 14:00:00', NULL,                  NULL),
('30000000-0000-0000-0000-000000000004', 'medical_info',  '2026-06-12 09:00:00', '2026-06-13 10:30:00', '20000000-0000-0000-0000-000000000004'),
('30000000-0000-0000-0000-000000000005', 'identification','2026-06-20 08:00:00', NULL,                  NULL);

-- -------------------------------------------------------
-- SCHEMA_VERSIONS
-- -------------------------------------------------------
INSERT INTO schema_versions (version, description, script, applied_by, checksum, success) VALUES
('001', 'Schema inicial — todas as tabelas base',              'schema_v001_initial.sql',       'system', 'a3f8c1d2e4b5f6a7', 1),
('002', 'Adicionar is_active a USERS, DOCTORS e exames',       'schema_v002_is_active.sql',     'system', 'b4e9d2f3a5c6b7e8', 1),
('003', 'Consolidar HEALTH_HABIT_* em HEALTH_HABITS',          'schema_v003_health_habits.sql', 'system', 'c5f0e3a4b6d7c8f9', 1),
('004', 'Adicionar SCHEMA_VERSIONS e APP_VERSIONS',            'schema_v004_versioning.sql',    'system', 'd6a1f4b5c7e8d9a0', 1),
('005', 'users.id, doctors.id e institutions.id passam a GUID','schema_v005_guid_ids.sql',      'system', 'e7b2a5c6d8f9e0b1', 1);

-- -------------------------------------------------------
-- APP_VERSIONS
-- -------------------------------------------------------
INSERT INTO app_versions (version, release_date, description, deployed_by, environment, is_current) VALUES
('0.1.0', '2026-05-01', 'Versão inicial — autenticação e perfil de utilizador', 'braulio.batista', 'dev', 0),
('0.2.0', '2026-06-01', 'MCDTS — exames analíticos e de imagem',                'braulio.batista', 'dev', 0),
('0.3.0', '2026-06-21', 'Hábitos de saúde consolidados e versionamento',        'braulio.batista', 'dev', 1);
