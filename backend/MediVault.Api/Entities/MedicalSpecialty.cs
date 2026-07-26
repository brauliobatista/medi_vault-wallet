using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("medical_specialties")]
public class MedicalSpecialty
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("name")] public string Name { get; set; } = null!;

    public ICollection<UserSpecialtyFollowup> SpecialtyFollowups { get; set; } = [];
}
