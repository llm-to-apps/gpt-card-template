-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'viewer',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardProfile` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NULL,
    `onboardingStep` ENUM('PHOTO', 'PROFILE', 'EXPERTISE', 'RESULTS', 'COLLABORATION', 'AVAILABILITY', 'COMPLETE') NOT NULL DEFAULT 'PHOTO',
    `onboardingCompletedAt` DATETIME(3) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `photoStorageKey` VARCHAR(191) NULL,
    `age` INTEGER NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactWhatsApp` VARCHAR(191) NULL,
    `contactTelegram` VARCHAR(191) NULL,
    `contactWebsite` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `timeZone` VARCHAR(191) NOT NULL DEFAULT 'Europe/Berlin',
    `firstDayOfWeek` INTEGER NOT NULL DEFAULT 1,
    `showAvailability` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CardProfile_ownerUserId_idx`(`ownerUserId`),
    INDEX `CardProfile_onboardingStep_idx`(`onboardingStep`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardProfileTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `professionalProfile` TEXT NULL,
    `expertise` TEXT NULL,
    `casesAndResults` TEXT NULL,
    `experienceAndAchievements` TEXT NULL,
    `collaborationFormats` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CardProfileTranslation_locale_idx`(`locale`),
    UNIQUE INDEX `CardProfileTranslation_profileId_locale_key`(`profileId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AvailabilitySlot` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `price` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AvailabilitySlot_profileId_idx`(`profileId`),
    INDEX `AvailabilitySlot_weekday_idx`(`weekday`),
    UNIQUE INDEX `AvailabilitySlot_profileId_weekday_startTime_endTime_key`(`profileId`, `weekday`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Exception` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Exception_profileId_idx`(`profileId`),
    UNIQUE INDEX `Exception_profileId_date_key`(`profileId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsultationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `requestedStartAt` DATETIME(3) NOT NULL,
    `requestedEndAt` DATETIME(3) NOT NULL,
    `visitorName` VARCHAR(191) NOT NULL,
    `visitorEmail` VARCHAR(191) NOT NULL,
    `visitorPhone` VARCHAR(191) NOT NULL,
    `requestDescription` TEXT NOT NULL,
    `status` ENUM('NEW', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ConsultationRequest_profileId_idx`(`profileId`),
    INDEX `ConsultationRequest_requestedStartAt_idx`(`requestedStartAt`),
    INDEX `ConsultationRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NULL,
    `metadata` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_action_idx`(`action`),
    INDEX `AuditEvent_userId_idx`(`userId`),
    INDEX `AuditEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardProfileTranslation` ADD CONSTRAINT `CardProfileTranslation_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CardProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AvailabilitySlot` ADD CONSTRAINT `AvailabilitySlot_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CardProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Exception` ADD CONSTRAINT `Exception_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CardProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsultationRequest` ADD CONSTRAINT `ConsultationRequest_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `CardProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

