import { useEffect, useState } from 'react';
import { X, Calendar, Clock, Trash2 } from 'lucide-react';

interface BookingItem {
  id: number;
  slotId: number;
  userName: string;
  userEmail: string;
  status: string;
  startTime: string;
  endTime: string;
}

interface MyBookingsModalProps {
  userEmail: string;
  onClose: () => void;
  onBookingCancelled: () => void;
}

const BACKEND_URL = 'http://localhost:3000';

export function MyBookingsModal({ userEmail, onClose, onBookingCancelled }: MyBookingsModalProps) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/bookings?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setBookings(data);
      }
    } catch (err) {
      console.error('Error al obtener mis reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userEmail) fetchBookings();
  }, [userEmail]);

  const handleCancel = async (bookingId: number) => {
    if (!confirm('¿Estás seguro de que deseás cancelar esta reserva?')) return;

    setCancellingId(bookingId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        onBookingCancelled();
      } else {
        const error = await res.json();
        alert(error.message || 'No se pudo cancelar la reserva');
      }
    } catch (err) {
      console.error('Error al cancelar reserva:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return timeStr.slice(0, 5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Mis Reservas</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6 font-mono">
          Asociadas a: <span className="text-cyan-300">{userEmail}</span>
        </p>

        {loading ? (
          <div className="text-center py-10 text-slate-400 font-mono text-sm">Cargando reservas...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-slate-500 font-mono text-sm border border-dashed border-slate-800 rounded-xl">
            No tenés ninguna reserva activa confirmada.
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-4 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>Turno #{b.slotId}</span>
                    <span className="text-cyan-400 font-mono font-semibold ml-2">
                      {formatTime(b.startTime)} hs
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Titular: {b.userName}
                  </div>
                </div>

                <button
                  onClick={() => handleCancel(b.id)}
                  disabled={cancellingId === b.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/80 border border-rose-500/20 rounded-lg transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}