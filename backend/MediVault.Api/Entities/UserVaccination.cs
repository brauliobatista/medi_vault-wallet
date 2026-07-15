using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("user_vaccinations")]
public class UserVaccination
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("vaccine_id")] public int VaccineId { get; set; }
    [Column("dose_number")] public string? DoseNumber { get; set; }
    [Column("administered_at")] public string? AdministeredAt { get; set; }
    [Column("next_due_date")] public string? NextDueDate { get; set; }
    [Column("batch_number")] public string? BatchNumber { get; set; }
    [Column("institution")] public string? Institution { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("added_by")] public int? AddedBy { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("VaccineId")] public Vaccine Vaccine { get; set; } = null!;
    [ForeignKey("AddedBy")] public Doctor? AddedByDoctor { get; set; }
}
