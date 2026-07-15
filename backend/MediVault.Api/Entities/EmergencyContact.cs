using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("emergency_contacts")]
public class EmergencyContact
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("type")] public string Type { get; set; } = null!;
    [Column("name")] public string Name { get; set; } = null!;
    [Column("phone")] public string? Phone { get; set; }
    [Column("address")] public string? Address { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
}
