import { useEffect, useState } from 'react';
import { socket } from './socket';
import type { Slot } from './types';
import { Clock, Lock, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BookingModal } from './booking.modal';

const BACKEND_URL = 'http://localhost:3000';
// Identificador único para esta pestaña/sesión
const USER_ID = `user_${Math.random().toString(36).substring(2, 9)}`;

export default function App() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lockTtl, setLockTtl] = useState(7); // Duración sincronizada dinámicamente con el backend
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Cargar estado inicial de los turnos desde la API REST
  const fetchSlots = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/slots`);
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error('Error al cargar turnos:', err);
    }
  };

  useEffect(() => {
    fetchSlots();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Evento en tiempo real: alguien bloqueó un turno
    socket.on('slot:locked', ({ slotId, userId }: { slotId: number; userId: string }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'locked', lockedByMe: userId === USER_ID } : s))
      );
    });

    // Evento en tiempo real: turno reservado definitivamente
    socket.on('slot:booked', ({ slotId }: { slotId: number }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'booked', lockedByMe: false } : s))
      );
      setSelectedSlot((curr) => (curr?.id === slotId ? null : curr));
    });

    // Evento en tiempo real: el bloqueo venció o se liberó voluntariamente
    socket.on('slot:unlocked', ({ slotId }: { slotId: number }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'available', lockedByMe: false } : s))
      );
      setSelectedSlot((curr) => (curr?.id === slotId ? null : curr));
    });

    // Evento en tiempo real: reset global
    socket.on('slots:reset', () => {
      fetchSlots();
      setSelectedSlot(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('slot:locked');
      socket.off('slot:booked');
      socket.off('slot:unlocked');
      socket.off('slots:reset');
    };
  }, []); // Array vacío para mantener la suscripción a los sockets estable y sin interrupciones

  // Al hacer clic en una tarjeta disponible -> Disparar bloqueo atómico en Redis
  const handleSlotClick = async (slot: Slot) => {
    if (slot.status !== 'available') return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/slots/${slot.id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ttlSeconds) {
          setLockTtl(data.ttlSeconds);
        }
        setSelectedSlot(slot);
      } else {
        alert('Este turno ya fue tomado o está en proceso por otra persona');
      }
    } catch (err) {
      console.error('Error al bloquear turno:', err);
    }
  };

  // 🔓 Cancelación manual: actualiza el estado local al instante y avisa al backend
  const handleCancelBooking = async () => {
    if (!selectedSlot) return;

    const slotIdToUnlock = selectedSlot.id;

    // Actualización inmediata en la pantalla actual
    setSelectedSlot(null);
    setSlots((prev) =>
      prev.map((s) => (s.id === slotIdToUnlock ? { ...s, status: 'available', lockedByMe: false } : s))
    );

    try {
      await fetch(`${BACKEND_URL}/api/slots/${slotIdToUnlock}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID }),
      });
    } catch (err) {
      console.error('Error al liberar turno:', err);
    }
  };

  // Confirmar reserva en PostgreSQL
  const handleConfirmBooking = async (name: string, email: string) => {
    if (!selectedSlot) return;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/bookings/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          userId: USER_ID,
          userName: name,
          userEmail: email,
        }),
      });

      if (res.ok) {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#34d399'],
        });
        setSelectedSlot(null);
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'No se pudo confirmar la reserva');
      }
    } catch (err) {
      console.error('Error al confirmar reserva:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset rápido para pruebas
  const handleReset = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/slots/reset`, { method: 'POST' });
    } catch (err) {
      console.error('Error al resetear:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center p-6 relative overflow-hidden">
      {/* Luces de fondo */}
      <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[15%] w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between py-6 border-b border-slate-800/80 mb-10 z-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            Reservas Concurrentes <Sparkles className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Node.js · PostgreSQL · Redis Lock · Socket.io
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-300 font-mono">{connected ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all"
            title="Resetear estados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      {/* Grilla de turnos */}
      <main className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 z-10">
        {slots.map((slot) => {
          const isAvailable = slot.status === 'available';
          const isLocked = slot.status === 'locked';
          const isBooked = slot.status === 'booked';

          return (
            <div
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md ${
                isAvailable
                  ? 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1'
                  : isLocked
                  ? 'bg-amber-950/20 border-amber-500/30 cursor-not-allowed'
                  : 'bg-rose-950/20 border-rose-500/30 cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-mono tracking-wider uppercase text-slate-400">
                  Turno #{slot.id}
                </span>
                {isAvailable && (
                  <Clock className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                )}
                {isLocked && <Lock className="w-4 h-4 text-amber-400 animate-pulse" />}
                {isBooked && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
              </div>

              <div className="text-lg font-semibold text-white tracking-wide mb-3">
                {slot.start_time.slice(0, 5)} hs
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide ${
                    isAvailable
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : isLocked
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {isAvailable ? 'DISPONIBLE' : isLocked ? 'EN PROCESO' : 'RESERVADO'}
                </span>
              </div>
            </div>
          );
        })}
      </main>

      {/* Modal con barra de progreso y temporizador dinámico */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          totalSeconds={lockTtl}
          loading={loading}
          onClose={handleCancelBooking}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
}