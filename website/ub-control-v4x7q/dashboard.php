<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/includes/db.php';
require_once __DIR__ . '/includes/layout.php';

$db = get_db();

// ---- Stats -------------------------------------------------
$stats = [];
foreach ([
    'total_whitelist'  => "SELECT COUNT(*) FROM whitelist_channels WHERE is_active=1",
    'pending_requests' => "SELECT COUNT(*) FROM requested_channels WHERE status='pending'",
    'total_requests'   => "SELECT COUNT(*) FROM requested_channels",
    'total_feedback'   => "SELECT COUNT(*) FROM uninstall_feedback",
] as $key => $sql) {
    $stats[$key] = (int)$db->query($sql)->fetchColumn();
}

// ---- Top pending by demand ---------------------------------
$topPending = $db->query(
    "SELECT channel_id, channel_name, channel_url, request_count
     FROM   requested_channels
     WHERE  status = 'pending'
     ORDER  BY request_count DESC
     LIMIT  5"
)->fetchAll();

admin_layout_head('Dashboard');
admin_topbar();
?>
<div class="container">
  <h1>Dashboard</h1>

  <div class="stats-grid">
    <div class="card stat"><div class="num"><?= $stats['total_whitelist'] ?></div><div class="lbl">Approved Channels</div></div>
    <div class="card stat"><div class="num"><?= $stats['pending_requests'] ?></div><div class="lbl">Pending Requests</div></div>
    <div class="card stat"><div class="num"><?= $stats['total_requests'] ?></div><div class="lbl">Total Requests</div></div>
    <div class="card stat"><div class="num"><?= $stats['total_feedback'] ?></div><div class="lbl">Uninstall Feedback</div></div>
  </div>

  <div class="card">
    <h2>🔥 Top Pending Requests (by demand)</h2>
    <?php if (empty($topPending)): ?>
      <p style="color:#64748b;font-size:13px">No pending requests.</p>
    <?php else: ?>
      <table>
        <thead><tr><th>Channel</th><th>URL</th><th style="text-align:right">Requests</th><th></th></tr></thead>
        <tbody>
          <?php foreach ($topPending as $r): ?>
          <tr>
            <td><?= htmlspecialchars($r['channel_name'] ?? $r['channel_id']) ?></td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              <a href="<?= htmlspecialchars($r['channel_url']) ?>" target="_blank" rel="noreferrer"><?= htmlspecialchars($r['channel_url']) ?></a>
            </td>
            <td style="text-align:right"><span class="demand">🔥 <?= $r['request_count'] ?></span></td>
            <td><a href="requests.php" class="btn btn-blue" style="font-size:12px;padding:4px 10px">Review</a></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</div>
<?php admin_layout_foot(); ?>
