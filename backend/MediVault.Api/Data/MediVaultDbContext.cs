using Microsoft.EntityFrameworkCore;
using MediVault.Api.Entities;

namespace MediVault.Api.Data;

public class MediVaultDbContext(DbContextOptions<MediVaultDbContext> options) : DbContext(options)
{
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<Institution> Institutions => Set<Institution>();
    public DbSet<Vaccine> Vaccines => Set<Vaccine>();
    public DbSet<Icpc2Code> Icpc2Codes => Set<Icpc2Code>();
    public DbSet<MedicalSpecialty> MedicalSpecialties => Set<MedicalSpecialty>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();
    public DbSet<EmergencyContact> EmergencyContacts => Set<EmergencyContact>();
    public DbSet<FemalemedicalInfo> FemaleMedicalInfos => Set<FemalemedicalInfo>();
    public DbSet<UserSubscription> UserSubscriptions => Set<UserSubscription>();
    public DbSet<InstitutionLicense> InstitutionLicenses => Set<InstitutionLicense>();
    public DbSet<AccessRequest> AccessRequests => Set<AccessRequest>();
    public DbSet<MedicalFile> MedicalFiles => Set<MedicalFile>();
    public DbSet<SurgicalHistory> SurgicalHistories => Set<SurgicalHistory>();
    public DbSet<ChronicMedication> ChronicMedications => Set<ChronicMedication>();
    public DbSet<DrugAllergy> DrugAllergies => Set<DrugAllergy>();
    public DbSet<FamilyHistory> FamilyHistories => Set<FamilyHistory>();
    public DbSet<UserPathology> UserPathologies => Set<UserPathology>();
    public DbSet<UserSpecialtyFollowup> UserSpecialtyFollowups => Set<UserSpecialtyFollowup>();
    public DbSet<AnalyticalExam> AnalyticalExams => Set<AnalyticalExam>();
    public DbSet<AnalyticalExamParameter> AnalyticalExamParameters => Set<AnalyticalExamParameter>();
    public DbSet<ImagingExam> ImagingExams => Set<ImagingExam>();
    public DbSet<OptometryExam> OptometryExams => Set<OptometryExam>();
    public DbSet<UserVaccination> UserVaccinations => Set<UserVaccination>();
    public DbSet<HealthHabit> HealthHabits => Set<HealthHabit>();
    public DbSet<DoctorNote> DoctorNotes => Set<DoctorNote>();
    public DbSet<PendingReviewFlag> PendingReviewFlags => Set<PendingReviewFlag>();
    public DbSet<SchemaVersion> SchemaVersions => Set<SchemaVersion>();
    public DbSet<AppVersion> AppVersions => Set<AppVersion>();
    public DbSet<VitalSign> VitalSigns => Set<VitalSign>();
    public DbSet<ClinicalAssessment> ClinicalAssessments => Set<ClinicalAssessment>();
    public DbSet<Anamnesis> Anamneses => Set<Anamnesis>();
    public DbSet<TeamChatMessage> TeamChatMessages => Set<TeamChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.UtentNumber).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.FiscalNumber).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.CitizenNumber).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Doctor>()
            .HasIndex(d => d.OrdemMedicosId).IsUnique();
        modelBuilder.Entity<Doctor>()
            .HasIndex(d => d.Email).IsUnique();

        modelBuilder.Entity<Icpc2Code>()
            .HasIndex(c => c.Code).IsUnique();

        modelBuilder.Entity<FemalemedicalInfo>()
            .HasIndex(f => f.UserId).IsUnique();

        modelBuilder.Entity<MedicalFile>()
            .HasOne(f => f.UploadedByDoctor)
            .WithMany()
            .HasForeignKey(f => f.UploadedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SurgicalHistory>()
            .HasOne(s => s.AddedByDoctor)
            .WithMany()
            .HasForeignKey(s => s.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ChronicMedication>()
            .HasOne(c => c.PrescribedByDoctor)
            .WithMany()
            .HasForeignKey(c => c.PrescribedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<UserPathology>()
            .HasOne(p => p.AddedByDoctor)
            .WithMany()
            .HasForeignKey(p => p.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AnalyticalExam>()
            .HasOne(e => e.AddedByDoctor)
            .WithMany()
            .HasForeignKey(e => e.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ImagingExam>()
            .HasOne(e => e.AddedByDoctor)
            .WithMany()
            .HasForeignKey(e => e.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<OptometryExam>()
            .HasOne(e => e.AddedByDoctor)
            .WithMany()
            .HasForeignKey(e => e.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<UserVaccination>()
            .HasOne(v => v.AddedByDoctor)
            .WithMany()
            .HasForeignKey(v => v.AddedBy)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PendingReviewFlag>()
            .HasOne(f => f.ReviewedByDoctor)
            .WithMany(d => d.ReviewedFlags)
            .HasForeignKey(f => f.ReviewedBy)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
