<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
date_default_timezone_set('Asia/Kuala_Lumpur');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$range = $_GET['range'] ?? '1h';
$allowedRanges = ['1h' => 1, '6h' => 6, '24h' => 24];
$hours = $allowedRanges[$range] ?? 1;
$database = water_database();

if ($database instanceof mysqli) {
    $cutoff = (new DateTimeImmutable("-{$hours} hours"))->format('Y-m-d H:i:s');
    $query = $database->prepare(
        'SELECT id, sensor_name, flow_rate, water_usage, leakage_status, created_at
         FROM sensor_readings WHERE created_at >= ? ORDER BY created_at ASC LIMIT 2000'
    );
    $query->bind_param('s', $cutoff);
    $query->execute();
    $result = $query->get_result();
    $readings = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['flow_rate'] = (float) $row['flow_rate'];
        $row['water_usage'] = (float) $row['water_usage'];
        $readings[] = $row;
    }

    $summaryResult = $database->query(
        "SELECT
            COALESCE((SELECT flow_rate FROM sensor_readings ORDER BY created_at DESC LIMIT 1), 0) current_flow,
            COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN water_usage ELSE 0 END), 0) today_usage,
            COALESCE(SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN water_usage ELSE 0 END), 0) month_usage,
            MAX(created_at) last_received
         FROM sensor_readings"
    );
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : [];
    echo json_encode(['source' => 'database', 'range' => $range, 'summary' => $summary, 'readings' => $readings], JSON_UNESCAPED_SLASHES);
    exit;
}

$base = new DateTimeImmutable('2026-08-27 14:32:25');
$mock = [];
for ($index = 35; $index >= 0; $index--) {
    $stamp = $base->modify("-{$index} minutes");
    $flow = max(0, 3.65 + sin($index / 3.2) * 0.85 + (($index % 6) * 0.04));
    $mock[] = [
        'id' => 1000 - $index,
        'sensor_name' => 'YF-S201',
        'flow_rate' => round($flow, 2),
        'water_usage' => round($flow / 1.7, 2),
        'leakage_status' => $index === 17 ? 'Warning' : 'Normal',
        'created_at' => $stamp->format('Y-m-d H:i:s'),
    ];
}

echo json_encode([
    'source' => 'mock',
    'range' => $range,
    'summary' => ['current_flow' => 4.25, 'today_usage' => 125.6, 'month_usage' => 2845.7, 'last_received' => '2026-08-27 14:32:25'],
    'readings' => $mock,
], JSON_UNESCAPED_SLASHES);

