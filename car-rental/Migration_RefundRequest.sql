-- =============================================
-- Migration: Add Notification action columns & RefundRequest table
-- Date: 2025
-- Description: 
--   1. Add action_type, entity_id, entity_type columns to Notification table
--   2. Create RefundRequest table for 3-party refund approval workflow
-- =============================================

-- =============================================
-- 1. Alter Notification table
-- =============================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Notification' AND COLUMN_NAME = 'action_type'
)
BEGIN
    ALTER TABLE [Notification] ADD [action_type] NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Notification' AND COLUMN_NAME = 'entity_id'
)
BEGIN
    ALTER TABLE [Notification] ADD [entity_id] INT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Notification' AND COLUMN_NAME = 'entity_type'
)
BEGIN
    ALTER TABLE [Notification] ADD [entity_type] NVARCHAR(50) NULL;
END
GO

-- =============================================
-- 2. Create RefundRequest table
-- =============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RefundRequest')
BEGIN
    CREATE TABLE [RefundRequest] (
        [refund_request_id] INT IDENTITY(1,1) PRIMARY KEY,
        [booking_id] INT NOT NULL,
        [contract_id] INT NOT NULL,
        [customer_id] INT NOT NULL,
        [supplier_id] INT NOT NULL,
        [reason] NVARCHAR(500) NULL,
        [refund_amount] DECIMAL(10,2) NOT NULL,
        [customer_approval] NVARCHAR(20) NOT NULL DEFAULT 'approved',
        [supplier_approval] NVARCHAR(20) NOT NULL DEFAULT 'pending',
        [admin_approval] NVARCHAR(20) NOT NULL DEFAULT 'pending',
        [overall_status] NVARCHAR(20) NOT NULL DEFAULT 'pending',
        [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [is_deleted] BIT NOT NULL DEFAULT 0,

        CONSTRAINT [FK_RefundRequest_Booking] FOREIGN KEY ([booking_id]) REFERENCES [Booking]([booking_id]),
        CONSTRAINT [FK_RefundRequest_Contract] FOREIGN KEY ([contract_id]) REFERENCES [Contract]([contract_id]),
        CONSTRAINT [FK_RefundRequest_Customer] FOREIGN KEY ([customer_id]) REFERENCES [User]([user_id]),
        CONSTRAINT [FK_RefundRequest_Supplier] FOREIGN KEY ([supplier_id]) REFERENCES [User]([user_id])
    );
END
GO

PRINT 'Migration completed successfully.';
GO
