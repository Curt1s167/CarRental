using CarRental.API.DTOs.Common;

namespace CarRental.API.Services.Interfaces;

public interface IRefundRequestService
{
    Task<RefundRequestDto> CreateAsync(int customerId, CreateRefundRequestDto request);
    Task<RefundRequestDto> RespondAsync(int refundRequestId, int userId, string userRole, string response, string? reason);
    Task<RefundRequestDto?> GetByIdAsync(int refundRequestId);
    Task<IEnumerable<RefundRequestDto>> GetByBookingAsync(int bookingId);
    Task<IEnumerable<RefundRequestDto>> GetByCustomerAsync(int customerId);
    Task<IEnumerable<RefundRequestDto>> GetBySupplierAsync(int supplierId);
    Task<IEnumerable<RefundRequestDto>> GetAllPendingAsync(); // admin
}
