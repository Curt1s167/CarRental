using CarRental.API.DTOs.Common;
using CarRental.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarRental.API.Controllers;

[ApiController]
[Route("api/refund-requests")]
[Authorize]
public class RefundRequestController : ControllerBase
{
    private readonly IRefundRequestService _refundService;
    private int CurrentUserId => int.Parse(User.FindFirst("userId")?.Value ?? "0");
    private string CurrentUserRole => User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";

    public RefundRequestController(IRefundRequestService refundService)
    {
        _refundService = refundService;
    }

    /// <summary>Customer creates a refund request</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRefundRequestDto request)
    {
        try
        {
            var result = await _refundService.CreateAsync(CurrentUserId, request);
            return Ok(ApiResponse<RefundRequestDto>.Created(result, "Yêu cầu hoàn tiền đã được gửi"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(ex.Message, 404));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message, 403));
        }
    }

    /// <summary>Supplier or Admin responds to a refund request (approve/reject)</summary>
    [HttpPatch("{id:int}/respond")]
    public async Task<IActionResult> Respond(int id, [FromBody] RespondRefundRequestDto request)
    {
        try
        {
            var result = await _refundService.RespondAsync(id, CurrentUserId, CurrentUserRole, request.Response, request.Reason);
            return Ok(ApiResponse<RefundRequestDto>.Ok(result, "Đã phản hồi yêu cầu hoàn tiền"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object>.Fail(ex.Message, 404));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message, 403));
        }
    }

    /// <summary>Get refund request by ID</summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _refundService.GetByIdAsync(id);
        return result == null
            ? NotFound(ApiResponse<object>.Fail("Yêu cầu hoàn tiền không tồn tại", 404))
            : Ok(ApiResponse<RefundRequestDto>.Ok(result));
    }

    /// <summary>Get refund requests for a booking</summary>
    [HttpGet("booking/{bookingId:int}")]
    public async Task<IActionResult> GetByBooking(int bookingId)
    {
        var items = await _refundService.GetByBookingAsync(bookingId);
        return Ok(ApiResponse<IEnumerable<RefundRequestDto>>.Ok(items));
    }

    /// <summary>Get my refund requests (customer)</summary>
    [HttpGet("my-requests")]
    public async Task<IActionResult> GetMyRequests()
    {
        var items = await _refundService.GetByCustomerAsync(CurrentUserId);
        return Ok(ApiResponse<IEnumerable<RefundRequestDto>>.Ok(items));
    }

    /// <summary>Get refund requests for supplier</summary>
    [Authorize(Roles = "supplier,admin")]
    [HttpGet("supplier/pending")]
    public async Task<IActionResult> GetSupplierPending()
    {
        var items = await _refundService.GetBySupplierAsync(CurrentUserId);
        return Ok(ApiResponse<IEnumerable<RefundRequestDto>>.Ok(items));
    }

    /// <summary>Get all pending refund requests (admin)</summary>
    [Authorize(Roles = "admin")]
    [HttpGet("admin/pending")]
    public async Task<IActionResult> GetAllPending()
    {
        var items = await _refundService.GetAllPendingAsync();
        return Ok(ApiResponse<IEnumerable<RefundRequestDto>>.Ok(items));
    }
}
