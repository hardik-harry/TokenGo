-- QueueLess Seed Data for MySQL

USE queueless_db;

-- 1. Insert Services
INSERT INTO services (id, service_name, description, average_service_time, status) VALUES
(1, 'Passport Services', 'New passport applications, renewals, and booklet modifications.', 15, 'active'),
(2, 'Aadhaar Services', 'Biometric updates, new card requests, and address corrections.', 10, 'active'),
(3, 'Driving Licence', 'Learners permit, driving license renewal, vehicle registration.', 12, 'active'),
(4, 'Certificates', 'Birth certificates, marriage registration, and income/caste certificates.', 8, 'active'),
(5, 'Land Records', 'Land title verification, mutation records, and property mapping.', 20, 'active'),
(6, 'Tax Payment', 'Property tax, commercial levies, and municipal tax payment processing.', 15, 'active');

-- 2. Insert Demo Users (Passwords hashed with pbkdf2:sha256 for 'password123')
INSERT INTO users (id, name, email, mobile, password, role) VALUES
(1, 'System Administrator', 'admin@queueless.gov', '9876543210', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'admin'),
(2, 'Officer Rajesh Kumar', 'rajesh.staff@queueless.gov', '9876543211', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'staff'),
(3, 'Officer Priya Sharma', 'priya.staff@queueless.gov', '9876543212', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'staff'),
(4, 'Officer Amit Patel', 'amit.staff@queueless.gov', '9876543213', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'staff'),
(5, 'Aarav Mehta', 'aarav@citizen.com', '9898012345', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'citizen'),
(6, 'Sneha Joshi', 'sneha@citizen.com', '9898012346', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'citizen'),
(7, 'Vikram Singh', 'vikram@citizen.com', '9898012347', 'pbkdf2:sha256:600000$8zH1J8mQ$892305a4175efbd5b42d76378ccefc611cebcab0a811c7df0e04ed9636657c32', 'citizen');

-- 3. Insert Counters
INSERT INTO counters (id, counter_name, service_id, staff_id, status) VALUES
(1, 'Counter A-101', 1, 2, 'active'),
(2, 'Counter B-201', 2, 3, 'active'),
(3, 'Counter C-301', 3, 4, 'active'),
(4, 'Counter D-401', 4, NULL, 'active'),
(5, 'Counter E-501', 5, NULL, 'active'),
(6, 'Counter F-601', 6, NULL, 'active');

-- 4. Insert Initial Demo Tokens
INSERT INTO tokens (id, token_number, user_id, service_id, counter_id, status, queue_position, estimated_wait, created_at, called_at, completed_at) VALUES
(1, 'PAS-101', 5, 1, 1, 'serving', 0, 0, NOW(), NOW(), NULL),
(2, 'PAS-102', 6, 1, NULL, 'waiting', 1, 15, NOW(), NULL, NULL),
(3, 'PAS-103', 7, 1, NULL, 'waiting', 2, 30, NOW(), NULL, NULL),
(4, 'AAD-201', 6, 2, 2, 'serving', 0, 0, NOW(), NOW(), NULL),
(5, 'DL-301', 7, 3, 3, 'waiting', 1, 12, NOW(), NULL, NULL);

-- 5. Insert Initial Notifications
INSERT INTO notifications (id, user_id, token_id, message, type, is_read, created_at) VALUES
(1, 5, 1, '🔔 Your turn is up! Please proceed to Counter A-101 for Passport Services.', 'your_turn', 0, NOW()),
(2, 6, 2, '⏳ Get Ready! Only 1 person ahead of your Token PAS-102.', 'approaching', 0, NOW());
