/*
  Warnings:

  - A unique constraint covering the columns `[postID,userID]` on the table `Like` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Comment_userID_idx" ON "Comment"("userID");

-- CreateIndex
CREATE INDEX "Comment_postID_idx" ON "Comment"("postID");

-- CreateIndex
CREATE INDEX "Comment_postID_createdAt_idx" ON "Comment"("postID", "createdAt");

-- CreateIndex
CREATE INDEX "Like_userID_idx" ON "Like"("userID");

-- CreateIndex
CREATE INDEX "Like_postID_idx" ON "Like"("postID");

-- CreateIndex
CREATE INDEX "Like_postID_createdAt_idx" ON "Like"("postID", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postID_userID_key" ON "Like"("postID", "userID");

-- CreateIndex
CREATE INDEX "Post_userID_idx" ON "Post"("userID");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");
