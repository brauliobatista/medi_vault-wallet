using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("health_habits")]
public class HealthHabit
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; }
    [Column("type")] public string Type { get; set; } = null!;
    [Column("name")] public string? Name { get; set; }
    [Column("consumes")] public int? Consumes { get; set; }
    [Column("frequency")] public string? Frequency { get; set; }
    [Column("quantity")] public string? Quantity { get; set; }
    [Column("start_date")] public string? StartDate { get; set; }
    [Column("updated_at")] public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("details")] public string? Details { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}
