<?php
// ============================================================
//  auth.php  —  Include at top of every admin page
//  Verifies a valid PHP session exists; redirects to login
//  if not authenticated or session has timed out.
// ============================================================
require_once __DIR__ . '/../../api/includes/config.php';

session_name(ADMIN_SESSION_NAME);
$secureCookie = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
session_start([
    'cookie_httponly' => true,
    'cookie_secure'   => $secureCookie,
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

// Generate CSRF token if not exists
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/**
 * Output a hidden CSRF token input field.
 */
function csrf_input(): string {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($_SESSION['csrf_token'] ?? '') . '">';
}

/**
 * Verify CSRF token on POST requests.
 */
function verify_csrf(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['csrf_token'] ?? '';
        if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
            http_response_code(403);
            exit('CSRF token validation failed.');
        }
    }
}

