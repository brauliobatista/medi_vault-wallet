using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("vital_signs")]
public class VitalSign
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("doctor_id")] public string DoctorId { get; set; } = null!;
    [Column("recorded_at")] public string RecordedAt { get; set; } = null!;
    [Column("blood_pressure_systolic")] public int? BloodPressureSystolic { get; set; }
    [Column("blood_pressure_diastolic")] public int? BloodPressureDiastolic { get; set; }
    [Column("heart_rate")] public int? HeartRate { get; set; }
    [Column("respiratory_rate")] public int? RespiratoryRate { get; set; }
    [Column("temperature")] public decimal? Temperature { get; set; }
    [Column("spo2")] public int? Spo2 { get; set; }
    [Column("weight")] public decimal? Weight { get; set; }
    [Column("height")] public decimal? Height { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
}
