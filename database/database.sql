-- SentinelIQ MySQL Database Setup & Seed
-- Target Database: sentineliq

CREATE DATABASE IF NOT EXISTS `sentineliq` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sentineliq`;

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `desc` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Viewer',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `last_active_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Cameras Table
CREATE TABLE IF NOT EXISTS `cameras` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `embed_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stream_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'youtube',
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive','offline') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `ptz` tinyint(1) NOT NULL DEFAULT '0',
  `crowd_count` int NOT NULL DEFAULT '0',
  `assigned_person` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create Stats Table
CREATE TABLE IF NOT EXISTS `stats` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `camera_id` bigint unsigned NOT NULL,
  `crowd_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stats_camera_id_foreign` (`camera_id`),
  CONSTRAINT `stats_camera_id_foreign` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create Alerts Table
CREATE TABLE IF NOT EXISTS `alerts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `camera_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('critical','high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `status` enum('open','acknowledged','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `confidence` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `alerts_camera_id_foreign` (`camera_id`),
  CONSTRAINT `alerts_camera_id_foreign` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create Demo Bookings Table
CREATE TABLE IF NOT EXISTS `demo_bookings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Create Cache & Sessions Tables for Laravel (database driver options)
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Seed Roles
INSERT INTO `roles` (`id`, `name`, `color`, `desc`, `permissions`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'bg-primary text-primary-foreground', 'Full system access', '{"Users": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Cameras": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Settings": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Dashboard": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Incidents": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Audit Logs": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Live Feeds": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Analytics": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}}', NOW(), NOW()),
(2, 'Security Manager', 'bg-[oklch(0.7_0.18_155)] text-[oklch(0.1_0.05_155)]', 'Can manage incidents & cameras', '{"Users": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Cameras": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Settings": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Dashboard": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Incidents": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Audit Logs": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Live Feeds": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}, "Analytics": {"View": true, "Create": true, "Delete": true, "Edit": true, "Export": true}}', NOW(), NOW()),
(3, 'CCTV Operator', 'bg-[oklch(0.78_0.17_75)] text-[oklch(0.1_0.05_75)]', 'View only feeds & basic alerts', '{"Users": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Cameras": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Settings": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Dashboard": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Incidents": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Audit Logs": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Live Feeds": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Analytics": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}}', NOW(), NOW()),
(4, 'HR Officer', 'bg-cyan-500 text-white', 'Monitor workplace productivity and PPE compliance', '{"Users": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Cameras": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Settings": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Dashboard": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Incidents": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Audit Logs": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Live Feeds": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Analytics": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}}', NOW(), NOW()),
(5, 'Viewer', 'bg-slate-500 text-slate-100', 'Basic public surveillance guest access', '{"Users": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Cameras": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Settings": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Dashboard": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Incidents": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Audit Logs": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Live Feeds": {"View": true, "Create": false, "Delete": false, "Edit": false, "Export": false}, "Analytics": {"View": false, "Create": false, "Delete": false, "Edit": false, "Export": false}}', NOW(), NOW())
ON DUPLICATE KEY UPDATE `color`=VALUES(`color`), `desc`=VALUES(`desc`), `permissions`=VALUES(`permissions`);

-- 11. Seed Users
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `active`, `created_at`, `updated_at`) VALUES
(1, 'Alex Rivers', 'alex.rivers@sentineliq.com', '$2y$12$R.HcrrpxU0XmNpxE4a8QpeN0pY.yJpT8u3Jg5eZ.N0D9aIq63Taq2', 'Super Admin', 1, NOW(), NOW()),
(2, 'Sarah Connor', 'sarah.connor@sentineliq.com', '$2y$12$R.HcrrpxU0XmNpxE4a8QpeN0pY.yJpT8u3Jg5eZ.N0D9aIq63Taq2', 'Security Manager', 1, NOW(), NOW()),
(3, 'John Doe', 'john.doe@sentineliq.com', '$2y$12$R.HcrrpxU0XmNpxE4a8QpeN0pY.yJpT8u3Jg5eZ.N0D9aIq63Taq2', 'CCTV Operator', 1, NOW(), NOW()),
(4, 'Emma Watson', 'emma.watson@sentineliq.com', '$2y$12$R.HcrrpxU0XmNpxE4a8QpeN0pY.yJpT8u3Jg5eZ.N0D9aIq63Taq2', 'HR Officer', 1, NOW(), NOW()),
(5, 'Guest User', 'guest@sentineliq.com', '$2y$12$R.HcrrpxU0XmNpxE4a8QpeN0pY.yJpT8u3Jg5eZ.N0D9aIq63Taq2', 'Viewer', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`), `active`=VALUES(`active`);

-- 12. Seed Cameras
INSERT INTO `cameras` (`id`, `name`, `location`, `zone`, `embed_url`, `url`, `stream_type`, `status`, `ptz`, `crowd_count`, `assigned_person`, `created_at`, `updated_at`) VALUES
(1, 'Idyllwild — Live', 'Idyllwild, California, USA', 'Crowd Management', 'https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild', 'https://www.earthcam.com/usa/california/idyllwild/?cam=idyllwild', 'earthcam', 'active', 0, 0, 'Alex Rivers', NOW(), NOW()),
(2, 'Downtown Mystic — Live', 'Mystic, Connecticut, USA', 'Crime Prevention', 'https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct', 'https://www.earthcam.com/usa/connecticut/mystic/?cam=mystic_ct', 'earthcam', 'active', 0, 0, 'Sarah Connor', NOW(), NOW()),
(3, 'Anglin\'s Square — Live', 'Lauderdale-by-the-Sea, Florida, USA', 'Crowd Management', 'https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town', 'https://www.earthcam.com/usa/florida/lauderdalebythesea/town/?cam=lbts_town', 'earthcam', 'active', 0, 0, 'John Doe', NOW(), NOW()),
(4, 'Hyden Main Street — Live', 'Hyden, Kentucky, USA', 'Crime Prevention', 'https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden', 'https://www.earthcam.com/usa/kentucky/hyden/?cam=hyden', 'earthcam', 'active', 1, 0, 'Emma Watson', NOW(), NOW())
ON DUPLICATE KEY UPDATE `assigned_person`=VALUES(`assigned_person`);

-- 13. Seed Settings
INSERT INTO `settings` (`key`, `value`, `created_at`, `updated_at`) VALUES
('alert_notifications', '{"email": true, "sms": false, "slack": true}', NOW(), NOW()),
('system_general', '{"site_name": "SentinelIQ HQ", "retention_days": 180}', NOW(), NOW())
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);
