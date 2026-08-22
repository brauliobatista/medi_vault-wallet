using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("institution_contacts")]
public class InstitutionContact
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("institution_id")] public string InstitutionId { get; set; } = null!;
    [Column("service_name")] public string ServiceName { get; set; } = null!;
    [Column("extension")] public string Extension { get; set; } = null!;
    [Column("is_active")] public int IsActive { get; set; } = 1;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("InstitutionId")] public Institution Institution { get; set; } = null!;
}
