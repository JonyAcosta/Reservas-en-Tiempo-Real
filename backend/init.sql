-- Tabla de turnos u horarios disponibles
CREATE TABLE IF NOT EXISTS slots (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    capacity INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'locked', 'booked'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reservas confirmadas
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    slot_id INT NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertamos 5 turnos de prueba para hoy
INSERT INTO slots (start_time, end_time, capacity, status)
VALUES 
    (CURRENT_DATE + TIME '16:00:00', CURRENT_DATE + TIME '17:00:00', 1, 'available'),
    (CURRENT_DATE + TIME '17:00:00', CURRENT_DATE + TIME '18:00:00', 1, 'available'),
    (CURRENT_DATE + TIME '18:00:00', CURRENT_DATE + TIME '19:00:00', 1, 'available'),
    (CURRENT_DATE + TIME '19:00:00', CURRENT_DATE + TIME '20:00:00', 1, 'available'),
    (CURRENT_DATE + TIME '20:00:00', CURRENT_DATE + TIME '21:00:00', 1, 'available');