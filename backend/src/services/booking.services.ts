import { redis } from '../config/redis.js';
import { pool } from '../config/db.js';
import { BookingRepository } from '../repositories/booking.repository.js';
import type { Slot, BookingResponse, ConfirmBookingRequest } from '../contracts/booking.dto.js';

export class BookingService {
  private repository: BookingRepository;
  // Cambiá este valor cuando quieras (para pruebas rápidas, 300 para 5 minutos)
  private readonly LOCK_TTL_SECONDS = 60; 
  private lockTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor() {
    this.repository = new BookingRepository();
  }

  // Permite al controlador conocer el tiempo configurado
  getLockTtl(): number {
    return this.LOCK_TTL_SECONDS;
  }

  async getAvailableSlots(): Promise<Slot[]> {
    return await this.repository.getAllSlots();
  }

  async lockSlot(slotId: number, userId: string, onExpired?: () => void): Promise<boolean> {
    const slot = await this.repository.getSlotById(slotId);

    if (!slot || slot.status === 'booked') {
      throw new Error('El turno no está disponible o ya fue confirmado');
    }

    const lockKey = `lock:slot:${slotId}`;
    const acquired = await redis.set(lockKey, userId, 'EX', this.LOCK_TTL_SECONDS, 'NX');

    if (!acquired) {
      return false;
    }

    // Actualizamos en BD a 'locked'
    await this.repository.updateSlotStatus(slotId, 'locked');

    // Si había un temporizador previo para este slot, lo limpiamos
    if (this.lockTimers.has(slotId)) {
      clearTimeout(this.lockTimers.get(slotId)!);
    }

    // Programamos la liberación automática al vencer el tiempo
    const timer = setTimeout(async () => {
      try {
        const currentSlot = await this.repository.getSlotById(slotId);
        // Solo lo liberamos si sigue en 'locked' (no si ya pasó a 'booked')
        if (currentSlot && currentSlot.status === 'locked') {
          await this.repository.updateSlotStatus(slotId, 'available');
          await redis.del(lockKey);
          if (onExpired) onExpired();
        }
      } catch (err) {
        console.error('Error al expirar lock:', err);
      } finally {
        this.lockTimers.delete(slotId);
      }
    }, this.LOCK_TTL_SECONDS * 1000);

    this.lockTimers.set(slotId, timer);
    return true;
  }

  /**
   * Libera voluntariamente un turno bloqueado antes de que expire el TTL
   */
  async unlockSlot(slotId: number, userId: string): Promise<boolean> {
    const lockKey = `lock:slot:${slotId}`;
    const lockedBy = await redis.get(lockKey);

    // Si no está bloqueado o ya expiró
    if (!lockedBy) {
      return false;
    }

    // Validación de seguridad: solo quien lo bloqueó puede liberarlo voluntariamente
    if (lockedBy !== userId) {
      throw new Error('No tenés permisos para liberar este turno');
    }

    // 1. Cancelamos el temporizador en memoria
    if (this.lockTimers.has(slotId)) {
      clearTimeout(this.lockTimers.get(slotId)!);
      this.lockTimers.delete(slotId);
    }

    // 2. Eliminamos la clave en Redis
    await redis.del(lockKey);

    // 3. Volvemos el estado a 'available' en PostgreSQL
    await this.repository.updateSlotStatus(slotId, 'available');

    return true;
  }

  async confirmBooking(data: ConfirmBookingRequest): Promise<BookingResponse> {
    const lockKey = `lock:slot:${data.slotId}`;
    const lockedBy = await redis.get(lockKey);

    if (!lockedBy || lockedBy !== data.userId) {
      throw new Error('El bloqueo expiró o pertenece a otro usuario');
    }

    // Cancelamos el timer para que no se ejecute después de confirmar
    if (this.lockTimers.has(data.slotId)) {
      clearTimeout(this.lockTimers.get(data.slotId)!);
      this.lockTimers.delete(data.slotId);
    }

    const booking = await this.repository.createBooking(
      data.slotId,
      data.userName,
      data.userEmail
    );

    await this.repository.updateSlotStatus(data.slotId, 'booked');
    await redis.del(lockKey);

    return booking;
  }

  async resetAll(): Promise<void> {
    // Limpiamos todos los timers activos
    for (const timer of this.lockTimers.values()) {
      clearTimeout(timer);
    }
    this.lockTimers.clear();

    await pool.query('TRUNCATE TABLE bookings CASCADE;');
    await pool.query("UPDATE slots SET status = 'available';");
    await redis.flushall();
  }
}