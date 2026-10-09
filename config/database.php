<?php
declare(strict_types=1);

/**
 * Returns a MySQL connection when configured, otherwise null so the dashboard
 * can continue in prototype/mock mode. Configure with DB_HOST, DB_PORT,
 * DB_NAME, DB_USER and DB_PASS environment variables.
 */
function water_database(): ?mysqli
{
    if (!extension_loaded('mysqli')) {
        return null;
    }

    mysqli_report(MYSQLI_REPORT_OFF);
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = (int) (getenv('DB_PORT') ?: 3306);
    $name = getenv('DB_NAME') ?: 'smart_water_monitoring';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: '';

    $database = @new mysqli($host, $user, $pass, $name, $port);
    if ($database->connect_errno) {
        return null;
    }

    $database->set_charset('utf8mb4');
    return $database;
}

