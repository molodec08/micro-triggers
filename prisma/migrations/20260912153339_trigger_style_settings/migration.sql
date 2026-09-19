-- CreateTable
CREATE TABLE "TriggerStyleSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "useThemeStyles" BOOLEAN NOT NULL DEFAULT true,
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#111111',
    "accentColor" TEXT NOT NULL DEFAULT '#2c6ecb',
    "fontFamily" TEXT NOT NULL DEFAULT 'inherit',
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "fontWeight" TEXT NOT NULL DEFAULT 'normal',
    "borderRadius" INTEGER NOT NULL DEFAULT 8,
    "boxShadow" BOOLEAN NOT NULL DEFAULT true,
    "animation" TEXT NOT NULL DEFAULT 'fade',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriggerStyleSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TriggerStyleSettings_shop_key" ON "TriggerStyleSettings"("shop");
