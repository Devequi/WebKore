-- Additive only. No fabricated acceptance for existing accounts.
CREATE TABLE `LegalDocument` (
 `id` VARCHAR(191) NOT NULL, `type` VARCHAR(191) NOT NULL,
 `version` VARCHAR(191) NOT NULL, `title` VARCHAR(191) NOT NULL,
 `content` JSON NOT NULL, `contentHash` CHAR(64) NOT NULL,
 `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `effectiveAt` DATETIME(3) NOT NULL, `requirementKey` VARCHAR(191) NOT NULL,
 `changeSummary` TEXT NOT NULL, `purpose` VARCHAR(191) NOT NULL DEFAULT '',
 INDEX `LegalDocument_type_effectiveAt_idx` (`type`, `effectiveAt`),
 UNIQUE INDEX `LegalDocument_type_version_key` (`type`, `version`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `LegalDecision` (
 `sequence` INTEGER NOT NULL AUTO_INCREMENT,
 `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
 `documentId` VARCHAR(191) NOT NULL, `action` VARCHAR(191) NOT NULL,
 `purpose` VARCHAR(191) NOT NULL DEFAULT '', `requestKey` VARCHAR(191) NOT NULL,
 `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `LegalDecision_userId_occurredAt_idx` (`userId`, `occurredAt`),
 UNIQUE INDEX `LegalDecision_userId_requestKey_key` (`userId`, `requestKey`), UNIQUE INDEX `LegalDecision_sequence_key` (`sequence`), PRIMARY KEY (`id`),
 CONSTRAINT `LegalDecision_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `LegalDecision_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `LegalDocument` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
