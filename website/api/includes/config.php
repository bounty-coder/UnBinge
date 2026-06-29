<?php
// ============================================================
//  Unbinge  |  config.php
//  NEVER commit this file. Add to .gitignore.
//  Fill in your Hostinger MySQL credentials.
// ============================================================

// -- Database (get these from Hostinger hPanel → Databases) --
define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_DB_NAME');       // e.g. u123456789_unbinge
define('DB_USER', 'YOUR_DB_USER');       // e.g. u123456789_admin
define('DB_PASS', 'YOUR_DB_PASSWORD');
define('DB_CHARSET', 'utf8mb4');

// -- Extension API key --
// Extension sends this in X-API-Key header on every request.
// Set ANY long random string here (and mirror it in constants.ts).
// Generate one at: https://www.uuidgenerator.net/
define('API_KEY', 'REPLACE_WITH_RANDOM_64_CHAR_STRING');

// -- Rate limiting (per IP, per endpoint) --
define('RATE_LIMIT_MAX',    10);      // max requests
define('RATE_LIMIT_WINDOW', 3600);    // per N seconds (1 hour)

// -- Session --
define('SESSION_LIFETIME', 7200);     // admin session timeout: 2 hours
define('ADMIN_SESSION_NAME', 'ub_admin_sess');
