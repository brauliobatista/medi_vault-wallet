using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MediVault.Api.DTOs.Users;
using MediVault.Api.Services;

namespace MediVault.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(UserService userService, AccessControlService accessControl) : ControllerBase
{
    private string CurrentUserId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;

    private async Task<bool> CanAccessUserAsync(string userId)
        => CurrentUserId == userId || await accessControl.GuardianHasAccessAsync(CurrentUserId, userId);

    [HttpGet("{userId}/profile")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetProfileFor(string userId)
    {
        if (!await CanAccessUserAsync(userId)) return Forbid();
        var profile = await userService.GetProfileAsync(userId);
        if (profile is null) return NotFound();
        return Ok(profile);
    }

    [HttpGet("{userId}/qr")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetQrCodeFor(string userId)
    {
        if (!await CanAccessUserAsync(userId)) return Forbid();
        var payload = await userService.GetQrPayloadAsync(userId);
        if (payload is null) return NotFound();
        return Ok(new { payload });
    }

    [HttpPut("{userId}/card")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> ToggleCardFor(string userId, ToggleCardRequest req)
    {
        if (!await CanAccessUserAsync(userId)) return Forbid();
        var success = await userService.ToggleCardAsync(userId, req.Active);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("{userId}/public-info")]
    [Authorize(Roles = "Doctor")]
    public async Task<IActionResult> GetPublicInfo(string userId)
    {
        var info = await userService.GetPublicInfoAsync(userId);
        if (info is null) return NotFound();
        return Ok(new { name = info.Value.Name, publicId = info.Value.Id, photoUrl = info.Value.PhotoUrl });
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

    [HttpPost("me/photo")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> UploadPhoto(IFormFile photo)
    {
        var url = await userService.UploadPhotoAsync(CurrentUserId, photo);
        if (url is null) return BadRequest(new { message = "Ficheiro inválido. Use JPG, PNG ou WEBP até 5MB." });
        return Ok(new { photoUrl = url });
    }

    [HttpDelete("me/photo")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> DeletePhoto()
    {
        var success = await userService.DeletePhotoAsync(CurrentUserId);
        if (!success) return NotFound();
        return NoContent();
    }
}
