using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("users")]
public class User
{
    [Key] [Column("id")] public string Id { get; set; } = null!;
    [Column("utent_number")] public string UtentNumber { get; set; } = null!;
    [Column("fiscal_number")] public string FiscalNumber { get; set; } = null!;
    [Column("citizen_number")] public string CitizenNumber { get; set; } = null!;
    [Column("email")] public string Email { get; set; } = null!;
    [Column("password_hash")] public string PasswordHash { get; set; } = null!;
    [Column("first_name")] public string FirstName { get; set; } = null!;
    [Column("last_name")] public string LastName { get; set; } = null!;
    [Column("birthday")] public string Birthday { get; set; } = null!;
    [Column("biological_gender")] public string BiologicalGender { get; set; } = null!;
    [Column("sex")] public string Sex { get; set; } = null!;
    [Column("marital_status")] public string? MaritalStatus { get; set; }
    [Column("blood_type")] public string? BloodType { get; set; }
    [Column("accepts_transfusion")] public int AcceptsTransfusion { get; set; } = 1;
    [Column("accepts_resuscitation")] public int AcceptsResuscitation { get; set; } = 1;
    [Column("emergency_access_code")] public int EmergencyAccessCode { get; set; } = 0;
    [Column("is_dependent")] public int IsDependent { get; set; } = 0;
    [Column("profession")] public string? Profession { get; set; }
    [Column("phone")] public string? Phone { get; set; }
    [Column("share_code")] public string ShareCode { get; set; } = string.Empty;
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("card_active")] public int CardActive { get; set; } = 1;
    [Column("photo_path")] public string? PhotoPath { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("updated_at")] public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    public ICollection<UserAddress> Addresses { get; set; } = [];
    public ICollection<EmergencyContact> EmergencyContacts { get; set; } = [];
    public FemalemedicalInfo? FemaleInfo { get; set; }
    public ICollection<UserSubscription> Subscriptions { get; set; } = [];
    public ICollection<AccessRequest> AccessRequests { get; set; } = [];
    public ICollection<MedicalFile> MedicalFiles { get; set; } = [];
    public ICollection<SurgicalHistory> SurgicalHistories { get; set; } = [];
    public ICollection<ChronicMedication> ChronicMedications { get; set; } = [];
    public ICollection<DrugAllergy> DrugAllergies { get; set; } = [];
    public ICollection<FamilyHistory> FamilyHistories { get; set; } = [];
    public ICollection<UserPathology> Pathologies { get; set; } = [];
    public ICollection<UserSpecialtyFollowup> SpecialtyFollowups { get; set; } = [];
    public ICollection<AnalyticalExam> AnalyticalExams { get; set; } = [];
    public ICollection<ImagingExam> ImagingExams { get; set; } = [];
    public ICollection<OptometryExam> OptometryExams { get; set; } = [];
    public ICollection<UserVaccination> Vaccinations { get; set; } = [];
    public ICollection<HealthHabit> HealthHabits { get; set; } = [];
    public ICollection<DoctorNote> DoctorNotes { get; set; } = [];
    public ICollection<PendingReviewFlag> PendingReviewFlags { get; set; } = [];
}
