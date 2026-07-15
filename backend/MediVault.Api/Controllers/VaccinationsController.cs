using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Authorize]
public class VaccinationsController(VaccinationService vaccinationService, AccessControlService accessControl) : ControllerBase
{
    private int CurrentId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<bool> CanAccessPatientAsync(int userId)
    {
        if (CurrentRole == "Patient") return CurrentId == userId;
        return await accessControl.DoctorHasAccessAsync(CurrentId, userId);
    }

    [HttpGet("api/vaccines")]
    public async Task<IActionResult> GetVaccines() =>
        Ok(await vaccinationService.GetAllVaccinesAsync());

    [HttpGet("api/patients/{userId}/vaccinations")]
    public async Task<IActionResult> GetVaccinations(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await vaccinationService.GetVaccinationsAsync(userId));
    }

    [HttpPost("api/patients/{userId}/vaccinations")]
    public async Task<IActionResult> AddVaccination(int userId, CreateVaccinationRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await vaccinationService.AddVaccinationAsync(userId, req, doctorId);
        return Ok(result);
    }

    [HttpDelete("api/patients/{userId}/vaccinations/{id}")]
    public async Task<IActionResult> DeleteVaccination(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await vaccinationService.DeleteVaccinationAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }
}
