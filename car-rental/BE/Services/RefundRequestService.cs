using CarRental.API.Data;
using CarRental.API.DTOs.Common;
using CarRental.API.Models;
using CarRental.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CarRental.API.Services;

public class RefundRequestService : IRefundRequestService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notification;

    public RefundRequestService(ApplicationDbContext context, INotificationService notification)
    {
        _context = context;
        _notification = notification;
    }

    public async Task<RefundRequestDto> CreateAsync(int customerId, CreateRefundRequestDto request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Car)
            .Include(b => b.BookingFinancial)
            .FirstOrDefaultAsync(b => b.BookingId == request.BookingId && !b.IsDeleted)
            ?? throw new KeyNotFoundException("Booking không tồn tại");

        if (booking.CustomerId != customerId)
            throw new UnauthorizedAccessException("Bạn không có quyền yêu cầu hoàn tiền cho booking này");

        var contract = await _context.Contracts
            .FirstOrDefaultAsync(c => c.BookingId == request.BookingId && !c.IsDeleted)
            ?? throw new InvalidOperationException("Không tìm thấy hợp đồng cho booking này. Cần có hợp đồng để yêu cầu hoàn tiền.");

        // Check if there's already a pending refund request
        var existing = await _context.RefundRequests
            .FirstOrDefaultAsync(r => r.BookingId == request.BookingId && r.OverallStatus == "pending" && !r.IsDeleted);
        if (existing != null)
            throw new InvalidOperationException("Đã có yêu cầu hoàn tiền đang chờ xử lý cho booking này");

        var supplierId = booking.Car?.SupplierId ?? contract.SupplierId;
        var refundAmount = booking.BookingFinancial?.TotalFare ?? 0;

        var refundRequest = new RefundRequest
        {
            BookingId = request.BookingId,
            ContractId = contract.ContractId,
            CustomerId = customerId,
            SupplierId = supplierId,
            Reason = request.Reason,
            RefundAmount = refundAmount,
            CustomerApproval = "approved", // customer initiates, auto-approved
            SupplierApproval = "pending",
            AdminApproval = "pending",
            OverallStatus = "pending"
        };

        await _context.RefundRequests.AddAsync(refundRequest);
        await _context.SaveChangesAsync();

        // Notify supplier with Accept/Reject
        try
        {
            await _notification.SendAsync(supplierId,
                $"Khách hàng yêu cầu hoàn tiền cho đơn #{booking.BookingId}. Lý do: {request.Reason ?? "Không nêu lý do"}. Vui lòng xác nhận.",
                "in_app", refundRequest.RefundRequestId, "refund_request", "refund_approval_request");
        }
        catch { /* ignore */ }

        // Notify all admins with Accept/Reject
        try
        {
            var admins = await _context.Users
                .Where(u => u.RoleId == 1 && !u.IsDeleted) // RoleId 1 = admin
                .ToListAsync();
            foreach (var admin in admins)
            {
                await _notification.SendAsync(admin.UserId,
                    $"Yêu cầu hoàn tiền mới cho đơn #{booking.BookingId}. Số tiền: {refundAmount:N0} VNĐ. Vui lòng xác nhận.",
                    "in_app", refundRequest.RefundRequestId, "refund_request", "refund_approval_request");
            }
        }
        catch { /* ignore */ }

        return MapToDto(refundRequest);
    }

    public async Task<RefundRequestDto> RespondAsync(int refundRequestId, int userId, string userRole, string response, string? reason)
    {
        var refund = await _context.RefundRequests
            .Include(r => r.Booking)
            .Include(r => r.Contract)
            .FirstOrDefaultAsync(r => r.RefundRequestId == refundRequestId && !r.IsDeleted)
            ?? throw new KeyNotFoundException("Yêu cầu hoàn tiền không tồn tại");

        if (refund.OverallStatus != "pending")
            throw new InvalidOperationException("Yêu cầu hoàn tiền đã được xử lý");

        var validResponse = response.ToLower() is "approved" or "rejected" ? response.ToLower() : throw new ArgumentException("Response phải là 'approved' hoặc 'rejected'");

        // Update the appropriate approval based on role
        if (userRole == "supplier" && refund.SupplierId == userId)
        {
            refund.SupplierApproval = validResponse;
        }
        else if (userRole == "admin")
        {
            refund.AdminApproval = validResponse;
        }
        else
        {
            throw new UnauthorizedAccessException("Bạn không có quyền phản hồi yêu cầu hoàn tiền này");
        }

        // Check if anyone rejected
        if (refund.SupplierApproval == "rejected" || refund.AdminApproval == "rejected")
        {
            refund.OverallStatus = "rejected";
            
            // Notify customer about rejection
            string rejecter = refund.SupplierApproval == "rejected" ? "Chủ xe" : "Admin";
            await _notification.SendAsync(refund.CustomerId,
                $"Yêu cầu hoàn tiền cho đơn #{refund.BookingId} đã bị từ chối bởi {rejecter}." + (reason != null ? $" Lý do: {reason}" : ""),
                "in_app", refundRequestId, "refund_request", "refund_rejected");
        }
        // Check if all approved
        else if (refund.CustomerApproval == "approved" && refund.SupplierApproval == "approved" && refund.AdminApproval == "approved")
        {
            refund.OverallStatus = "approved";

            // Cancel booking and terminate contract
            if (refund.Booking != null)
            {
                refund.Booking.StatusId = 5; // cancelled
                refund.Booking.UpdatedAt = DateTime.UtcNow;
            }
            if (refund.Contract != null)
            {
                refund.Contract.ContractStatusId = 10; // terminated
                refund.Contract.UpdatedAt = DateTime.UtcNow;
            }

            // Notify all parties about approval
            await _notification.SendAsync(refund.CustomerId,
                $"Yêu cầu hoàn tiền cho đơn #{refund.BookingId} đã được chấp thuận! Số tiền {refund.RefundAmount:N0} VNĐ sẽ được hoàn trả.",
                "in_app", refundRequestId, "refund_request", "refund_approved");
            await _notification.SendAsync(refund.SupplierId,
                $"Yêu cầu hoàn tiền cho đơn #{refund.BookingId} đã được chấp thuận. Số tiền: {refund.RefundAmount:N0} VNĐ.",
                "in_app", refundRequestId, "refund_request", "refund_approved");
        }

        refund.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(refund);
    }

    public async Task<RefundRequestDto?> GetByIdAsync(int refundRequestId)
    {
        var r = await _context.RefundRequests
            .Include(x => x.Customer)
            .Include(x => x.Supplier)
            .Include(x => x.Contract)
            .FirstOrDefaultAsync(x => x.RefundRequestId == refundRequestId && !x.IsDeleted);
        return r == null ? null : MapToDto(r);
    }

    public async Task<IEnumerable<RefundRequestDto>> GetByBookingAsync(int bookingId)
    {
        var items = await _context.RefundRequests
            .Include(x => x.Customer).Include(x => x.Supplier).Include(x => x.Contract)
            .Where(x => x.BookingId == bookingId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return items.Select(MapToDto);
    }

    public async Task<IEnumerable<RefundRequestDto>> GetByCustomerAsync(int customerId)
    {
        var items = await _context.RefundRequests
            .Include(x => x.Customer).Include(x => x.Supplier).Include(x => x.Contract)
            .Where(x => x.CustomerId == customerId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return items.Select(MapToDto);
    }

    public async Task<IEnumerable<RefundRequestDto>> GetBySupplierAsync(int supplierId)
    {
        var items = await _context.RefundRequests
            .Include(x => x.Customer).Include(x => x.Supplier).Include(x => x.Contract)
            .Where(x => x.SupplierId == supplierId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return items.Select(MapToDto);
    }

    public async Task<IEnumerable<RefundRequestDto>> GetAllPendingAsync()
    {
        var items = await _context.RefundRequests
            .Include(x => x.Customer).Include(x => x.Supplier).Include(x => x.Contract)
            .Where(x => x.OverallStatus == "pending" && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        return items.Select(MapToDto);
    }

    private static RefundRequestDto MapToDto(RefundRequest r) => new()
    {
        RefundRequestId = r.RefundRequestId,
        BookingId = r.BookingId,
        ContractId = r.ContractId,
        CustomerId = r.CustomerId,
        SupplierId = r.SupplierId,
        CustomerName = r.Customer?.FullName ?? r.Customer?.Email,
        SupplierName = r.Supplier?.FullName ?? r.Supplier?.Email,
        ContractCode = r.Contract?.ContractCode,
        Reason = r.Reason,
        RefundAmount = r.RefundAmount,
        CustomerApproval = r.CustomerApproval,
        SupplierApproval = r.SupplierApproval,
        AdminApproval = r.AdminApproval,
        OverallStatus = r.OverallStatus,
        CreatedAt = r.CreatedAt
    };
}
