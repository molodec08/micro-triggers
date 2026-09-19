-- AlterTable
ALTER TABLE "TriggerStyleSettings" ADD COLUMN     "barBackgroundColor" TEXT NOT NULL DEFAULT '#10233d',
ADD COLUMN     "barTextColor" TEXT NOT NULL DEFAULT '#f4f8fb',
ALTER COLUMN "textColor" SET DEFAULT '#10233d',
ALTER COLUMN "accentColor" SET DEFAULT '#1d5fa8',
ALTER COLUMN "borderRadius" SET DEFAULT 14;
