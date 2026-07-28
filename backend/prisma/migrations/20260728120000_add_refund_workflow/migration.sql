ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_FAILED';
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'ABACATEPAY');
ALTER TABLE "Order" ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN "externalPaymentId" TEXT,
ADD COLUMN "refundId" TEXT,
ADD COLUMN "refundFailureReason" TEXT;
CREATE TABLE "Refund" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "gateway" "PaymentProvider" NOT NULL, "gatewayRefundId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL, "status" "OrderStatus" NOT NULL,
  "failureReason" TEXT, "ipAddress" TEXT, "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Refund_orderId_key" ON "Refund"("orderId");
CREATE INDEX "Refund_status_requestedAt_idx" ON "Refund"("status", "requestedAt");
CREATE INDEX "Refund_gateway_requestedAt_idx" ON "Refund"("gateway", "requestedAt");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
