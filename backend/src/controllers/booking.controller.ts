import { io } from '../index.js';
import type { Request, Response } from 'express';
import { BookingService } from '../services/booking.services.js';

const bookingService = new BookingService();

export class BookingController {
  // GET /api/slots
  static async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const slots = await bookingService.getAvailableSlots();
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  // POST /api/slots/:id/lock
  static async lock(req: Request, res: Response): Promise<void> {
    try {
      const slotId = Number(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'El userId es obligatorio' });
        return;
      }

      // Callback al expirar el TTL
      const locked = await bookingService.lockSlot(slotId, userId, () => {
        io.emit('slot:unlocked', { slotId });
      });

      if (!locked) {
        res.status(409).json({ message: 'El turno ya está bloqueado o reservado' });
        return;
      }

      io.emit('slot:locked', { slotId, userId });

      res.json({ 
        message: 'Turno bloqueado temporalmente', 
        slotId, 
        userId,
        ttlSeconds: bookingService.getLockTtl()
      });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  // POST /api/slots/:id/unlock
  static async unlock(req: Request, res: Response): Promise<void> {
    try {
      const slotId = Number(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ message: 'El userId es obligatorio' });
        return;
      }

      const unlocked = await bookingService.unlockSlot(slotId, userId);

      if (!unlocked) {
        res.status(400).json({ message: 'El turno no estaba bloqueado o ya expiró' });
        return;
      }

      io.emit('slot:unlocked', { slotId });

      res.json({ message: 'Turno liberado con éxito', slotId });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  // POST /api/bookings/confirm
  static async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { slotId, userId, userName, userEmail } = req.body;

      if (!slotId || !userId || !userName || !userEmail) {
        res.status(400).json({ message: 'Faltan campos obligatorios' });
        return;
      }

      const booking = await bookingService.confirmBooking({
        slotId: Number(slotId),
        userId,
        userName,
        userEmail,
      });

      io.emit('slot:booked', { slotId, bookingId: booking.id });

      res.status(201).json({ message: 'Reserva confirmada con éxito', booking });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  // GET /api/bookings?email=...
  static async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      const email = req.query.email as string;

      if (!email) {
        res.status(400).json({ message: 'El parámetro email es obligatorio' });
        return;
      }

      const bookings = await bookingService.getUserBookings(email);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }

  // POST /api/bookings/:id/cancel
  static async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const bookingId = Number(req.params.id);
      const { userEmail } = req.body;

      if (!userEmail) {
        res.status(400).json({ message: 'El email es obligatorio para cancelar' });
        return;
      }

      const { slotId } = await bookingService.cancelConfirmedBooking(bookingId, userEmail);

      // Notificamos por WebSocket que el turno vuelve a estar disponible
      io.emit('slot:unlocked', { slotId });

      res.json({ message: 'Reserva cancelada correctamente', slotId });
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  }

  static async reset(req: Request, res: Response): Promise<void> {
    try {
      await bookingService.resetAll();
      io.emit('slots:reset');
      res.json({ message: 'Todos los turnos fueron reseteados' });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  }
}