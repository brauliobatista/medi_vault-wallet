using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("pending_review_flags")]
public class PendingReviewFlag
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("section")] public string Section { get; set; } = null!;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    [Column("reviewed_at")] public string? ReviewedAt { get; set; }
    [Column("reviewed_by")] public string? ReviewedBy { get; set; }

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("ReviewedBy")] public Doctor? ReviewedByDoctor { get; set; }
}
