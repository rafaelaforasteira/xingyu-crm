ALTER TABLE "Order"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "externalName" TEXT,
ADD COLUMN "externalUrl" TEXT,
ADD COLUMN "financialStatus" TEXT,
ADD COLUMN "paymentGateway" TEXT,
ADD COLUMN "customerNameSnapshot" TEXT,
ADD COLUMN "customerEmailSnapshot" TEXT,
ADD COLUMN "customerPhoneSnapshot" TEXT,
ADD COLUMN "recipientNameSnapshot" TEXT,
ADD COLUMN "address1Snapshot" TEXT,
ADD COLUMN "address2Snapshot" TEXT,
ADD COLUMN "addressNumberSnapshot" TEXT,
ADD COLUMN "complementSnapshot" TEXT,
ADD COLUMN "neighborhoodSnapshot" TEXT,
ADD COLUMN "citySnapshot" TEXT,
ADD COLUMN "provinceSnapshot" TEXT,
ADD COLUMN "postalCodeSnapshot" TEXT,
ADD COLUMN "countrySnapshot" TEXT,
ADD COLUMN "countryCodeSnapshot" TEXT,
ADD COLUMN "formattedAddressSnapshot" TEXT,
ADD COLUMN "isFirstPurchase" BOOLEAN,
ADD COLUMN "purchaseOrdinal" INTEGER,
ADD COLUMN "trackingSourceSnapshot" TEXT,
ADD COLUMN "trackingMediumSnapshot" TEXT,
ADD COLUMN "trackingCampaignSnapshot" TEXT,
ADD COLUMN "trackingContentSnapshot" TEXT,
ADD COLUMN "trackingTermSnapshot" TEXT,
ADD COLUMN "landingPageSnapshot" TEXT,
ADD COLUMN "referrerSnapshot" TEXT;

ALTER TABLE "OrderItem"
ADD COLUMN "externalProductId" TEXT,
ADD COLUMN "externalVariantId" TEXT,
ADD COLUMN "variantTitle" TEXT;

CREATE TABLE "OrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Order_contactId_orderedAt_idx" ON "Order"("contactId", "orderedAt");
CREATE INDEX "Order_organizationId_externalId_idx" ON "Order"("organizationId", "externalId");
CREATE INDEX "OrderEvent_orderId_occurredAt_idx" ON "OrderEvent"("orderId", "occurredAt");
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
