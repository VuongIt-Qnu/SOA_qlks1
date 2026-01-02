-- Room Service Database Schema
-- Database: room_db

-- Create database
CREATE DATABASE IF NOT EXISTS room_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE room_db;

-- Room types table
CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_occupancy INT NOT NULL,
    amenities VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) UNIQUE NOT NULL,
    room_type_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    floor INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT,
    INDEX idx_room_number (room_number),
    INDEX idx_room_type_id (room_type_id),
    INDEX idx_status (status),
    INDEX idx_floor (floor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample room types
INSERT INTO room_types (name, description, price_per_night, max_occupancy, amenities) VALUES
('Standard', 'Phòng tiêu chuẩn với đầy đủ tiện nghi cơ bản', 500000, 2, 'WiFi, TV, Điều hòa'),
('Deluxe', 'Phòng deluxe view đẹp, tiện nghi cao cấp', 800000, 2, 'WiFi, TV, Điều hòa, Mini Bar, Ban công'),
('Suite', 'Phòng suite sang trọng, không gian rộng rãi', 1500000, 4, 'WiFi, TV, Điều hòa, Mini Bar, Phòng khách, Bếp nhỏ')
ON DUPLICATE KEY UPDATE name=name;

