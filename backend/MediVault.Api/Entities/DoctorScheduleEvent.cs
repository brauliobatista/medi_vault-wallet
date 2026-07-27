using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("doctor_schedule_events")]
public class DoctorScheduleEvent
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("doctor_id")] public string DoctorId { get; set; } = null!;
    [Column("event_type_id")] public int EventTypeId { get; set; }
    [Column("title")] public string Title { get; set; } = null!;
    [Column("location")] public string? Location { get; set; }
    [Column("start_date")] public string StartDate { get; set; } = null!;
    [Column("end_date")] public string EndDate { get; set; } = null!;
    [Column("notes")] public string? Notes { get; set; }
    [Column("created_at")] public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    [ForeignKey("DoctorId")] public Doctor Doctor { get; set; } = null!;
    [ForeignKey("EventTypeId")] public ScheduleEventType EventType { get; set; } = null!;
}
