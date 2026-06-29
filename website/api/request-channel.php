<?php
// ============================================================
//  POST /api/request-channel.php
//  Submits a channel request from the extension.
//  Deduped by channel_id — request_count increments on repeat.
//
//  Required header:  X-API-Key: <API_KEY>
//  Body (JSON):
//    channel_url   string  required  — URL the user pasted
//    channel_id    string  optional  — UC... ID if resolvable
//    channel_name  string  optional  — display name
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: X-API-Key, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/includes/db.php';

require_method('POST');
require_api_key();
rate_limit('request-channel');

$body = json_decode(file_get_contents('php://input'), true) ?? [];

$channelUrl  = trim($body['channel_url']  ?? '');
$channelId   = trim($body['channel_id']   ?? '');
$channelName = trim($body['channel_name'] ?? '');

if ($channelUrl === '') {
    json_response(['error' => 'channel_url is required'], 400);
}

// Sanitize
$channelUrl  = filter_var($channelUrl,  FILTER_SANITIZE_URL);
$channelName = mb_substr(strip_tags($channelName), 0, 512);
$channelId   = preg_replace('/[^A-Za-z0-9_\-]/', '', $channelId);

// If no channel_id provided, derive a stable key from the URL
// so we can still dedup (will be enriched by admin later)
if ($channelId === '') {
    $channelId = 'url_' . hash('sha256', strtolower($channelUrl));
}

$db = get_db();

$stmt = $db->prepare(
    "INSERT INTO requested_channels
       (channel_id, channel_url, channel_name, request_count)
     VALUES
       (:id, :url, :name, 1)
     ON DUPLICATE KEY UPDATE
       request_count    = request_count + 1,
       last_requested_at = NOW(),
       -- Update name/URL if richer data arrives later
       channel_name = IF(:name2 <> '' AND channel_name IS NULL, :name2, channel_name),
       channel_url  = IF(:url2 <> channel_url, :url2, channel_url)"
);

$stmt->execute([
    ':id'    => $channelId,
    ':url'   => $channelUrl,
    ':name'  => $channelName ?: null,
    ':name2' => $channelName,
    ':url2'  => $channelUrl,
]);

json_response(['ok' => true, 'message' => 'Request received. Thank you!']);
