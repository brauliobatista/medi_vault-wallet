using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("medical_files")]
public class MedicalFile
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("file_name")] public string FileName { get; set; } = null!;
    [Column("file_type")] public string? FileType { get; set; }
    [Column("file_path")] public string FilePath { get; set; } = null!;
    [Column("uploaded_by")] public string? UploadedBy { get; set; }
    [Column("uploaded_at")] public string UploadedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("UploadedBy")] public Doctor? UploadedByDoctor { get; set; }
}
