using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("institutions")]
public class Institution
{
    [Key] [Column("id")] public string Id { get; set; } = null!;
    [Column("name")] public string Name { get; set; } = null!;
    [Column("type")] public string Type { get; set; } = null!;
    [Column("address")] public string? Address { get; set; }
    [Column("phone")] public string? Phone { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;

    public ICollection<Doctor> Doctors { get; set; } = [];
    public ICollection<InstitutionLicense> Licenses { get; set; } = [];
}
