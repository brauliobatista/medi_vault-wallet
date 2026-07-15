using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Medical;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/patients/{userId}/exams")]
[Authorize]
public class ExamsController(ExamService examService, AccessControlService accessControl) : ControllerBase
{
    private int CurrentId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string CurrentRole => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<bool> CanAccessPatientAsync(int userId)
    {
        if (CurrentRole == "Patient") return CurrentId == userId;
        return await accessControl.DoctorHasAccessAsync(CurrentId, userId);
    }

    // --- Analytical ---

    [HttpGet("analytical")]
    public async Task<IActionResult> GetAnalytical(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await examService.GetAnalyticalExamsAsync(userId));
    }

    [HttpPost("analytical")]
    public async Task<IActionResult> AddAnalytical(int userId, CreateAnalyticalExamRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await examService.AddAnalyticalExamAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetAnalytical), new { userId }, result);
    }

    [HttpDelete("analytical/{id}")]
    public async Task<IActionResult> DeleteAnalytical(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await examService.SoftDeleteAnalyticalExamAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Imaging ---

    [HttpGet("imaging")]
    public async Task<IActionResult> GetImaging(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await examService.GetImagingExamsAsync(userId));
    }

    [HttpPost("imaging")]
    public async Task<IActionResult> AddImaging(int userId, CreateImagingExamRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await examService.AddImagingExamAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetImaging), new { userId }, result);
    }

    [HttpDelete("imaging/{id}")]
    public async Task<IActionResult> DeleteImaging(int userId, int id)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var success = await examService.SoftDeleteImagingExamAsync(id, userId);
        if (!success) return NotFound();
        return NoContent();
    }

    // --- Optometry ---

    [HttpGet("optometry")]
    public async Task<IActionResult> GetOptometry(int userId)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        return Ok(await examService.GetOptometryExamsAsync(userId));
    }

    [HttpPost("optometry")]
    public async Task<IActionResult> AddOptometry(int userId, CreateOptometryExamRequest req)
    {
        if (!await CanAccessPatientAsync(userId)) return Forbid();
        var doctorId = CurrentRole == "Doctor" ? CurrentId : (int?)null;
        var result = await examService.AddOptometryExamAsync(userId, req, doctorId);
        return CreatedAtAction(nameof(GetOptometry), new { userId }, result);
    }
}
