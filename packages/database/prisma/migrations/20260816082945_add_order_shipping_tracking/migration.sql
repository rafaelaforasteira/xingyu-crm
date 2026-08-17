/*
  Warnings:

  - A unique constraint covering the columns `[shipmentId,externalEventId]` on the table `ShipmentEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerOrderStatusUrl" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "commercialInvoiceUrl" TEXT,
ADD COLUMN     "shippingLabelUrl" TEXT,
ADD COLUMN     "trackingIssuedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShipmentEvent" ADD COLUMN     "externalCode" TEXT,
ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentEvent_shipmentId_externalEventId_key" ON "ShipmentEvent"("shipmentId", "externalEventId");
