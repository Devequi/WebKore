ALTER TABLE `User` DROP COLUMN `age`,
    ADD COLUMN `birthDate` DATETIME(3) NULL;

ALTER TABLE `Team` ADD COLUMN `objectiveCriteria` JSON NULL,
    ADD COLUMN `qualitativeCriteria` JSON NULL;
