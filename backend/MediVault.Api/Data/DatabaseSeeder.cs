using MediVault.Api.Entities;

namespace MediVault.Api.Data;

public static class DatabaseSeeder
{
    private static string NewShareCode() => Guid.NewGuid().ToString("N")[..12].ToUpper();

    public static void Seed(MediVaultDbContext db)
    {
        if (db.Users.Any()) return;

        // --- Subscription plans ---
        var planBasic   = new SubscriptionPlan { Name = "basic",   StorageLimitMb = 512,  PriceAnnual = 9.99m,  PriceMonthly = 1.29m };
        var planMedium  = new SubscriptionPlan { Name = "medium",  StorageLimitMb = 2048, PriceAnnual = 19.99m, PriceMonthly = 2.49m };
        var planPremium = new SubscriptionPlan { Name = "premium", StorageLimitMb = 8192, PriceAnnual = 39.99m, PriceMonthly = 4.99m };
        db.SubscriptionPlans.AddRange(planBasic, planMedium, planPremium);

        // --- Institutions ---
        var hospital = new Institution { Id = Guid.NewGuid().ToString(), Name = "Hospital de Santa Maria", Type = "hospital", Address = "Av. Prof. Egas Moniz, Lisboa", Phone = "217 805 000", IsActive = 1 };
        var clinica  = new Institution { Id = Guid.NewGuid().ToString(), Name = "CUF Descobertas",         Type = "clinic",   Address = "R. Mário Botas, Lisboa",       Phone = "210 025 200", IsActive = 1 };
        db.Institutions.AddRange(hospital, clinica);

        // --- Vaccines ---
        db.Vaccines.AddRange(
            new Vaccine { Name = "COVID-19 (Comirnaty)",           Description = "Vacina BioNTech/Pfizer" },
            new Vaccine { Name = "Gripe sazonal",                  Description = "Vacina antigripal anual" },
            new Vaccine { Name = "Hepatite B",                     Description = "Vacina contra Hepatite B" },
            new Vaccine { Name = "Tétano",                         Description = "Vacina antitetânica" },
            new Vaccine { Name = "MMR (Sarampo, Parotidite, Rubéola)", Description = "Vacina combinada" }
        );

        // --- ICPC2 codes ---
        db.Icpc2Codes.AddRange(
            new Icpc2Code { Code = "K86", Description = "Hipertensão arterial sem complicações", Chapter = "K - Cardiovascular" },
            new Icpc2Code { Code = "T90", Description = "Diabetes mellitus tipo 2",              Chapter = "T - Endócrino" },
            new Icpc2Code { Code = "R96", Description = "Asma",                                  Chapter = "R - Respiratório" }
        );

        // --- Medical specialties ---
        db.MedicalSpecialties.AddRange(
            new MedicalSpecialty { Name = "Medicina Geral e Familiar" },
            new MedicalSpecialty { Name = "Cardiologia" },
            new MedicalSpecialty { Name = "Endocrinologia" }
        );

        db.SaveChanges();

        // --- Patients ---
        var braulio = new User
        {
            Id = Guid.NewGuid().ToString(), ShareCode = NewShareCode(), UtentNumber = "100000001", FiscalNumber = "100000001", CitizenNumber = "10000001",
            Email = "braulio@email.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Braulio", LastName = "Batista", Birthday = "1990-05-10",
            BiologicalGender = "M", Sex = "M", BloodType = "A+",
            AcceptsTransfusion = 1, AcceptsResuscitation = 1, EmergencyAccessCode = 0, IsDependent = 0,
            Phone = "910 000 001", Profession = "Engenheiro",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        var cesar = new User
        {
            Id = Guid.NewGuid().ToString(), ShareCode = NewShareCode(), UtentNumber = "100000002", FiscalNumber = "100000002", CitizenNumber = "10000002",
            Email = "cesar@email.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Cesar", LastName = "Oliveira", Birthday = "1988-11-23",
            BiologicalGender = "M", Sex = "M", BloodType = "O+",
            AcceptsTransfusion = 1, AcceptsResuscitation = 1, EmergencyAccessCode = 0, IsDependent = 0,
            Phone = "910 000 002", Profession = "Gestor",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        var joka = new User
        {
            Id = Guid.NewGuid().ToString(), ShareCode = NewShareCode(), UtentNumber = "100000003", FiscalNumber = "100000003", CitizenNumber = "10000003",
            Email = "joka@email.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Joka", LastName = "Ferreira", Birthday = "1995-02-14",
            BiologicalGender = "M", Sex = "M", BloodType = "B+",
            AcceptsTransfusion = 1, AcceptsResuscitation = 1, EmergencyAccessCode = 0, IsDependent = 0,
            Phone = "910 000 003", Profession = "Designer",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        var tiago = new User
        {
            Id = Guid.NewGuid().ToString(), ShareCode = NewShareCode(), UtentNumber = "100000004", FiscalNumber = "100000004", CitizenNumber = "10000004",
            Email = "tiago@email.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            FirstName = "Tiago", LastName = "Costa", Birthday = "1993-08-30",
            BiologicalGender = "M", Sex = "M", BloodType = "AB+",
            AcceptsTransfusion = 1, AcceptsResuscitation = 1, EmergencyAccessCode = 0, IsDependent = 0,
            Phone = "910 000 004", Profession = "Programador",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        db.Users.AddRange(braulio, cesar, joka, tiago);
        db.SaveChanges();

        // --- Doctors ---
        var monica = new Doctor
        {
            Id = Guid.NewGuid().ToString(), OrdemMedicosId = "OM10001", FirstName = "Monica", LastName = "Sousa",
            Email = "monica.sousa@hsm.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            Speciality = "Medicina Geral e Familiar", InstitutionId = hospital.Id,
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o")
        };

        var diana = new Doctor
        {
            Id = Guid.NewGuid().ToString(), OrdemMedicosId = "OM10002", FirstName = "Diana", LastName = "Pereira",
            Email = "diana.pereira@cuf.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            Speciality = "Cardiologia", InstitutionId = clinica.Id,
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o")
        };

        var maria = new Doctor
        {
            Id = Guid.NewGuid().ToString(), OrdemMedicosId = "OM10003", FirstName = "Maria", LastName = "Gomes",
            Email = "maria.gomes@hsm.pt", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            Speciality = "Endocrinologia", InstitutionId = hospital.Id,
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o")
        };

        db.Doctors.AddRange(monica, diana, maria);
        db.SaveChanges();

        // --- Subscriptions ---
        db.UserSubscriptions.AddRange(
            new UserSubscription { UserId = braulio.Id, PlanId = planPremium.Id, CardType = "SC1", StartDate = "2025-01-01", EndDate = "2026-01-01", IsActive = 1 },
            new UserSubscription { UserId = cesar.Id,   PlanId = planMedium.Id,  CardType = "SC2", StartDate = "2025-03-01", EndDate = "2026-03-01", IsActive = 1 },
            new UserSubscription { UserId = joka.Id,    PlanId = planBasic.Id,   CardType = "SC3", StartDate = "2025-06-01", EndDate = "2026-06-01", IsActive = 1 },
            new UserSubscription { UserId = tiago.Id,   PlanId = planMedium.Id,  CardType = "SC4", StartDate = "2025-04-01", EndDate = "2026-04-01", IsActive = 1 }
        );

        // --- Sample medical data for Braulio ---
        db.ChronicMedications.Add(new ChronicMedication
        {
            UserId = braulio.Id, ActiveSubstance = "Metformina", Dose = "850mg",
            Posology = "2x/dia às refeições", StartDate = "2022-06-01",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o")
        });

        db.DrugAllergies.Add(new DrugAllergy
        {
            UserId = braulio.Id, ActiveSubstance = "Penicilina",
            AllergicReaction = "Urticária generalizada", Severity = "moderate",
            CreatedAt = DateTime.UtcNow.ToString("o")
        });

        db.SurgicalHistories.Add(new SurgicalHistory
        {
            UserId = braulio.Id, SurgeryName = "Apendicectomia",
            SurgeryDate = "2015-04-20", Location = "Hospital de Santa Maria",
            IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o")
        });

        db.HealthHabits.Add(new HealthHabit
        {
            UserId = braulio.Id, Type = "tobacco", Name = "Cigarro",
            Consumes = 0, Frequency = "Ex-fumador",
            StartDate = "2010-01-01", UpdatedAt = DateTime.UtcNow.ToString("o"),
            Details = "{\"fagerstrom_score\":3,\"pack_years\":5,\"years_consumption\":4}"
        });

        // --- Access: Monica → Braulio (approved) ---
        db.AccessRequests.Add(new AccessRequest
        {
            UserId = braulio.Id, DoctorId = monica.Id,
            Status = "approved",
            RequestedAt = DateTime.UtcNow.AddDays(-5).ToString("o"),
            ApprovedAt  = DateTime.UtcNow.AddDays(-4).ToString("o"),
            ExpiresAt   = DateTime.UtcNow.AddDays(25).ToString("o"),
            IsEmergency = 0
        });

        // --- Schedule event types & appointment types (config tables) ---
        var eventTypeCongress = new ScheduleEventType { Code = "CONGRESS", Description = "Congresso" };
        var eventTypeTraining = new ScheduleEventType { Code = "TRAINING", Description = "Formação" };
        var eventTypeVacation = new ScheduleEventType { Code = "VACATION", Description = "Férias" };
        db.ScheduleEventTypes.AddRange(eventTypeCongress, eventTypeTraining, eventTypeVacation);

        var apptTypeConsultation = new AppointmentType { Code = "CONSULTATION", Description = "Consulta" };
        var apptTypeFollowup     = new AppointmentType { Code = "FOLLOWUP",     Description = "Acompanhamento" };
        var apptTypeExam         = new AppointmentType { Code = "EXAM",         Description = "Exame" };
        var apptTypeReturn       = new AppointmentType { Code = "RETURN",       Description = "Retorno" };
        db.AppointmentTypes.AddRange(apptTypeConsultation, apptTypeFollowup, apptTypeExam, apptTypeReturn);

        db.SaveChanges();

        // --- Institution contacts / extensions ---
        db.InstitutionContacts.AddRange(
            new InstitutionContact { InstitutionId = hospital.Id, ServiceName = "Receção Principal",         Extension = "217 805 100", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") },
            new InstitutionContact { InstitutionId = hospital.Id, ServiceName = "Secretaria de Cardiologia",  Extension = "217 805 101", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") },
            new InstitutionContact { InstitutionId = hospital.Id, ServiceName = "Enfermaria 2º Andar",        Extension = "217 805 102", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") },
            new InstitutionContact { InstitutionId = hospital.Id, ServiceName = "Exames – Marcação",          Extension = "217 805 103", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") },
            new InstitutionContact { InstitutionId = clinica.Id,  ServiceName = "Apoio ao Utente",            Extension = "210 025 210", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") },
            new InstitutionContact { InstitutionId = clinica.Id,  ServiceName = "Farmácia Hospitalar",        Extension = "210 025 211", IsActive = 1, CreatedAt = DateTime.UtcNow.ToString("o") }
        );

        // --- Doctor's own agenda (congresses, training, vacation) ---
        db.DoctorScheduleEvents.AddRange(
            new DoctorScheduleEvent { DoctorId = diana.Id,  EventTypeId = eventTypeCongress.Id, Title = "Congresso Nacional de Cardiologia",        Location = "Lisboa, Portugal",   StartDate = "2026-05-15", EndDate = "2026-05-17", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = diana.Id,  EventTypeId = eventTypeCongress.Id, Title = "European Society of Cardiology",           Location = "Madrid, Espanha",    StartDate = "2026-06-05", EndDate = "2026-06-07", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = diana.Id,  EventTypeId = eventTypeVacation.Id, Title = "Período de Férias",                        Location = null,                 StartDate = "2026-08-02", EndDate = "2026-08-08", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = maria.Id,  EventTypeId = eventTypeTraining.Id, Title = "Formação em Endocrinologia Pediátrica",    Location = "Porto, Portugal",    StartDate = "2026-05-22", EndDate = "2026-05-23", Notes = "Ação de formação interna", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = monica.Id, EventTypeId = eventTypeCongress.Id, Title = "Congresso Português de Medicina Geral e Familiar", Location = "Lisboa, Portugal", StartDate = "2026-09-10", EndDate = "2026-09-12", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = monica.Id, EventTypeId = eventTypeTraining.Id, Title = "Formação em Cuidados Paliativos",          Location = "Coimbra, Portugal",  StartDate = "2026-08-03", EndDate = "2026-08-04", Notes = "Ação de formação interna", CreatedAt = DateTime.UtcNow.ToString("o") },
            new DoctorScheduleEvent { DoctorId = monica.Id, EventTypeId = eventTypeVacation.Id, Title = "Período de Férias",                        Location = null,                 StartDate = "2026-08-15", EndDate = "2026-08-22", CreatedAt = DateTime.UtcNow.ToString("o") }
        );

        // --- Daily patient agenda — Diana's and Monica's appointments ---
        var todayStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var tomorrowStr = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        db.PatientAppointments.AddRange(
            // Diana — fixed past date, all statuses already covered by original data
            new PatientAppointment { UserId = braulio.Id, DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = "2026-05-10 09:00:00", Status = "em_curso",   CreatedByRole = "doctor", CreatedByDoctorId = diana.Id, CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = cesar.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = "2026-05-10 10:30:00", Status = "confirmada", CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = joka.Id,    DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "teleconsulta", ScheduledAt = "2026-05-10 11:30:00", Status = "confirmada", CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = tiago.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeReturn.Id,       Modality = "presencial",   ScheduledAt = "2026-05-10 14:00:00", Status = "confirmada", CreatedByRole = "doctor", CreatedByDoctorId = diana.Id, CreatedAt = DateTime.UtcNow.ToString("o") },

            // Diana — today, now covering every status the UI can render
            new PatientAppointment { UserId = cesar.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeFollowup.Id,     Modality = "presencial",   ScheduledAt = $"{todayStr} 08:00:00", Status = "pendente",   CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = braulio.Id, DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = $"{todayStr} 09:00:00", Status = "em_curso",   CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = cesar.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = $"{todayStr} 10:30:00", Status = "confirmada", CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = joka.Id,    DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "teleconsulta", ScheduledAt = $"{todayStr} 11:30:00", Status = "confirmada", CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = braulio.Id, DoctorId = diana.Id, AppointmentTypeId = apptTypeExam.Id,         Modality = "presencial",   ScheduledAt = $"{todayStr} 12:30:00", Status = "concluida",  CreatedByRole = "doctor", CreatedByDoctorId = diana.Id, CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = tiago.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeReturn.Id,       Modality = "presencial",   ScheduledAt = $"{todayStr} 14:00:00", Status = "confirmada", CreatedByRole = "doctor", CreatedByDoctorId = diana.Id, CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = tiago.Id,   DoctorId = diana.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "teleconsulta", ScheduledAt = $"{todayStr} 16:00:00", Status = "cancelada",  CreatedByRole = "staff",  CreatedByDoctorId = null,     CreatedAt = DateTime.UtcNow.ToString("o") },

            // Monica — today, all statuses + modalities
            new PatientAppointment { UserId = cesar.Id,   DoctorId = monica.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = $"{todayStr} 08:30:00", Status = "pendente",   CreatedByRole = "staff",  CreatedByDoctorId = null,      CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = joka.Id,    DoctorId = monica.Id, AppointmentTypeId = apptTypeFollowup.Id,     Modality = "teleconsulta", ScheduledAt = $"{todayStr} 09:30:00", Status = "confirmada", CreatedByRole = "staff",  CreatedByDoctorId = null,      CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = braulio.Id, DoctorId = monica.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = $"{todayStr} 10:30:00", Status = "em_curso",   CreatedByRole = "doctor", CreatedByDoctorId = monica.Id, CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = tiago.Id,   DoctorId = monica.Id, AppointmentTypeId = apptTypeExam.Id,         Modality = "presencial",   ScheduledAt = $"{todayStr} 11:30:00", Status = "concluida",  CreatedByRole = "staff",  CreatedByDoctorId = null,      CreatedAt = DateTime.UtcNow.ToString("o") },
            new PatientAppointment { UserId = cesar.Id,   DoctorId = monica.Id, AppointmentTypeId = apptTypeReturn.Id,       Modality = "presencial",   ScheduledAt = $"{todayStr} 15:00:00", Status = "cancelada",  CreatedByRole = "staff",  CreatedByDoctorId = null,      CreatedAt = DateTime.UtcNow.ToString("o") },

            // Monica — tomorrow, so date navigation ("Dia seguinte") has something to show too
            new PatientAppointment { UserId = joka.Id,    DoctorId = monica.Id, AppointmentTypeId = apptTypeConsultation.Id, Modality = "presencial",   ScheduledAt = $"{tomorrowStr} 09:00:00", Status = "confirmada", CreatedByRole = "doctor", CreatedByDoctorId = monica.Id, CreatedAt = DateTime.UtcNow.ToString("o") }
        );

        db.SaveChanges();
    }
}
