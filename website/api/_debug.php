<?php
// ============================================================
//  TEMPORARY DEBUG SCRIPT  —  DELETE AFTER USE
//  Visit:  https://unbinge.watch/api/_debug.php?key=letmein
//  It surfaces DB errors that the real endpoints hide.
// ============================================================

// Simple guard so randoms can't hit it. Change the value.
if (($_GET['key'] ?? '') !== 'letmein') {
    http_response_code(403);
    exit('Forbidden');
}

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/includes/config.php';

echo "== Config ==\n";
echo 'DB_HOST : ' . DB_HOST . "\n";
echo 'DB_NAME : ' . DB_NAME . "\n";
echo 'DB_USER : ' . DB_USER . "\n";
echo 'API_KEY set?: ' . (str_starts_with(API_KEY, 'REPLACE_') ? 'NO — still placeholder!' : 'yes') . "\n\n";

// ---- 1. Raw PDO connection (bypasses get_db's error hiding) ----
echo "== DB connection ==\n";
try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    echo "OK — connected.\n\n";
} catch (Throwable $e) {
    echo 'CONNECTION FAILED: ' . $e->getMessage() . "\n";
    exit;
}

// ---- 2. Check tables exist ----
echo "== Tables ==\n";
foreach (['whitelist_channels', 'requested_channels', 'uninstall_feedback', 'admin_users', 'api_rate_limits'] as $t) {
    try {
        $n = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
        echo str_pad($t, 22) . " OK ($n rows)\n";
    } catch (Throwable $e) {
        echo str_pad($t, 22) . ' MISSING/ERROR: ' . $e->getMessage() . "\n";
    }
}
echo "\n";

// ---- 3. Run the EXACT request-channel insert with test data ----
echo "== Test insert into requested_channels ==\n";
try {
    $channelId  = 'url_debug_' . substr(hash('sha256', (string)time()), 0, 16);
    $channelUrl = 'https://youtube.com/@debugtest';
    $channelName = 'Debug Test';

    $stmt = $pdo->prepare(
        "INSERT INTO requested_channels
           (channel_id, channel_url, channel_name, request_count)
         VALUES
           (:id, :url, :name, 1)
         ON DUPLICATE KEY UPDATE
           request_count     = request_count + 1,
           last_requested_at = NOW(),
           channel_name = IF(:name_check <> '' AND channel_name IS NULL, :name_new, channel_name),
           channel_url  = IF(:url_check <> channel_url, :url_new, channel_url)"
    );
    $stmt->execute([
        ':id'         => $channelId,
        ':url'        => $channelUrl,
        ':name'       => $channelName ?: null,
        ':name_check' => $channelName,
        ':name_new'   => $channelName,
        ':url_check'  => $channelUrl,
        ':url_new'    => $channelUrl,
    ]);
    echo "INSERT OK — the fixed query works against your DB.\n";
    echo "(You can delete this test row: DELETE FROM requested_channels WHERE channel_id='$channelId';)\n";
} catch (Throwable $e) {
    echo 'INSERT FAILED: ' . $e->getMessage() . "\n";
}

echo "\n== DONE — delete this file when finished. ==\n";
