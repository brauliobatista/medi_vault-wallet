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
public class UsersController(UserService userService, GoogleWalletService googleWalletService) : ControllerBase
{
    private string CurrentUserId => (User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"))!;

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

    [HttpGet("me/wallet/google")]
    [Authorize(Roles = "Patient")]
    public async Task<IActionResult> GetGoogleWalletLink()
    {
        if (!googleWalletService.IsConfigured)
            return StatusCode(501, new { message = "Google Wallet ainda não está configurado no servidor." });

        var url = await googleWalletService.GetSaveUrlAsync(CurrentUserId);
        if (url is null) return NotFound();
        return Ok(new { url });
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
