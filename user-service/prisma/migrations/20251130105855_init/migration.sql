/*
  Warnings:

  - You are about to drop the column `location` on the `Education` table. All the data in the column will be lost.
  - You are about to drop the column `profilePhoto` on the `PersonalData` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pair]` on the table `Connection` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pair` to the `Connection` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Connection_receiverID_status_idx";

-- DropIndex
DROP INDEX "Connection_senderID_status_idx";

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "pair" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Education" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "PersonalData" DROP COLUMN "profilePhoto",
ADD COLUMN     "cloudinaryPublicID" TEXT NOT NULL DEFAULT 'USER_PROFILE_PICTURE/default-profile-picture',
ADD COLUMN     "profilePictureURL" TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dlxi00sgn/image/upload/v1764397437/USER_PROFILE_PICTURE/default-profile-picture.png',
ADD COLUMN     "thumbnailURL" TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dlxi00sgn/image/upload/v1764417754/USER_PROFILE_PICTURE/default-profile-picture_08c102.jpg';

-- AlterTable
ALTER TABLE "Skill" ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Connected" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "connectionUserID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connected_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connected_userID_idx" ON "Connected"("userID");

-- CreateIndex
CREATE INDEX "Connected_connectionUserID_idx" ON "Connected"("connectionUserID");

-- CreateIndex
CREATE UNIQUE INDEX "Connected_userID_connectionUserID_key" ON "Connected"("userID", "connectionUserID");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_pair_key" ON "Connection"("pair");

-- CreateIndex
CREATE INDEX "Connection_senderID_idx" ON "Connection"("senderID");

-- CreateIndex
CREATE INDEX "Connection_receiverID_idx" ON "Connection"("receiverID");

-- AddForeignKey
ALTER TABLE "Connected" ADD CONSTRAINT "Connected_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connected" ADD CONSTRAINT "Connected_connectionUserID_fkey" FOREIGN KEY ("connectionUserID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
