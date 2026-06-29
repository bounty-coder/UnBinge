<?php
// ============================================================
//  GET /api/whitelist.php
//  Returns approved whitelist channels as JSON.
//  Called by the extension on every sync.
//
//  Required header:  X-API-Key: <API_KEY from config.php>
//  Optional param:   ?age=kids|teens|adult|all
// ============================================================
header('Access-Control-Allow-Origin: *');   // extension needs this
header('Access-Control-Allow-Headers: X-API-Key, Content-Type');

require_once __DIR__ . '/includes/db.php';

require_method('GET');
require_api_key();

$db  = get_db();
$age = $_GET['age'] ?? 'all';

$validAges = ['kids', 'teens', 'adult', 'all'];
if (!in_array($age, $validAges, true)) $age = 'all';

// Return channels for the requested age group + 'all' tier always included
$stmt = $db->prepare(
    "SELECT channel_id, handle, name, language, category, age_group, badge
     FROM   whitelist_channels
     WHERE  is_active = 1
       AND  (age_group = :age OR age_group = 'all')
     ORDER  BY name ASC"
);
$stmt->execute([':age' => $age]);
$channels = $stmt->fetchAll();

json_response([
    'ok'       => true,
    'count'    => count($channels),
    'channels' => $channels,
]);
