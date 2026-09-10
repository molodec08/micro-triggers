-- AlterTable
ALTER TABLE "BlinkingTabTrigger" ADD COLUMN     "intervalMs" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "ExitPopupTrigger" ADD COLUMN     "countdownSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sensitivityPx" INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "SoundTrigger" ADD COLUMN     "soundPreset" TEXT NOT NULL DEFAULT 'beep';

-- CreateTable
CREATE TABLE "StickyCartBarTrigger" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT 'You have {count} item(s) in your cart',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StickyCartBarTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowStockBadgeTrigger" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "threshold" INTEGER NOT NULL DEFAULT 5,
    "message" TEXT NOT NULL DEFAULT 'Only {count} left in stock!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LowStockBadgeTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreeShippingBarTrigger" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "thresholdCents" INTEGER NOT NULL DEFAULT 5000,
    "message" TEXT NOT NULL DEFAULT 'Add {remaining} more to get free shipping!',
    "successMessage" TEXT NOT NULL DEFAULT 'You''ve unlocked free shipping!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreeShippingBarTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCaptureTrigger" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT 'Leave your email and we''ll send you the discount',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCaptureTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapturedLead" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapturedLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StickyCartBarTrigger_shop_key" ON "StickyCartBarTrigger"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "LowStockBadgeTrigger_shop_key" ON "LowStockBadgeTrigger"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "FreeShippingBarTrigger_shop_key" ON "FreeShippingBarTrigger"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "EmailCaptureTrigger_shop_key" ON "EmailCaptureTrigger"("shop");

-- CreateIndex
CREATE INDEX "CapturedLead_shop_idx" ON "CapturedLead"("shop");
