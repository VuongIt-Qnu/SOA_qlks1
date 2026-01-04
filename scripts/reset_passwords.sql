USE auth_db;

-- Reset password for admin
UPDATE users
SET hashed_password = '$2b$12$93sFMMhrzLw041FrdM.Z7OPmeuIEOhvZGq19NWmmRvZl6V9s.5Zjq',
    is_active = TRUE,
    updated_at = NOW()
WHERE username = 'admin' OR email = 'admin@gmail.com';

-- Reset password for vuong
UPDATE users
SET hashed_password = '$2b$12$Vnx2YBIxBo6XHRjpkcuSSOoy55Tyi4v.6cJBo2a9YK9B4LbybwbTy',
    is_active = TRUE,
    updated_at = NOW()
WHERE username = 'vuong' OR email = 'vuong@gmail.com';

