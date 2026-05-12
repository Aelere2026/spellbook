-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_platform_id_fkey";

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
