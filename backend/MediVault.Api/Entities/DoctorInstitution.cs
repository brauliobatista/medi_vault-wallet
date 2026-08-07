using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

// A doctor can practice at more than one institution (many-to-many).
// doctors.institution_id remains the doctor's primary/default institution.
[Table("doctor_institutions")]
public class DoctorInstitution
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("doctor_id")] public string DoctorId { get; set; } = null!;
    [Column("institution_id")] public string InstitutionId { get; set; } = null!;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
    [ForeignKey("InstitutionId")] public Institution Institution { get; set; } = null!;
}
