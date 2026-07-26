using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(UserService userService) : ControllerBase
{
    private string CurrentUserId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;

    [HttpGet("{userId}/public-info")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> GetPublicInfo(string userId)
    {
        var info = await userService.GetPublicInfoAsync(userId);
        if (info is null) return NotFound();
        return Ok(new { name = info.Value.Name, publicId = info.Value.Id });
    }

    [HttpGet("me")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetProfile()
    {
        var profile = await userService.GetProfileAsync(CurrentUserId);
        if (profile is null) return NotFound();
        return Ok(profile);
    }

    [HttpPut("me")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UpdateProfile(UpdateUserRequest req)
    {
        var success = await userService.UpdateProfileAsync(CurrentUserId, req);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPut("me/password")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        var success = await userService.ChangePasswordAsync(CurrentUserId, req);
        if (!success) return BadRequest(new { message = "Password atual incorreta" });
        return NoContent();
    }

    [HttpPut("me/card")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> ToggleCard(ToggleCardRequest req)
    {
        var success = await userService.ToggleCardAsync(CurrentUserId, req.Active);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("me/qr")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetQrCode()
    {
        var payload = await userService.GetQrPayloadAsync(CurrentUserId);
        if (payload is null) return NotFound();
        return Ok(new { payload });
    }
}
