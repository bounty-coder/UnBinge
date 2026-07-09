<?php
// ============================================================
//  Admin: Manage approved whitelist channels
// ============================================================
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../api/includes/db.php';
require_once __DIR__ . '/includes/layout.php';

$db  = get_db();
$msg = '';

// ---- Actions -----------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';

    if ($action === 'toggle') {
        $id      = (int)($_POST['id'] ?? 0);
        $current = (int)($_POST['current'] ?? 1);
        $db->prepare("UPDATE whitelist_channels SET is_active=:a WHERE id=:id")
           ->execute([':a' => $current ? 0 : 1, ':id' => $id]);
        $msg = $current ? '⛔ Channel disabled.' : '✓ Channel enabled.';
    }

    if ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare("DELETE FROM whitelist_channels WHERE id=:id")->execute([':id' => $id]);
        $msg = '🗑️ Channel removed from whitelist.';
    }

    if ($action === 'add') {
        $channelId = preg_replace('/[^A-Za-z0-9_\-]/', '', $_POST['channel_id'] ?? '');
        $handle    = preg_replace('/[^A-Za-z0-9_.\-]/', '', $_POST['handle'] ?? '');
        $name      = mb_substr(strip_tags($_POST['name'] ?? ''), 0, 512);
        $language  = preg_replace('/[^a-z\-]/', '', strtolower($_POST['language'] ?? 'en'));
        $category  = mb_substr(strip_tags($_POST['category'] ?? ''), 0, 128);
        $ageGroup  = $_POST['age_group'] ?? 'all';
        $badge     = $_POST['badge'] ?? 'none';

        if ($channelId && $name) {
            $db->prepare(
                "INSERT INTO whitelist_channels
                   (channel_id,handle,name,language,category,age_group,badge)
                 VALUES (:id,:h,:n,:l,:c,:a,:b)
                 ON DUPLICATE KEY UPDATE
                   handle=:h2,name=:n2,language=:l2,category=:c2,
                   age_group=:a2,badge=:b2,is_active=1"
            )->execute([
                ':id'=>$channelId,':h'=>$handle?:null,':n'=>$name,':l'=>$language,
                ':c'=>$category?:null,':a'=>$ageGroup,':b'=>$badge,
                ':h2'=>$handle?:null,':n2'=>$name,':l2'=>$language,
                ':c2'=>$category?:null,':a2'=>$ageGroup,':b2'=>$badge,
            ]);
            $msg = '✓ Channel added/updated.';
        }
    }
}

$search   = trim($_GET['q'] ?? '');
$sqlWhere = $search ? "WHERE (name LIKE :q OR handle LIKE :q2 OR channel_id LIKE :q3)" : "";
$stmt = $db->prepare(
    "SELECT * FROM whitelist_channels $sqlWhere ORDER BY name ASC"
);
if ($search) {
    $like = '%' . $search . '%';
    $stmt->execute([':q'=>$like,':q2'=>$like,':q3'=>$like]);
} else {
    $stmt->execute();
}
$channels = $stmt->fetchAll();

admin_layout_head('Whitelist');
admin_topbar();
?>
<div class="container">
  <h1>Whitelist Channels</h1>

  <?php if ($msg): ?><div class="msg msg-success"><?= htmlspecialchars($msg) ?></div><?php endif; ?>

  <!-- Add channel form -->
  <div class="card">
    <h2>➕ Add Channel Manually</h2>
    <form method="post">
      <?= csrf_input() ?>
      <input type="hidden" name="action" value="add">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div class="form-row"><label>Channel ID (UCxxxx) *</label><input name="channel_id" placeholder="UCbmNph6atAoGfqLoCL_duAg" required></div>
        <div class="form-row"><label>Handle (@name)</label><input name="handle" placeholder="TheAdityaVerma"></div>
        <div class="form-row"><label>Channel Name *</label><input name="name" placeholder="Aditya Verma" required></div>
        <div class="form-row"><label>Language</label><input name="language" value="en" placeholder="en / hi / es"></div>
        <div class="form-row"><label>Category</label><input name="category" placeholder="Programming"></div>
        <div class="form-row"><label>Age Group</label>
          <select name="age_group">
            <option value="kids">Kids ≤8</option><option value="teens" selected>Teens</option>
            <option value="adult">Adult</option><option value="all">All</option>
          </select>
        </div>
        <div class="form-row"><label>Badge</label>
          <select name="badge">
            <option value="none">None</option><option value="green">🟢 Green</option>
            <option value="golden">🟡 Golden</option><option value="blue" selected>🔵 Blue</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-blue" style="margin-top:4px">Add to Whitelist</button>
    </form>
  </div>

  <!-- Search -->
  <form method="get" style="margin-bottom:16px;display:flex;gap:10px">
    <input name="q" value="<?= htmlspecialchars($search) ?>" placeholder="Search channels…" style="max-width:320px">
    <button type="submit" class="btn btn-gray">Search</button>
    <?php if ($search): ?><a href="whitelist.php" class="btn btn-gray">Clear</a><?php endif; ?>
  </form>

  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead><tr>
        <th>Channel</th><th>Language</th><th>Category</th>
        <th>Age</th><th>Badge</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        <?php if (empty($channels)): ?>
          <tr><td colspan="7" style="color:#64748b;text-align:center;padding:24px">No channels found.</td></tr>
        <?php endif; ?>
        <?php foreach ($channels as $c): ?>
        <tr>
          <td>
            <strong><?= htmlspecialchars($c['name']) ?></strong><br>
            <small style="color:#64748b">@<?= htmlspecialchars($c['handle'] ?? '—') ?></small><br>
            <small style="color:#475569;font-size:11px"><?= htmlspecialchars($c['channel_id']) ?></small>
          </td>
          <td><?= htmlspecialchars($c['language']) ?></td>
          <td><?= htmlspecialchars($c['category'] ?? '—') ?></td>
          <td><?= $c['age_group'] ?></td>
          <td><?= match($c['badge']) {
                'green'  => '🟢',
                'golden' => '🟡',
                'blue'   => '🔵',
                default  => '—'
              } ?></td>
          <td>
            <span class="badge <?= $c['is_active'] ? 'badge-approved' : 'badge-rejected' ?>">
              <?= $c['is_active'] ? 'Active' : 'Disabled' ?>
            </span>
          </td>
          <td style="white-space:nowrap">
            <form method="post" style="display:inline">
              <?= csrf_input() ?>
              <input type="hidden" name="action" value="toggle">
              <input type="hidden" name="id" value="<?= $c['id'] ?>">
              <input type="hidden" name="current" value="<?= $c['is_active'] ?>">
              <button type="submit" class="btn <?= $c['is_active'] ? 'btn-gray' : 'btn-green' ?>">
                <?= $c['is_active'] ? '⛔ Disable' : '✓ Enable' ?>
              </button>
            </form>
            <form method="post" style="display:inline;margin-left:6px">
              <?= csrf_input() ?>
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= $c['id'] ?>">
              <button type="submit" class="btn btn-red"
                onclick="return confirm('Remove from whitelist permanently?')">🗑️</button>
            </form>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php admin_layout_foot(); ?>
