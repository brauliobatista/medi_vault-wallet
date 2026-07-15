using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("institution_licenses")]
public class InstitutionLicense
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("institution_id")] public int InstitutionId { get; set; }
    [Column("billing_type")] public string BillingType { get; set; } = null!;
    [Column("start_date")] public string StartDate { get; set; } = null!;
    [Column("end_date")] public string? EndDate { get; set; }
    [Column("is_active")] public int IsActive { get; set; } = 1;

    [ForeignKey("InstitutionId")] public Institution Institution { get; set; } = null!;
}
