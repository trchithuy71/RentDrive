-- RentDrive Database Schema

CREATE SCHEMA IF NOT EXISTS rentdrive;

-- Users table (profiles matched to wallet addresses)
CREATE TABLE IF NOT EXISTS rentdrive.users (
    address VARCHAR(42) PRIMARY KEY,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'renter', -- 'renter', 'owner', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS rentdrive.vehicles (
    id SERIAL PRIMARY KEY,
    contract_id BIGINT UNIQUE,
    owner VARCHAR(42) NOT NULL REFERENCES rentdrive.users(address),
    plate_number VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    image_url TEXT,
    base_rate_per_hour NUMERIC(18, 6) DEFAULT 0, -- USDC
    rate_per_km NUMERIC(18, 6) DEFAULT 0,        -- USDC
    speed_limit_kmh INT DEFAULT 100,
    speed_penalty_usdc NUMERIC(18, 6) DEFAULT 0,  -- USDC
    deposit_required NUMERIC(18, 6) NOT NULL,     -- USDC
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rentals table
CREATE TABLE IF NOT EXISTS rentdrive.rentals (
    id SERIAL PRIMARY KEY,
    contract_id BIGINT UNIQUE,
    vehicle_id INT NOT NULL REFERENCES rentdrive.vehicles(id),
    renter VARCHAR(42) NOT NULL REFERENCES rentdrive.users(address),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    start_odometer NUMERIC(12, 2) DEFAULT 0, -- Odometer in meters
    current_odometer NUMERIC(12, 2) DEFAULT 0,
    escrow_balance NUMERIC(18, 6) NOT NULL,
    speed_penalties_accrued NUMERIC(18, 6) DEFAULT 0,
    distance_charges_accrued NUMERIC(18, 6) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Completed', 'Disputed', 'Resolved'
    crash_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry logs (simulating OBD-II IoT data streams)
CREATE TABLE IF NOT EXISTS rentdrive.telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id INT NOT NULL REFERENCES rentdrive.rentals(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    speed NUMERIC(5, 2) NOT NULL,      -- in km/h
    odometer NUMERIC(12, 2) NOT NULL,  -- in meters
    crash_sensor BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle_id ON rentdrive.rentals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter ON rentdrive.rentals(renter);
CREATE INDEX IF NOT EXISTS idx_telemetry_rental_id ON rentdrive.telemetry_logs(rental_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON rentdrive.telemetry_logs(recorded_at DESC);
