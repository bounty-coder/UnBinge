-- ============================================================
--  Unbinge  |  unbinge.watch  |  MySQL 8.x Schema
--  Run this once in Hostinger phpMyAdmin or via CLI
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- 1. Approved whitelist channels (served to extension on sync)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whitelist_channels (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel_id    VARCHAR(64)  NOT NULL COMMENT 'YouTube UC... channel ID',
  handle        VARCHAR(128) DEFAULT NULL COMMENT '@handle without the @',
  name          VARCHAR(512) NOT NULL,
  language      VARCHAR(8)   NOT NULL DEFAULT 'en' COMMENT 'BCP-47 code: en, hi, es, pt …',
  category      VARCHAR(128) DEFAULT NULL COMMENT 'e.g. Science, Math, Programming',
  age_group     ENUM('kids','teens','adult','all') NOT NULL DEFAULT 'all',
  badge         ENUM('none','green','golden','blue') NOT NULL DEFAULT 'none' COMMENT 'Globally verified badge colour',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  added_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_channel_id (channel_id),
  KEY idx_age_active (age_group, is_active),
  KEY idx_language   (language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Channel requests from extension users
--    Dedup by channel_id — only ONE row per channel.
--    request_count increments on each duplicate submission.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requested_channels (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel_id           VARCHAR(64)  NOT NULL COMMENT 'YouTube UC... (resolved on submission)',
  channel_url          VARCHAR(512) NOT NULL COMMENT 'Original URL the user pasted',
  channel_name         VARCHAR(512) DEFAULT NULL COMMENT 'Display name if resolvable',
  request_count        INT UNSIGNED NOT NULL DEFAULT 1,
  first_requested_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status               ENUM('pending','needs_review','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_note           TEXT DEFAULT NULL,
  reviewed_at          TIMESTAMP NULL DEFAULT NULL,
  reviewed_by          VARCHAR(128) DEFAULT NULL COMMENT 'admin username',

  UNIQUE KEY uq_channel_id (channel_id),
  KEY idx_status_count (status, request_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Uninstall feedback
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uninstall_feedback (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reason       VARCHAR(100) DEFAULT NULL COMMENT 'Dropdown choice',
  message      TEXT DEFAULT NULL COMMENT 'Optional free text',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_reason (reason),
  KEY idx_date   (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Admin users (bcrypt hashed passwords)
--    Insert a row here to create your admin account.
--    Use PHP's password_hash($pass, PASSWORD_BCRYPT) to generate hash.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt via password_hash()',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. IP-based rate limiting (no Redis required)
--    Cleaned up automatically by PHP on each request.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_hash     CHAR(64) NOT NULL COMMENT 'SHA-256 of IP (never store raw IP)',
  endpoint    VARCHAR(64) NOT NULL COMMENT 'e.g. request-channel',
  hit_count   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_ip_endpoint (ip_hash, endpoint),
  KEY idx_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Seed: create default admin  (CHANGE PASSWORD IMMEDIATELY)
--  Hash below = bcrypt of "changeme123" — update via admin UI
-- ============================================================
INSERT IGNORE INTO admin_users (username, password_hash)
VALUES ('admin', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ============================================================
--  Seed: example whitelisted channel (Aditya Verma)
-- ============================================================
INSERT IGNORE INTO whitelist_channels
  (channel_id, handle, name, language, category, age_group, badge)
VALUES
  ('UCbmNph6atAoGfqLoCL_duAg', 'TheAdityaVerma', 'Aditya Verma',
   'hi', 'Programming', 'teens', 'blue');
