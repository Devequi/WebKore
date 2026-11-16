-- Preserve all existing profiles and evaluation snapshots.
ALTER TABLE `TrainingRecord` ADD COLUMN `measurementsInitialized` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `EvaluationProfile` ADD COLUMN `schemaVersion` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `legacyCriteria` JSON NULL;
ALTER TABLE `ProfileCriterion` ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'QUALITATIVE';
CREATE UNIQUE INDEX `ProfileCriterion_profileId_kind_name_key` ON `ProfileCriterion`(`profileId`, `kind`, `name`);
DROP INDEX `ProfileCriterion_profileId_name_key` ON `ProfileCriterion`;
ALTER TABLE `EvaluationCriterion` ADD COLUMN `criterionId` VARCHAR(191) NULL;
CREATE TABLE `TrainingMeasurement` (
  `id` VARCHAR(191) NOT NULL,
  `recordId` VARCHAR(191) NOT NULL,
  `criterionId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `value` INTEGER NULL,
  `order` INTEGER NOT NULL,
  UNIQUE INDEX `TrainingMeasurement_recordId_criterionId_key`(`recordId`, `criterionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `TrainingMeasurement` ADD CONSTRAINT `TrainingMeasurement_recordId_fkey`
  FOREIGN KEY (`recordId`) REFERENCES `TrainingRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
