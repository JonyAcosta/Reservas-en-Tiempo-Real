// Modelo de la entidad de base de datos
export interface Slot {
  id: number;
  start_time: Date;
  end_time: Date;
  capacity: number;
  status: 'available' | 'locked' | 'booked';
  created_at: Date;
}

// DTO para la petición de bloqueo temporal (POST /api/slots/:id/lock)
export interface LockSlotRequest {
  slotId: number;
  userId: string;
}

// DTO para la petición de confirmación definitiva (POST /api/bookings/confirm)
export interface ConfirmBookingRequest {
  slotId: number;
  userId: string;
  userName: string;
  userEmail: string;
}

// DTO de respuesta estructurada
export interface BookingResponse {
  id: number;
  slotId: number;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: Date;
}