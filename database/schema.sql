CREATE DATABASE IF NOT EXISTS smart_water_monitoring
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_water_monitoring;

CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sensor_name VARCHAR(80) NOT NULL DEFAULT 'YF-S201',
  flow_rate DECIMAL(10,3) UNSIGNED NOT NULL,
  water_usage DECIMAL(12,3) UNSIGNED NOT NULL,
  leakage_status ENUM('Normal', 'Warning', 'Possible Leakage', 'Offline') NOT NULL DEFAULT 'Normal',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_readings_created_at (created_at),
  INDEX idx_readings_status_created (leakage_status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leakage_alerts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  estimated_water_loss DECIMAL(12,3) UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('Needs review', 'Acknowledged', 'Resolved') NOT NULL DEFAULT 'Needs review',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_started_at (started_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('flow_threshold', '1.0'),
  ('continuous_flow_duration', '10'),
  ('leakage_detection_enabled', '1'),
  ('alerts_enabled', '1')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO sensor_readings (sensor_name, flow_rate, water_usage, leakage_status, created_at) VALUES
  ('YF-S201', 4.250, 2.500, 'Normal', '2026-08-27 14:30:25'),
  ('YF-S201', 4.800, 3.100, 'Normal', '2026-08-27 14:31:25'),
  ('YF-S201', 5.100, 3.500, 'Warning', '2026-08-27 14:32:25');

