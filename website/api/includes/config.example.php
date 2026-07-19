<?php
// ============================================================
//  Unbinge  |  config.example.php
//  Template — copy to config.php and fill in, OR (recommended)
//  set these as environment variables in your hosting panel.
//
//  This file contains NO real secrets and is safe to commit.
// ============================================================

// -- Database (Hostinger hPanel → Databases) --
define('DB_HOST',    getenv('UB_DB_HOST')   ?: 'localhost');
define('DB_NAME',    getenv('UB_DB_NAME')   ?: 'u957077989_unbinge');
define('DB_USER',    getenv('UB_DB_USER')   ?: 'u957077989_admin');
define('DB_PASS',    getenv('UB_DB_PASS')   ?: 'YOUR_DB_PASSWORD');
define('DB_CHARSET', 'utf8mb4');

// -- Extension API key (mirror in src/shared/constants.ts) --
// Generate a random UUID at: https://www.uuidgenerator.net/
define('API_KEY',    getenv('UB_API_KEY')   ?: 'YOUR_API_KEY');

// -- Rate limiting (per IP, per endpoint) --
define('RATE_LIMIT_MAX', 10);      // max requests
define('RATE_LIMIT_WINDOW', 3600);    // per N seconds (1 hour)

// -- Session --
define('SESSION_LIFETIME', 7200);     // admin session timeout: 2 hours
define('ADMIN_SESSION_NAME', 'ub_admin_sess');
