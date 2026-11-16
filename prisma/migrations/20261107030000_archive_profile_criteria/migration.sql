-- Removed criteria keep their identity, type and profile for historical references.
ALTER TABLE `ProfileCriterion` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `ProfileCriterion_profileId_kind_archived_idx` ON `ProfileCriterion`(`profileId`, `kind`, `archived`);
DROP INDEX `ProfileCriterion_profileId_kind_name_key` ON `ProfileCriterion`;
