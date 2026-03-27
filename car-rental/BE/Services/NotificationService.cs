using CarRental.API.Data;
using CarRental.API.DTOs.Common;
using CarRental.API.Models;
using CarRental.API.Repositories.Interfaces;
using CarRental.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CarRental.API.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepo;
    private readonly ApplicationDbContext _context;

    public NotificationService(INotificationRepository notificationRepo, ApplicationDbContext context)
    {
        _notificationRepo = notificationRepo;
        _context = context;
    }

    public async Task SendAsync(int userId, string message, string? type = null, int? entityId = null, string? entityType = null, string? actionType = null)
    {
        var validType = type is "email" or "in_app" or "chatbox" ? type : "in_app";
        var notification = new Notification
        {
            UserId = userId,
            Message = message,
            Type = validType,
            StatusId = 1,
            EntityId = entityId,
            EntityType = entityType,
            ActionType = actionType
        };
        await _notificationRepo.AddAsync(notification);
        await _notificationRepo.SaveChangesAsync();
    }

    public async Task<IEnumerable<NotificationDto>> GetByUserAsync(int userId)
    {
        var items = await _notificationRepo.GetByUserAsync(userId);
        return items.Select(n => new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Message = n.Message,
            Type = n.Type,
            ActionType = n.ActionType,
            EntityId = n.EntityId,
            EntityType = n.EntityType,
            IsRead = n.StatusId == 2,
            CreatedAt = n.CreatedAt
        });
    }

    public async Task MarkAllReadAsync(int userId) =>
        await _notificationRepo.MarkAllReadAsync(userId);

    public async Task<int> GetUnreadCountAsync(int userId) =>
        await _notificationRepo.GetUnreadCountAsync(userId);

    public async Task<NotificationDto?> GetByIdAsync(int notificationId)
    {
        var n = await _context.Notifications.FindAsync(notificationId);
        if (n == null) return null;
        return new NotificationDto
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Message = n.Message,
            Type = n.Type,
            ActionType = n.ActionType,
            EntityId = n.EntityId,
            EntityType = n.EntityType,
            IsRead = n.StatusId == 2,
            CreatedAt = n.CreatedAt
        };
    }

    public async Task RespondAsync(int notificationId, int userId, string response)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification == null || notification.UserId != userId)
            throw new InvalidOperationException("Notification not found.");

        // Mark as read
        notification.StatusId = 2;
        await _context.SaveChangesAsync();
    }
}
