-- AlterTable
ALTER TABLE `Training` MODIFY `type` ENUM('PHYSICAL', 'COLLECTIVE', 'MIXED', 'MATCH') NOT NULL;

-- AlterTable
ALTER TABLE `TrainingRecord` ADD COLUMN `modalitySnapshot` VARCHAR(191) NULL,
    ADD COLUMN `positionSnapshot` VARCHAR(191) NULL,
    ADD COLUMN `roleSnapshot` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Evaluation` ADD COLUMN `finalScore` DOUBLE NULL,
    ADD COLUMN `modality` VARCHAR(191) NULL,
    ADD COLUMN `position` VARCHAR(191) NULL,
    ADD COLUMN `role` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'LEGACY';

-- CreateTable
CREATE TABLE `EvaluationProfile` (
    `id` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `modality` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `EvaluationProfile_teamId_modality_role_key`(`teamId`, `modality`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileCriterion` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `order` INTEGER NOT NULL,

    UNIQUE INDEX `ProfileCriterion_profileId_name_key`(`profileId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EvaluationCriterion` (
    `id` VARCHAR(191) NOT NULL,
    `evaluationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `score` DOUBLE NOT NULL,
    `order` INTEGER NOT NULL,

    UNIQUE INDEX `EvaluationCriterion_evaluationId_name_key`(`evaluationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalkeeperStats` (
    `id` VARCHAR(191) NOT NULL,
    `recordId` VARCHAR(191) NOT NULL,
    `saves` INTEGER NULL,
    `goalsConceded` INTEGER NULL,
    `shotsOnTarget` INTEGER NULL,
    `difficultSaves` INTEGER NULL,
    `accurateDistributions` INTEGER NULL,
    `distributionAttempts` INTEGER NULL,
    `successfulExits` INTEGER NULL,
    `exitAttempts` INTEGER NULL,

    UNIQUE INDEX `GoalkeeperStats_recordId_key`(`recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EvaluationProfile` ADD CONSTRAINT `EvaluationProfile_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProfileCriterion` ADD CONSTRAINT `ProfileCriterion_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `EvaluationProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvaluationCriterion` ADD CONSTRAINT `EvaluationCriterion_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `Evaluation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalkeeperStats` ADD CONSTRAINT `GoalkeeperStats_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `TrainingRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
