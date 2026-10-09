<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
date_default_timezone_set('Asia/Kuala_Lumpur');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'error' => 'Use POST for telemetry ingestion.']);
    exit;
}

$configuredKey = getenv('IOT_API_KEY') ?: '';
$providedKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($configuredKey !== '' && !hash_equals($configuredKey, $providedKey)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Invalid API key.']);
    exit;
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Request body must be valid JSON.']);
    exit;
}

$sensor = trim((string) ($payload['sensor_name'] ?? $payload['sensorName'] ?? 'YF-S201'));
$flow = filter_var($payload['flow_rate'] ?? $payload['flowRate'] ?? null, FILTER_VALIDATE_FLOAT);
$usage = filter_var($payload['water_usage'] ?? $payload['waterUsage'] ?? $payload['totalLitres'] ?? null, FILTER_VALIDATE_FLOAT);
$status = (string) ($payload['leakage_status'] ?? $payload['leakageStatus'] ?? 'Normal');
$allowedStatuses = ['Normal', 'Warning', 'Possible Leakage', 'Offline'];

if ($sensor === '' || $flow === false || $usage === false || $flow < 0 || $usage < 0 || !in_array($status, $allowedStatuses, true)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Provide non-negative flow_rate/water_usage and a valid leakage_status.']);
    exit;
}

$database = water_database();
if (!$database instanceof mysqli) {
    http_response_code(503);
    echo json_encode(['ok' => false, 'error' => 'Database unavailable. Import database/schema.sql and configure database credentials.']);
    exit;
}

$query = $database->prepare('INSERT INTO sensor_readings (sensor_name, flow_rate, water_usage, leakage_status) VALUES (?, ?, ?, ?)');
$query->bind_param('sdds', $sensor, $flow, $usage, $status);
if (!$query->execute()) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to store telemetry reading.']);
    exit;
}

http_response_code(201);
echo json_encode(['ok' => true, 'id' => $database->insert_id, 'received_at' => date(DATE_ATOM)]);
