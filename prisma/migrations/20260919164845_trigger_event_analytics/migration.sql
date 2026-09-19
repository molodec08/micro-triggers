-- CreateTable
CREATE TABLE "TriggerEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TriggerEvent_shop_trigger_eventType_createdAt_idx" ON "TriggerEvent"("shop", "trigger", "eventType", "createdAt");
