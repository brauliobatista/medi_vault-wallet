using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediVault.Api.DTOs.Agenda;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/doctors/me")]
[Authorize(Roles = "Doctor")]
public class AgendaController(AgendaService agendaService) : ControllerBase
{
    private string DoctorId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;

    // --- Reference lists ---

    [HttpGet("schedule-event-types")]
    public async Task<IActionResult> GetScheduleEventTypes()
        => Ok(await agendaService.GetScheduleEventTypesAsync());

    [HttpGet("appointment-types")]
    public async Task<IActionResult> GetAppointmentTypes()
        => Ok(await agendaService.GetAppointmentTypesAsync());

    // --- Schedule events (Agenda Médica Programada) ---

    [HttpGet("schedule-events")]
    public async Task<IActionResult> GetScheduleEvents([FromQuery] string? type)
        => Ok(await agendaService.GetDoctorScheduleEventsAsync(DoctorId, type));

    [HttpPost("schedule-events")]
    public async Task<IActionResult> CreateScheduleEvent(CreateScheduleEventRequest req)
    {
        try
        {
            var result = await agendaService.CreateScheduleEventAsync(DoctorId, req);
            if (result is null) return BadRequest(new { message = "Tipo de evento inválido." });
            return Ok(result);
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpPut("schedule-events/{id}")]
    public async Task<IActionResult> UpdateScheduleEvent(int id, UpdateScheduleEventRequest req)
    {
        try
        {
            var success = await agendaService.UpdateScheduleEventAsync(DoctorId, id, req);
            if (!success) return NotFound();
            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpDelete("schedule-events/{id}")]
    public async Task<IActionResult> DeleteScheduleEvent(int id)
    {
        var success = await agendaService.DeleteScheduleEventAsync(DoctorId, id);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Patient appointments (Agenda Diária) ---

    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments([FromQuery] string? date)
    {
        var day = string.IsNullOrWhiteSpace(date) ? DateTime.UtcNow.ToString("yyyy-MM-dd") : date;
        return Ok(await agendaService.GetDailyAppointmentsAsync(DoctorId, day));
    }

    [HttpGet("appointments/all")]
    public async Task<IActionResult> GetAllAppointments()
        => Ok(await agendaService.GetAllAppointmentsAsync(DoctorId));

    [HttpPost("appointments")]
    public async Task<IActionResult> CreateAppointment(CreateAppointmentRequest req)
    {
        try
        {
            var result = await agendaService.CreateAppointmentAsync(DoctorId, req);
            if (result is null) return BadRequest(new { message = "Utente ou tipo de consulta inválido." });
            return Ok(result);
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpPut("appointments/{id}")]
    public async Task<IActionResult> UpdateAppointment(int id, UpdateAppointmentRequest req)
    {
        try
        {
            var success = await agendaService.UpdateAppointmentAsync(DoctorId, id, req);
            if (!success) return NotFound();
            return NoContent();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpDelete("appointments/{id}")]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var success = await agendaService.DeleteAppointmentAsync(DoctorId, id);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Institution contacts ---

    [HttpGet("institution-contacts")]
    public async Task<IActionResult> GetInstitutionContacts()
        => Ok(await agendaService.GetInstitutionContactsAsync(DoctorId));
}
