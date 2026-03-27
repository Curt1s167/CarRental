namespace CarRental.API.DTOs.Common;

public class RefundRequestDto
{
    public int RefundRequestId { get; set; }
    public int BookingId { get; set; }
    public int ContractId { get; set; }
    public int CustomerId { get; set; }
    public int SupplierId { get; set; }
    public string? CustomerName { get; set; }
    public string? SupplierName { get; set; }
    public string? ContractCode { get; set; }
    public string? Reason { get; set; }
    public decimal RefundAmount { get; set; }
    public string CustomerApproval { get; set; } = "pending";
    public string SupplierApproval { get; set; } = "pending";
    public string AdminApproval { get; set; } = "pending";
    public string OverallStatus { get; set; } = "pending";
    public DateTime CreatedAt { get; set; }
}

public class CreateRefundRequestDto
{
    public int BookingId { get; set; }
    public string? Reason { get; set; }
}

public class RespondRefundRequestDto
{
    public string Response { get; set; } = string.Empty; // "approved" or "rejected"
    public string? Reason { get; set; }
}
