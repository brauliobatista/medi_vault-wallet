using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MediVault.Api.Entities;

[Table("appointment_types")]
public class AppointmentType
{
    [Key] [Column("id")] public int Id { get; set; }
    [Column("code")] public string Code { get; set; } = null!;
    [Column("description")] public string? Description { get; set; }

    public ICollection<PatientAppointment> Appointments { get; set; } = [];
}
