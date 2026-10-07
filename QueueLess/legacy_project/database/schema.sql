-- QueueLess MySQL Schema Definition

CREATE DATABASE IF NOT EXISTS queueless_db;
USE queueless_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('citizen', 'staff', 'admin') NOT NULL DEFAULT 'citizen',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Services Table
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    average_service_time INT DEFAULT 15, -- in minutes
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_services_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Counters Table
CREATE TABLE IF NOT EXISTS counters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    counter_name VARCHAR(50) NOT NULL,
    service_id INT,
    staff_id INT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'paused'
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_counters_service (service_id),
    INDEX idx_counters_staff (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tokens Table
CREATE TABLE IF NOT EXISTS tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(20) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    counter_id INT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'serving', 'completed', 'skipped', 'cancelled'
    queue_position INT DEFAULT 0,
    estimated_wait INT DEFAULT 0, -- in minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    called_at DATETIME DEFAULT NULL,
    completed_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (counter_id) REFERENCES counters(id) ON DELETE SET NULL,
    INDEX idx_tokens_service_status (service_id, status),
    INDEX idx_tokens_user (user_id),
    INDEX idx_tokens_status (status),
    INDEX idx_tokens_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'your_turn', 'approaching', 'completed', 'warning'
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
