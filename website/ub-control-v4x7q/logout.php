<?php
require_once __DIR__ . '/../api/includes/config.php';
session_name(ADMIN_SESSION_NAME);
session_start();
$_SESSION = [];
session_destroy();
header('Location: index.php');
exit;
