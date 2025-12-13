-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'accepted');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "InstituteType" AS ENUM ('school', 'highSchool', 'university', 'bootcamp', 'other');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "senderID" TEXT NOT NULL,
    "receiverID" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connected" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "connectionUserID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connected_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalData" (
    "id" TEXT NOT NULL,
    "dob" TEXT,
    "gender" "Gender",
    "cloudinaryPublicID" TEXT NOT NULL DEFAULT 'USER_PROFILE_PICTURE/default-profile-picture',
    "profilePictureURL" TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dlxi00sgn/image/upload/v1764397437/USER_PROFILE_PICTURE/default-profile-picture.png',
    "thumbnailURL" TEXT NOT NULL DEFAULT 'https://res.cloudinary.com/dlxi00sgn/image/upload/v1764417754/USER_PROFILE_PICTURE/default-profile-picture_08c102.jpg',
    "hometown" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "personalDataID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL,
    "institute" TEXT NOT NULL,
    "instituteType" "InstituteType" NOT NULL,
    "description" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "personalDataID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "description" TEXT,
    "personalDataID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "personalDataID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_pair_key" ON "Connection"("pair");

-- CreateIndex
CREATE INDEX "Connection_senderID_idx" ON "Connection"("senderID");

-- CreateIndex
CREATE INDEX "Connection_receiverID_idx" ON "Connection"("receiverID");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_senderID_receiverID_key" ON "Connection"("senderID", "receiverID");

-- CreateIndex
CREATE INDEX "Connected_userID_idx" ON "Connected"("userID");

-- CreateIndex
CREATE INDEX "Connected_connectionUserID_idx" ON "Connected"("connectionUserID");

-- CreateIndex
CREATE UNIQUE INDEX "Connected_userID_connectionUserID_key" ON "Connected"("userID", "connectionUserID");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalData_userID_key" ON "PersonalData"("userID");

-- CreateIndex
CREATE INDEX "PersonalData_userID_idx" ON "PersonalData"("userID");

-- CreateIndex
CREATE INDEX "WorkExperience_personalDataID_idx" ON "WorkExperience"("personalDataID");

-- CreateIndex
CREATE INDEX "Education_personalDataID_idx" ON "Education"("personalDataID");

-- CreateIndex
CREATE INDEX "Skill_personalDataID_idx" ON "Skill"("personalDataID");

-- CreateIndex
CREATE INDEX "Award_personalDataID_idx" ON "Award"("personalDataID");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_receiverID_fkey" FOREIGN KEY ("receiverID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connected" ADD CONSTRAINT "Connected_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connected" ADD CONSTRAINT "Connected_connectionUserID_fkey" FOREIGN KEY ("connectionUserID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalData" ADD CONSTRAINT "PersonalData_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
