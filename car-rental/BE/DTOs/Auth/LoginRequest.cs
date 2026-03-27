using System.ComponentModel.DataAnnotations;

namespace CarRental.API.DTOs.Auth;

public class LoginRequest
{
    [Required]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
