import { pool } from '../config/db.js';
import type { Slot, BookingResponse } from '../contracts/booking.dto.js';

export class BookingRepository {
  // Obtener todos los turnos
  async getAllSlots(): Promise<Slot[]> {
    const result = await pool.query<Slot>(
      'SELECT id, start_time, end_time, capacity, status, created_at FROM slots ORDER BY start_time ASC'
    );
    return result.rows;
  }

  // Obtener un turno por ID
  async getSlotById(slotId: number): Promise<Slot | null> {
    const result = await pool.query<Slot>(
      'SELECT id, start_time, end_time, capacity, status, created_at FROM slots WHERE id = $1',
      [slotId]
    );
    return result.rows[0] || null;
  }

  // Actualizar el estado del turno
  async updateSlotStatus(slotId: number, status: 'available' | 'locked' | 'booked'): Promise<void> {
    await pool.query('UPDATE slots SET status = $1 WHERE id = $2', [status, slotId]);
  }

  // Crear la reserva definitiva
  async createBooking(
    slotId: number,
    userName: string,
    userEmail: string
  ): Promise<BookingResponse> {
    const query = `
      INSERT INTO bookings (slot_id, user_name, user_email, status)
      VALUES ($1, $2, $3, 'confirmed')
      RETURNING id, slot_id as "slotId", user_name as "userName", user_email as "userEmail", status, created_at as "createdAt"
    `;
    const result = await pool.query<BookingResponse>(query, [slotId, userName, userEmail]);

    if (!result.rows[0]) {
      throw new Error('No se pudo registrar la reserva en la base de datos');
    }

    return result.rows[0];
    
  }
  // Obtener reservas por email de usuario (con JOIN al turno)
  async getBookingsByUserEmail(email: string): Promise<any[]> {
    const query = `
      SELECT 
        b.id, 
        b.slot_id as "slotId", 
        b.user_name as "userName", 
        b.user_email as "userEmail", 
        b.status, 
        b.created_at as "createdAt",
        s.start_time as "startTime",
        s.end_time as "endTime"
      FROM bookings b
      INNER JOIN slots s ON s.id = b.slot_id
      WHERE b.user_email = $1
      ORDER BY b.created_at DESC
    `;
    const result = await pool.query(query, [email]);
    return result.rows;
  }

  // Obtener una reserva por ID
  async getBookingById(bookingId: number): Promise<any | null> {
    const query = `
      SELECT id, slot_id as "slotId", user_name as "userName", user_email as "userEmail", status
      FROM bookings
      WHERE id = $1
    `;
    const result = await pool.query(query, [bookingId]);
    return result.rows[0] || null;
  }

  // Eliminar una reserva confirmada
  async deleteBooking(bookingId: number): Promise<void> {
    await pool.query('DELETE FROM bookings WHERE id = $1', [bookingId]);
  }
}