namespace CarRental.API.DTOs.Booking;

// ── Contract DTOs ──────────────────────────────────────────────────────────────

public class ContractDto
{
    public int ContractId { get; set; }
    public int BookingId { get; set; }
    public string ContractCode { get; set; } = string.Empty;

    // ── Bên A (Supplier) ──
    public int SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? SupplierPhone { get; set; }
    public string? SupplierEmail { get; set; }
    public string? SupplierAddress { get; set; }
    public string? SupplierNationalId { get; set; }

    // ── Bên B (Customer) ──
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerAddress { get; set; }
    public string? CustomerNationalId { get; set; }
    public string? CustomerDrivingLicense { get; set; }

    // ── Xe ──
    public int CarId { get; set; }
    public string? CarModel { get; set; }
    public string? CarBrand { get; set; }
    public string? LicensePlate { get; set; }
    public int? CarYear { get; set; }
    public byte? CarSeats { get; set; }
    public string? CarColor { get; set; }
    public string? CarTransmission { get; set; }
    public string? CarFuelType { get; set; }

    // ── Thời gian ──
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int TotalDays { get; set; }
    public string? PickupLocation { get; set; }
    public string? DropoffLocation { get; set; }

    // ── Tài chính ──
    public decimal DailyRate { get; set; }
    public decimal TotalFare { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal AppliedDiscount { get; set; }
    public decimal LateFeeAmount { get; set; }

    // ── Hợp đồng ──
    public string? TermsAndConditions { get; set; }
    public bool SignedByCustomer { get; set; }
    public bool SignedBySupplier { get; set; }
    public string? CustomerSignature { get; set; }
    public string? SupplierSignature { get; set; }
    public int ContractStatusId { get; set; }
    public string? ContractStatusName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ── Thanh toán ──
    public ContractPaymentInfoDto? PaymentInfo { get; set; }

    // Customer license info for supplier to verify before signing
    public LicenseInfoDto? CustomerLicense { get; set; }
}

public class ContractPaymentInfoDto
{
    public int PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string? PaymentMethod { get; set; }
    public string PaymentStatus { get; set; } = "pending";
    public string? TransactionId { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string? PaymentType { get; set; }
}

public class ContractListDto
{
    public int ContractId { get; set; }
    public int BookingId { get; set; }
    public string ContractCode { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CarInfo { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public bool SignedByCustomer { get; set; }
    public bool SignedBySupplier { get; set; }
    public string? ContractStatusName { get; set; }
    public int ContractStatusId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SignContractRequest
{
    public string Signature { get; set; } = string.Empty; // base64 or text signature
}

public class SignAndPayRequest
{
    public string Signature { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = "stripe"; // stripe, cash, transfer
}

public class ContractPaymentRequest
{
    public string PaymentMethod { get; set; } = "stripe";
}

// ── Contract Form Data (for FE to pre-fill form) ──
public class ContractFormDataDto
{
    // Supplier Info (auto-filled from booking)
    public string? SupplierName { get; set; }
    public string? SupplierPhone { get; set; }
    public string? SupplierEmail { get; set; }
    public string? SupplierAddress { get; set; }
    public string? SupplierNationalId { get; set; }

    // Customer Info (auto-filled from booking)
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerAddress { get; set; }
    public string? CustomerNationalId { get; set; }
    public string? CustomerDrivingLicense { get; set; }

    // Car Info
    public string? CarBrand { get; set; }
    public string? CarModel { get; set; }
    public string? LicensePlate { get; set; }
    public int? CarYear { get; set; }
    public byte? CarSeats { get; set; }
    public string? CarColor { get; set; }
    public string? CarTransmission { get; set; }
    public string? CarFuelType { get; set; }

    // Rental Details
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalDays { get; set; }
    public string? PickupLocation { get; set; }
    public string? DropoffLocation { get; set; }

    // Financial Details
    public decimal DailyRate { get; set; }
    public decimal TotalFare { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal AppliedDiscount { get; set; }
    public decimal LateFeeAmount { get; set; }
}

// ── Contract Sign & Pay Request ──
public class ContractSignAndPayRequest
{
    public string CustomerSignature { get; set; } = string.Empty; // base64
    public string PaymentMethod { get; set; } = "stripe"; // stripe, cash, transfer
    public decimal Amount { get; set; }
}

// ── Contract Review Response ──
public class ContractReviewDto
{
    public int ContractId { get; set; }
    public string ContractCode { get; set; } = string.Empty;
    public ContractFormDataDto? FormData { get; set; }
    public string? Terms { get; set; }
    public string? CustomerSignature { get; set; }
    public string? SupplierSignature { get; set; }
    public ContractPaymentInfoDto? PaymentInfo { get; set; }
    public int ContractStatusId { get; set; }
    public string? ContractStatusName { get; set; }
}

// ── License Verification DTOs ──────────────────────────────────────────────────

public class LicenseInfoDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? DrivingLicense { get; set; }
    public string? DrivingLicenseFrontImage { get; set; }
    public string? DrivingLicenseBackImage { get; set; }
    public string? NationalId { get; set; }
    public string? NationalIdFrontImage { get; set; }
    public string? NationalIdBackImage { get; set; }
    public string LicenseVerificationStatus { get; set; } = "unverified";
    public DateTime? LicenseVerifiedAt { get; set; }
    public int? LicenseVerifiedBy { get; set; }
    public string? LicenseRejectionReason { get; set; }
}

public class VerifyLicenseRequest
{
    public bool Approved { get; set; }
    public string? RejectionReason { get; set; }
}

public class LicenseVerificationListDto
{
    public int UserId { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? DrivingLicense { get; set; }
    public string? DrivingLicenseFrontImage { get; set; }
    public string? DrivingLicenseBackImage { get; set; }
    public string LicenseVerificationStatus { get; set; } = "unverified";
    public int BookingId { get; set; }
    public string? CarInfo { get; set; }
    public DateTime BookingDate { get; set; }
}
