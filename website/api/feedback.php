<?php
// ============================================================
//  POST /api/feedback.php
//  Saves uninstall feedback from the leaving page.
//  Public endpoint — rate limited by IP.
//
//  Body (JSON or form):
//    reason   string  — dropdown choice
//    message  string  — optional free text
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/includes/db.php';

require_method('POST');
rate_limit('feedback');

// Accept both JSON and form submissions
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($contentType, 'application/json')) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $body = $_POST;
}

$reason  = mb_substr(strip_tags(trim($body['reason']  ?? '')), 0, 100);
$message = mb_substr(strip_tags(trim($body['message'] ?? '')), 0, 2000);

if ($reason === '' && $message === '') {
    json_response(['error' => 'Nothing to submit'], 400);
}

$db = get_db();
$stmt = $db->prepare(
    "INSERT INTO uninstall_feedback (reason, message) VALUES (:reason, :message)"
);
$stmt->execute([
    ':reason'  => $reason  ?: null,
    ':message' => $message ?: null,
]);

json_response(['ok' => true]);
