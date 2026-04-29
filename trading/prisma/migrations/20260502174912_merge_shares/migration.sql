/*
  Warnings:

  - Added the required column `user_id` to the `Arbitrage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Arbitrage" ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "hashed_token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Arbitrage_user_id_idx" ON "Arbitrage"("user_id");

-- AddForeignKey
ALTER TABLE "Arbitrage" ADD CONSTRAINT "Arbitrage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
