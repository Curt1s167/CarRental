using CarRental.API.DTOs.Common;
using CarRental.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarRental.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private int CurrentUserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var items = await _notificationService.GetByUserAsync(CurrentUserId);
        return Ok(ApiResponse<IEnumerable<NotificationDto>>.Ok(items));
    }

    [HttpPatch("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notificationService.MarkAllReadAsync(CurrentUserId);
        return Ok(ApiResponse.OkNoData("Đã đánh dấu tất cả là đã đọc"));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var count = await _notificationService.GetUnreadCountAsync(CurrentUserId);
        return Ok(ApiResponse<int>.Ok(count));
    }

    /// <summary>
    /// Respond to an actionable notification (Accept/Reject).
    /// The actual business logic (contract sign/reject, refund approve/deny) is handled
    /// by dedicated endpoints; this just marks the notification as read.
    /// </summary>
    [HttpPatch("{id}/respond")]
    public async Task<IActionResult> Respond(int id, [FromBody] NotificationRespondDto dto)
    {
        await _notificationService.RespondAsync(id, CurrentUserId, dto.Response);
        return Ok(ApiResponse.OkNoData("Đã phản hồi thông báo"));
    }
}

public class NotificationRespondDto
{
    public string Response { get; set; } = string.Empty; // "accept" or "reject"
}
