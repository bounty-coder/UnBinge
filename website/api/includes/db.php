<?php
// ============================================================
//  Unbinge  |  db.php  —  PDO connection singleton
// ============================================================
require_once __DIR__ . '/config.php';

function get_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHARSET
    );
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        //Match the connection collation to the tables (created as utf8mb4_unicode_ci).
        //Without this, comparing a bound string param (general_ci) against a column (unicode_ci)
        //throws error 1267 "Illegal mix of collations".
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch (PDOException $e) {
        // Don't leak DB details — log privately, return generic error
        error_log('Unbinge DB error: ' . $e->getMessage());
        http_response_code(503);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database unavailable']);
        exit;
    }
    return $pdo;
}

// ---- Shared helpers ----------------------------------------

function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_api_key(): void {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!hash_equals(API_KEY, $key)) {
        json_response(['error' => 'Unauthorized'], 401);
    }
}

function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        json_response(['error' => 'Method not allowed'], 405);
    }
}

/**
 * Rate-limit by IP for a named endpoint.
 * Returns true if allowed, exits with 429 if exceeded.
 */
function rate_limit(string $endpoint): void {
    $db      = get_db();

    // Resolve client IP through proxy/CDN headers if available
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
        $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($parts[0]);
    }

    $ipHash  = hash('sha256', $ip);
    $window  = RATE_LIMIT_WINDOW;
    $max     = RATE_LIMIT_MAX;
    $now     = time();

    // Clean expired windows
    $db->prepare("DELETE FROM api_rate_limits
                  WHERE UNIX_TIMESTAMP(window_start) < :cutoff")
       ->execute([':cutoff' => $now - $window]);

    $stmt = $db->prepare(
        "INSERT INTO api_rate_limits (ip_hash, endpoint, hit_count, window_start)
         VALUES (:ip, :ep, 1, NOW())
         ON DUPLICATE KEY UPDATE
           hit_count = IF(UNIX_TIMESTAMP(window_start) < :cutoff2,
                          1, hit_count + 1),
           window_start = IF(UNIX_TIMESTAMP(window_start) < :cutoff3,
                             NOW(), window_start)"
    );
    $stmt->execute([
        ':ip'      => $ipHash,
        ':ep'      => $endpoint,
        ':cutoff2' => $now - $window,
        ':cutoff3' => $now - $window,
    ]);

    $row = $db->prepare(
        "SELECT hit_count FROM api_rate_limits
         WHERE ip_hash = :ip AND endpoint = :ep"
    );
    $row->execute([':ip' => $ipHash, ':ep' => $endpoint]);
    $count = (int)($row->fetchColumn() ?: 0);

    if ($count > $max) {
        header('Retry-After: ' . $window);
        json_response(['error' => 'Too many requests. Try again later.'], 429);
    }
}
