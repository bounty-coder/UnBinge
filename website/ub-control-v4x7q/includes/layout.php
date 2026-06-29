<?php
function admin_layout_head(string $title): void { ?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title><?= htmlspecialchars($title) ?> | Unbinge Admin</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
  a{color:#60a5fa;text-decoration:none}
  a:hover{text-decoration:underline}
  .topbar{background:#1e2330;border-bottom:1px solid #2d3748;padding:12px 24px;display:flex;align-items:center;justify-content:space-between}
  .topbar .brand{font-weight:700;font-size:18px;color:#f8fafc;letter-spacing:-0.3px}
  .topbar .brand span{color:#60a5fa}
  .topbar nav{display:flex;gap:20px;font-size:14px}
  .topbar .logout{background:#ef4444;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:13px}
  .topbar .logout:hover{background:#dc2626}
  .container{max-width:1100px;margin:0 auto;padding:28px 20px}
  h1{font-size:22px;font-weight:700;margin-bottom:20px;color:#f8fafc}
  h2{font-size:16px;font-weight:600;margin-bottom:12px;color:#cbd5e1}
  .card{background:#1e2330;border:1px solid #2d3748;border-radius:12px;padding:20px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:10px 12px;background:#151823;color:#94a3b8;border-bottom:1px solid #2d3748;font-weight:600}
  td{padding:10px 12px;border-bottom:1px solid #1a1f2e;vertical-align:top}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#252a3a}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .badge-pending{background:#854d0e;color:#fef3c7}
  .badge-approved{background:#14532d;color:#bbf7d0}
  .badge-rejected{background:#450a0a;color:#fecaca}
  .badge-review{background:#1e3a5f;color:#bfdbfe}
  .btn{display:inline-block;padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:500}
  .btn-green{background:#16a34a;color:#fff}.btn-green:hover{background:#15803d}
  .btn-red{background:#dc2626;color:#fff}.btn-red:hover{background:#b91c1c}
  .btn-blue{background:#2563eb;color:#fff}.btn-blue:hover{background:#1d4ed8}
  .btn-gray{background:#374151;color:#d1d5db}.btn-gray:hover{background:#4b5563}
  .stat{text-align:center;padding:16px}
  .stat .num{font-size:32px;font-weight:800;color:#60a5fa}
  .stat .lbl{font-size:12px;color:#64748b;margin-top:4px}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
  .msg{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px}
  .msg-success{background:#14532d;color:#bbf7d0;border:1px solid #166534}
  .msg-error{background:#450a0a;color:#fecaca;border:1px solid #7f1d1d}
  input,select,textarea{background:#151823;border:1px solid #2d3748;color:#e2e8f0;border-radius:6px;padding:8px 12px;font-size:13px;width:100%}
  input:focus,select:focus,textarea:focus{outline:none;border-color:#3b82f6}
  label{display:block;font-size:12px;color:#94a3b8;margin-bottom:4px}
  .form-row{margin-bottom:14px}
  .demand{display:inline-flex;align-items:center;gap:4px;color:#fbbf24;font-weight:600;font-size:12px}
</style>
</head>
<body>
<?php } ?>
<?php
function admin_topbar(): void {
    $page = basename($_SERVER['PHP_SELF'], '.php');
    $links = [
        'dashboard' => 'Dashboard',
        'requests'  => 'Requests',
        'whitelist' => 'Whitelist',
        'feedback'  => 'Feedback',
    ];
    ?>
<div class="topbar">
  <span class="brand">Un<span>binge</span> Admin</span>
  <nav>
    <?php foreach ($links as $slug => $label):
        $active = ($page === $slug) ? 'style="color:#f8fafc;font-weight:600"' : '';
        ?>
      <a href="<?= $slug ?>.php" <?= $active ?>><?= $label ?></a>
    <?php endforeach; ?>
  </nav>
  <form method="post" action="logout.php">
    <button class="logout" type="submit">Logout</button>
  </form>
</div>
<?php }

function admin_layout_foot(): void { ?>
</body></html>
<?php }
