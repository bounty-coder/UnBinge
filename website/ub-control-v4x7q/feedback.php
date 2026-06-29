<?php
// Feedback viewer
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/includes/db.php';
require_once __DIR__ . '/includes/layout.php';

$db = get_db();
$rows = $db->query(
    "SELECT reason, message, submitted_at FROM uninstall_feedback ORDER BY submitted_at DESC LIMIT 200"
)->fetchAll();

// Reason counts
$counts = $db->query(
    "SELECT reason, COUNT(*) as cnt FROM uninstall_feedback GROUP BY reason ORDER BY cnt DESC"
)->fetchAll();

admin_layout_head('Feedback');
admin_topbar();
?>
<div class="container">
  <h1>Uninstall Feedback</h1>

  <div class="card">
    <h2>Reasons breakdown</h2>
    <table>
      <thead><tr><th>Reason</th><th style="text-align:right">Count</th></tr></thead>
      <tbody>
        <?php foreach ($counts as $c): ?>
        <tr>
          <td><?= htmlspecialchars($c['reason'] ?? 'No reason selected') ?></td>
          <td style="text-align:right;font-weight:700"><?= $c['cnt'] ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr><th>Date</th><th>Reason</th><th>Message</th></tr></thead>
      <tbody>
        <?php if (empty($rows)): ?>
          <tr><td colspan="3" style="color:#64748b;text-align:center;padding:24px">No feedback yet.</td></tr>
        <?php endif; ?>
        <?php foreach ($rows as $r): ?>
        <tr>
          <td style="white-space:nowrap;color:#64748b;font-size:12px">
            <?= date('d M Y H:i', strtotime($r['submitted_at'])) ?>
          </td>
          <td><?= htmlspecialchars($r['reason'] ?? '—') ?></td>
          <td style="max-width:320px"><?= nl2br(htmlspecialchars($r['message'] ?? '')) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php admin_layout_foot(); ?>
