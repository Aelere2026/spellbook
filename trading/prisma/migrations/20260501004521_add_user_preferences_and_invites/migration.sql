/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "preferences" JSONB;

-- CreateTable
CREATE TABLE "Invite" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hashed_token" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_name_key" ON "Invite"("name");

-- CreateIndex
CREATE INDEX "Session_hashed_token_idx" ON "Session"("hashed_token");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
