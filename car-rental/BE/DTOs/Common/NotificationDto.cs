namespace CarRental.API.DTOs.Common;

public class NotificationDto
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? ActionType { get; set; }
    public int? EntityId { get; set; }
    public string? EntityType { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
