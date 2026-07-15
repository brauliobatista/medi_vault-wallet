using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("access_requests")]
public class AccessRequest
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public int UserId { get; set; }
    [Column("doctor_id")] public int DoctorId { get; set; }
    [Column("requested_at")] public string RequestedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("approved_at")] public string? ApprovedAt { get; set; }
    [Column("expires_at")] public string? ExpiresAt { get; set; }
    [Column("status")] public string Status { get; set; } = "pending";
    [Column("is_emergency")] public int IsEmergency { get; set; } = 0;
    [Column("access_code")] public string? AccessCode { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
}
