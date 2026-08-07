using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("doctors")]
public class Doctor
{
    [Key] [Column("id")] public string Id { get; set; } = null!;
    [Column("ordem_medicos_id")] public string OrdemMedicosId { get; set; } = null!;
    [Column("first_name")] public string FirstName { get; set; } = null!;
    [Column("last_name")] public string LastName { get; set; } = null!;
    [Column("email")] public string Email { get; set; } = null!;
    [Column("password_hash")] public string PasswordHash { get; set; } = null!;
    [Column("speciality")] public string? Speciality { get; set; }
    [Column("institution_id")] public string InstitutionId { get; set; } = null!;
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("InstitutionId")] public Institution Institution { get; set; } = null!;

    public ICollection<AccessRequest> AccessRequests { get; set; } = [];
    public ICollection<DoctorNote> Notes { get; set; } = [];
    public ICollection<PendingReviewFlag> ReviewedFlags { get; set; } = [];
    public ICollection<DoctorInstitution> DoctorInstitutions { get; set; } = [];
}
