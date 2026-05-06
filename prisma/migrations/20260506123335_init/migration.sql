-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WineProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "likedWines" JSONB NOT NULL DEFAULT '[]',
    "dislikedWines" JSONB NOT NULL DEFAULT '[]',
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WineProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WineProfile_userId_key" ON "WineProfile"("userId");

-- AddForeignKey
ALTER TABLE "WineProfile" ADD CONSTRAINT "WineProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
