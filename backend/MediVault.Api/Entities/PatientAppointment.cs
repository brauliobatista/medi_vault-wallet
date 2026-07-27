using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("patient_appointments")]
public class PatientAppointment
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("user_id")] public string UserId { get; set; } = null!;
    [Column("doctor_id")] public string DoctorId { get; set; } = null!;
    [Column("appointment_type_id")] public int AppointmentTypeId { get; set; }
    [Column("modality")] public string Modality { get; set; } = null!;
    [Column("scheduled_at")] public string ScheduledAt { get; set; } = null!;
    [Column("status")] public string Status { get; set; } = "confirmada";
    [Column("created_by_role")] public string CreatedByRole { get; set; } = null!;
    [Column("created_by_doctor_id")] public string? CreatedByDoctorId { get; set; }
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("UserId")] public User User { get; set; } = null!;
    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
    [ForeignKey("AppointmentTypeId")] public AppointmentType AppointmentType { get; set; } = null!;
    [ForeignKey("CreatedByDoctorId")] public Doctor? CreatedByDoctor { get; set; }
}
