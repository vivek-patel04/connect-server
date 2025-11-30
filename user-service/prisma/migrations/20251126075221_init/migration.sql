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
    "status" "Status" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalData" (
    "id" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "profilePhoto" TEXT DEFAULT 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png',
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
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
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
    "location" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "personalDataID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
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
CREATE INDEX "Connection_senderID_status_idx" ON "Connection"("senderID", "status");

-- CreateIndex
CREATE INDEX "Connection_receiverID_status_idx" ON "Connection"("receiverID", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_senderID_receiverID_key" ON "Connection"("senderID", "receiverID");

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
ALTER TABLE "PersonalData" ADD CONSTRAINT "PersonalData_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Education" ADD CONSTRAINT "Education_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_personalDataID_fkey" FOREIGN KEY ("personalDataID") REFERENCES "PersonalData"("id") ON DELETE CASCADE ON UPDATE CASCADE;
