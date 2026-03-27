using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CarRental.API.Models;

[Table("RefundRequest")]
public class RefundRequest
{
    [Key]
    [Column("refund_request_id")]
    public int RefundRequestId { get; set; }

    [Column("booking_id")]
    public int BookingId { get; set; }

    [Column("contract_id")]
    public int ContractId { get; set; }

    [Column("customer_id")]
    public int CustomerId { get; set; }

    [Column("supplier_id")]
    public int SupplierId { get; set; }

    [MaxLength(500)]
    [Column("reason")]
    public string? Reason { get; set; }

    [Column("refund_amount", TypeName = "decimal(10,2)")]
    public decimal RefundAmount { get; set; }

    /// <summary>pending, approved, rejected</summary>
    [MaxLength(20)]
    [Column("customer_approval")]
    public string CustomerApproval { get; set; } = "approved"; // customer initiated, so auto-approved

    /// <summary>pending, approved, rejected</summary>
    [MaxLength(20)]
    [Column("supplier_approval")]
    public string SupplierApproval { get; set; } = "pending";

    /// <summary>pending, approved, rejected</summary>
    [MaxLength(20)]
    [Column("admin_approval")]
    public string AdminApproval { get; set; } = "pending";

    /// <summary>pending, approved, rejected</summary>
    [MaxLength(20)]
    [Column("overall_status")]
    public string OverallStatus { get; set; } = "pending";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("is_deleted")]
    public bool IsDeleted { get; set; } = false;

    // Navigation
    [ForeignKey("BookingId")]
    public Booking? Booking { get; set; }

    [ForeignKey("ContractId")]
    public Contract? Contract { get; set; }

    [ForeignKey("CustomerId")]
    public User? Customer { get; set; }

    [ForeignKey("SupplierId")]
    public User? Supplier { get; set; }
}
