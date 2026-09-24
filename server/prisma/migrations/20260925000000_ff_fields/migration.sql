-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "actualBetterWorse" INTEGER,
ADD COLUMN     "ebaseId" INTEGER,
ADD COLUMN     "notice" TEXT,
ADD COLUMN     "revision" TEXT,
ADD COLUMN     "soloUrl" TEXT,
ALTER COLUMN "sourceApi" SET DEFAULT 'ff-html';

