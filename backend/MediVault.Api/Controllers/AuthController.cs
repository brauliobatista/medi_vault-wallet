using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Auth;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService) : ControllerBase
{
    [HttpPost("patient/login")]
    public async Task<IActionResult> PatientLogin(PatientLoginRequest req)
    {
        var result = await authService.LoginPatientAsync(req);
        if (result is null) return Unauthorized(new { message = "Credenciais inválidas" });
        return Ok(result);
    }

    [HttpPost("doctor/login")]
    public async Task<IActionResult> DoctorLogin(DoctorLoginRequest req)
    {
        var result = await authService.LoginDoctorAsync(req);
        if (result is null) return Unauthorized(new { message = "Credenciais inválidas" });
        return Ok(result);
    }
}
