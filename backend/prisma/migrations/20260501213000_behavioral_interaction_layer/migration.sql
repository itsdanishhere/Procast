-- Add reflection focus scoring and behavioral interruption logs.

ALTER TABLE "Reflection"
ADD COLUMN "focusRating" INTEGER,
ADD COLUMN "reflectionNotes" TEXT;

ALTER TABLE "Reflection"
ADD CONSTRAINT "Reflection_focusRating_check"
CHECK ("focusRating" IS NULL OR ("focusRating" >= 1 AND "focusRating" <= 5));

CREATE TABLE "DistractionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusSessionId" TEXT,
    "reasonCategory" TEXT NOT NULL,
    "customReason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'early_exit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistractionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DistractionLog_userId_createdAt_idx" ON "DistractionLog"("userId", "createdAt");
CREATE INDEX "DistractionLog_focusSessionId_idx" ON "DistractionLog"("focusSessionId");
CREATE INDEX "DistractionLog_userId_reasonCategory_idx" ON "DistractionLog"("userId", "reasonCategory");

ALTER TABLE "DistractionLog"
ADD CONSTRAINT "DistractionLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DistractionLog"
ADD CONSTRAINT "DistractionLog_focusSessionId_fkey"
FOREIGN KEY ("focusSessionId") REFERENCES "FocusSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
