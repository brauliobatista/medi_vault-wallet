using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("patient_chat_messages")]
public class TeamChatMessage
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("author_doctor_id")] public string AuthorDoctorId { get; set; } = null!;
    [Column("message")] public string Message { get; set; } = null!;
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("AuthorDoctorId")] public Doctor AuthorDoctor { get; set; } = null!;
}
