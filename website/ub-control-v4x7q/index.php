<?php
// ============================================================
//  Admin Login  |  s3cr3t-panel/index.php
// ============================================================
require_once __DIR__ . '/../api/includes/config.php';
require_once __DIR__ . '/../api/includes/db.php';

session_name(ADMIN_SESSION_NAME);
$secureCookie = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
session_start([
    'cookie_httponly' => true,
    'cookie_secure'   => $secureCookie,
    'cookie_samesite' => 'Strict',
]);

// Already logged in → go to dashboard
if (!empty($_SESSION['admin_id'])) {
    header('Location: dashboard.php');
    exit;
}

$error   = '';
$timeout = !empty($_GET['timeout']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username !== '' && $password !== '') {
        $stmt = get_db()->prepare(
            'SELECT id, password_hash FROM admin_users WHERE username = :u LIMIT 1'
        );
        $stmt->execute([':u' => $username]);
        $row = $stmt->fetch();

        if ($row && password_verify($password, $row['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id']    = $row['id'];
            $_SESSION['admin_user']  = $username;
            $_SESSION['last_active'] = time();
            header('Location: dashboard.php');
            exit;
        }
    }
    // Generic error — don't reveal whether user or password was wrong
    $error = 'Invalid credentials.';
    // Small delay to slow brute force
    sleep(1);
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Admin Login | Unbinge</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#1e2330;border:1px solid #2d3748;border-radius:16px;
        padding:36px 32px;width:100%;max-width:380px}
  .brand{font-size:22px;font-weight:800;margin-bottom:24px;text-align:center}
  .brand span{color:#60a5fa}
  label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}
  input{width:100%;background:#151823;border:1px solid #2d3748;color:#e2e8f0;
        border-radius:8px;padding:10px 14px;font-size:14px;margin-bottom:16px}
  input:focus{outline:none;border-color:#3b82f6}
  button{width:100%;background:#3b82f6;color:#fff;border:none;border-radius:8px;
         padding:11px;font-size:15px;font-weight:600;cursor:pointer;margin-top:4px}
  button:hover{background:#2563eb}
  .error{background:#450a0a;color:#fecaca;border:1px solid #7f1d1d;
         border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
  .timeout{background:#1e3a5f;color:#bfdbfe;border:1px solid #1d4ed8;
           border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <div class="brand">Un<span>binge</span> Admin</div>

  <?php if ($timeout): ?>
    <div class="timeout">Session expired. Please log in again.</div>
  <?php endif; ?>

  <?php if ($error): ?>
    <div class="error"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>

  <form method="post" autocomplete="off">
    <label for="u">Username</label>
    <input id="u" name="username" type="text" required autofocus>

    <label for="p">Password</label>
    <input id="p" name="password" type="password" required>

    <button type="submit">Sign in</button>
  </form>
</div>
</body>
</html>
