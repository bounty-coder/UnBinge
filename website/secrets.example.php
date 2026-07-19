<?php
// ============================================================
//  Unbinge  |  secrets.example.php
//  TEMPLATE — copy this to website/secrets.php ON THE SERVER ONLY.
//  NEVER commit the real secrets.php. It lives outside the api/
//  folder so it cannot be downloaded via the web.
//
//  How to use on Hostinger:
//    1. Open hPanel → File Manager → public_html
//    2. Navigate into the unbinge website folder (where api/ lives)
//    3. Create a new file named: secrets.php  (in the SAME folder as
//       the api/ directory — NOT inside api/)
//    4. Paste the contents below and fill in your real values
//    5. Save. Done. config.php will auto-load it.
// ============================================================

// Database credentials (from Hostinger hPanel → Databases)
define('SECRET_DB_HOST', 'localhost');
define('SECRET_DB_NAME', 'u957077989_unbinge');
define('SECRET_DB_USER', 'u957077989_admin');
define('SECRET_DB_PASS', 'YOUR_DB_PASSWORD');

// Extension API key — MUST match VITE_EXT_API_KEY in the extension's .env
// Generate a random UUID at: https://www.uuidgenerator.net/
define('SECRET_API_KEY', 'YOUR_API_KEY');
