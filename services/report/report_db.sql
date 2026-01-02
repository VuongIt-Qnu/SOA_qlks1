-- Report Service Database Schema
-- Database: report_db

-- Create database
CREATE DATABASE IF NOT EXISTS report_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE report_db;

-- Reports table (for storing generated reports)
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    report_data TEXT,
    generated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_type (report_type),
    INDEX idx_generated_by (generated_by),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Report Service primarily reads data from other services
-- This table is for caching/storing generated reports if needed

