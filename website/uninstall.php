<?php
// Handles both page render AND form submission
header('X-Robots-Tag: noindex, nofollow');  // don't let Google index this page

$submitted  = false;
$error      = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $reason  = mb_substr(strip_tags(trim($_POST['reason']  ?? '')), 0, 100);
    $message = mb_substr(strip_tags(trim($_POST['message'] ?? '')), 0, 2000);

    try {
        require_once __DIR__ . '/api/includes/db.php';
        $db = get_db();
        $stmt = $db->prepare(
            "INSERT INTO uninstall_feedback (reason, message) VALUES (:reason, :message)"
        );
        $submitted = $stmt->execute([
            ':reason'  => $reason  ?: null,
            ':message' => $message ?: null,
        ]);
        if (!$submitted) {
            $error = true;
        }
    } catch (Exception $e) {
        error_log('Uninstall feedback db error: ' . $e->getMessage());
        $error = true;
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Goodbye — Unbinge</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<nav class="site-nav">
  <a href="index.html" class="nav-brand">Un<span>binge</span></a>
  <div class="nav-links">
    <a href="index.html">Home</a>
    <a href="install.html">Reinstall</a>
  </div>
</nav>

<section class="uninstall-hero">
  <div class="big-emoji"><?= $submitted ? '💙' : '😢' ?></div>
  <h1 style="font-size:clamp(24px,5vw,42px);font-weight:800;margin-bottom:12px">
    <?= $submitted ? 'Thank you for the feedback.' : 'Sorry to see you go.' ?>
  </h1>
  <p style="color:var(--muted);font-size:16px;max-width:480px;margin:0 auto <?= $submitted ? '0' : '36px' ?>">
    <?php if ($submitted): ?>
      Your feedback helps us make Unbinge better. If you ever want to give it another try, reinstalling takes just 2 minutes.
    <?php else: ?>
      Unbinge was removed from your browser. We'd love to know what we can improve — no email required, completely anonymous.
    <?php endif; ?>
  </p>

  <?php if ($submitted): ?>
    <div style="margin-top:32px">
      <a href="install.html" class="btn-primary">Reinstall Unbinge →</a>
    </div>
  <?php else: ?>

  <div class="feedback-form">
    <h2>Quick feedback (optional)</h2>

    <?php if ($error): ?>
      <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:12px 16px;color:#fca5a5;font-size:13px;margin-bottom:16px">
        Something went wrong submitting feedback. You can email us at <a href="mailto:hello@unbinge.watch">hello@unbinge.watch</a>.
      </div>
    <?php endif; ?>

    <form method="post">
      <div class="form-group">
        <label>Why did you uninstall?</label>
        <select name="reason">
          <option value="">— Select a reason —</option>
          <option value="too_restrictive">Too restrictive / blocks too much</option>
          <option value="not_enough_channels">Not enough channels on the whitelist</option>
          <option value="performance">Slowed down my browser</option>
          <option value="doesnt_work">Didn't work as expected</option>
          <option value="no_longer_needed">No longer needed</option>
          <option value="privacy_concerns">Privacy concerns</option>
          <option value="switched_alternative">Switched to another extension</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Anything else you'd like to tell us?</label>
        <textarea name="message" placeholder="Your thoughts help us improve…"></textarea>
      </div>
      <button type="submit" class="submit-btn">Send Feedback</button>
    </form>

    <p style="text-align:center;font-size:12px;color:var(--muted);margin-top:16px">
      Anonymous · No email needed · Takes 10 seconds
    </p>
  </div>

  <!-- Reinstall CTA -->
  <div style="margin-top:36px;text-align:center">
    <p style="color:var(--muted);font-size:14px;margin-bottom:12px">Changed your mind?</p>
    <a href="install.html" class="btn-outline">Reinstall Unbinge →</a>
  </div>

  <?php endif; ?>
</section>

<footer>
  <div class="container">
    <p>© 2025 Unbinge · <a href="mailto:hello@unbinge.watch">hello@unbinge.watch</a></p>
  </div>
</footer>

</body>
</html>
