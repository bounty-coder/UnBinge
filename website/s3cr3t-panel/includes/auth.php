<?php
// ============================================================
//  auth.php  —  Include at top of every admin page
//  Verifies a valid PHP session exists; redirects to login
//  if not authenticated or session has timed out.
// ============================================================
require_once __DIR__ . '/../../api/includes/config.php';

session_name(ADMIN_SESSION_NAME);
session_start([
    'cookie_httponly' => true,
    'cookie_secure'   => true,     // HTTPS only
    'cookie_samesite' => 'Strict',
]);

$now = time();

// Check session validity + idle timeout
if (
    empty($_SESSION['admin_id']) ||
    empty($_SESSION['last_active']) ||
    ($now - $_SESSION['last_active']) > SESSION_LIFETIME
) {
    $_SESSION = [];
    session_destroy();
    header('Location: index.php?timeout=1');
    exit;
}

$_SESSION['last_active'] = $now;
