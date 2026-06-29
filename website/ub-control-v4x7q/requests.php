<?php
// ============================================================
//  Admin: Review channel requests
// ============================================================
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/includes/db.php';
require_once __DIR__ . '/includes/layout.php';

$db  = get_db();
$msg = '';

// ---- Actions -----------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action    = $_POST['action']    ?? '';
    $channelId = $_POST['channel_id'] ?? '';
    $note      = mb_substr(strip_tags($_POST['admin_note'] ?? ''), 0, 500);
    $reviewer  = $_SESSION['admin_user'];

    if (in_array($action, ['approve', 'reject', 'needs_review'], true) && $channelId !== '') {
        $statusMap = [
            'approve'      => 'approved',
            'reject'       => 'rejected',
            'needs_review' => 'needs_review',
        ];
        $newStatus = $statusMap[$action];

        $db->prepare(
            "UPDATE requested_channels
             SET status=:s, admin_note=:n, reviewed_at=NOW(), reviewed_by=:r
             WHERE channel_id=:id"
        )->execute([':s' => $newStatus, ':n' => $note ?: null, ':r' => $reviewer, ':id' => $channelId]);

        // If approving, insert into whitelist_channels
        if ($action === 'approve') {
            $ageGroup = $_POST['age_group'] ?? 'all';
            $language = $_POST['language']  ?? 'en';
            $category = mb_substr(strip_tags($_POST['category'] ?? ''), 0, 128);

            // Fetch channel info from request row
            $req = $db->prepare(
                "SELECT channel_id, channel_name, channel_url FROM requested_channels WHERE channel_id=:id"
            );
            $req->execute([':id' => $channelId]);
            $row = $req->fetch();

            if ($row) {
                $db->prepare(
                    "INSERT INTO whitelist_channels
                       (channel_id, name, language, category, age_group, badge)
                     VALUES (:id, :name, :lang, :cat, :age, 'blue')
                     ON DUPLICATE KEY UPDATE
                       name=:name2, language=:lang2, category=:cat2,
                       age_group=:age2, is_active=1, badge='blue'"
                )->execute([
                    ':id'    => $row['channel_id'],
                    ':name'  => $row['channel_name'] ?? $row['channel_id'],
                    ':lang'  => $language,
                    ':cat'   => $category ?: null,
                    ':age'   => $ageGroup,
                    ':name2' => $row['channel_name'] ?? $row['channel_id'],
                    ':lang2' => $language,
                    ':cat2'  => $category ?: null,
                    ':age2'  => $ageGroup,
                ]);
            }
        }

        $msg = "✓ Request $channelId marked as $newStatus.";
    }
}

// ---- List --------------------------------------------------
$filter = $_GET['status'] ?? 'pending';
$valid  = ['pending', 'approved', 'rejected', 'needs_review', 'all'];
if (!in_array($filter, $valid, true)) $filter = 'pending';

$sql = "SELECT * FROM requested_channels";
$sql .= ($filter !== 'all') ? " WHERE status=:s" : "";
$sql .= " ORDER BY request_count DESC, last_requested_at DESC";

$stmt = $db->prepare($sql);
if ($filter !== 'all') $stmt->execute([':s' => $filter]);
else $stmt->execute();
$requests = $stmt->fetchAll();

admin_layout_head('Requests');
admin_topbar();
?>
<div class="container">
  <h1>Channel Requests</h1>

  <?php if ($msg): ?><div class="msg msg-success"><?= htmlspecialchars($msg) ?></div><?php endif; ?>

  <!-- Filter tabs -->
  <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
    <?php foreach (['pending'=>'Pending','needs_review'=>'Needs Review','approved'=>'Approved','rejected'=>'Rejected','all'=>'All'] as $s => $l): ?>
      <a href="?status=<?= $s ?>" class="btn <?= $filter===$s ? 'btn-blue' : 'btn-gray' ?>"><?= $l ?></a>
    <?php endforeach; ?>
  </div>

  <?php if (empty($requests)): ?>
    <div class="card"><p style="color:#64748b;font-size:13px">No requests found.</p></div>
  <?php else: ?>
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr>
        <th>Channel</th><th>URL</th><th style="text-align:right">🔥 Demand</th>
        <th>First seen</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        <?php foreach ($requests as $r):
              $badgeClass = match($r['status']) {
                  'approved'     => 'badge-approved',
                  'rejected'     => 'badge-rejected',
                  'needs_review' => 'badge-review',
                  default        => 'badge-pending',
              };
        ?>
        <tr>
          <td>
            <strong><?= htmlspecialchars($r['channel_name'] ?? '—') ?></strong><br>
            <small style="color:#64748b"><?= htmlspecialchars($r['channel_id']) ?></small>
          </td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            <a href="<?= htmlspecialchars($r['channel_url']) ?>" target="_blank" rel="noreferrer">
              <?= htmlspecialchars($r['channel_url']) ?>
            </a>
          </td>
          <td style="text-align:right;font-size:16px;font-weight:700;color:#fbbf24"><?= $r['request_count'] ?></td>
          <td style="color:#64748b;font-size:12px"><?= date('d M Y', strtotime($r['first_requested_at'])) ?></td>
          <td><span class="badge <?= $badgeClass ?>"><?= $r['status'] ?></span></td>
          <td>
            <?php if ($r['status'] === 'pending' || $r['status'] === 'needs_review'): ?>
            <details>
              <summary class="btn btn-green" style="cursor:pointer;list-style:none">✓ Approve</summary>
              <form method="post" style="margin-top:10px;background:#151823;padding:14px;border-radius:8px;min-width:260px">
                <input type="hidden" name="action" value="approve">
                <input type="hidden" name="channel_id" value="<?= htmlspecialchars($r['channel_id']) ?>">
                <div class="form-row">
                  <label>Age Group</label>
                  <select name="age_group">
                    <option value="kids">Kids ≤8</option>
                    <option value="teens" selected>Teens 9-14</option>
                    <option value="adult">Adult</option>
                    <option value="all">All ages</option>
                  </select>
                </div>
                <div class="form-row">
                  <label>Language (BCP-47)</label>
                  <input name="language" value="en" placeholder="en / hi / es">
                </div>
                <div class="form-row">
                  <label>Category</label>
                  <input name="category" placeholder="Math, Science, Programming…">
                </div>
                <div class="form-row">
                  <label>Note (optional)</label>
                  <textarea name="admin_note" rows="2" placeholder="Internal note…"></textarea>
                </div>
                <button type="submit" class="btn btn-green" style="width:100%">Confirm Approve</button>
              </form>
            </details>
            <form method="post" style="display:inline;margin-left:6px">
              <input type="hidden" name="action" value="reject">
              <input type="hidden" name="channel_id" value="<?= htmlspecialchars($r['channel_id']) ?>">
              <button type="submit" class="btn btn-red" onclick="return confirm('Reject this request?')">✕ Reject</button>
            </form>
            <?php elseif ($r['status'] === 'approved'): ?>
              <a href="whitelist.php" class="btn btn-gray">View in whitelist</a>
            <?php else: ?>
              <span style="color:#475569;font-size:12px">No actions</span>
            <?php endif; ?>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php endif; ?>
</div>
<?php admin_layout_foot(); ?>
