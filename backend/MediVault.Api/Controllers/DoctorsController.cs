using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/doctors")]
[Authorize(Roles = "Doctor")]
public class DoctorsController(DoctorService doctorService) : ControllerBase
{
    private int DoctorId => int.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await doctorService.GetProfileAsync(DoctorId);
        if (profile is null) return NotFound();
        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile(UpdateDoctorRequest req)
    {
        var success = await doctorService.UpdateProfileAsync(DoctorId, req);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPut("me/password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var success = await doctorService.ChangePasswordAsync(DoctorId, req);
        if (!success) return BadRequest(new { message = "Password atual incorreta" });
        return NoContent();
    }
}
