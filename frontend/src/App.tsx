import { useEffect, useState } from 'react';
import { socket } from './socket';
import type { Slot } from './types';
import { 
  Clock, 
  Lock, 
  CheckCircle2, 
  RotateCcw, 
  CalendarDays, 
  LayoutDashboard, 
  Calendar,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BookingModal } from './booking.modal';
import { MyBookingsModal } from './MyBookingsModal';
import { DashboardView } from './DashboardView';
import { ParticlesBackground } from './ParticlesBackground';

const BACKEND_URL = 'http://localhost:3000';
const USER_ID = `user_${Math.random().toString(36).substring(2, 9)}`;

function formatSlotTime(timeStr: string) {
  if (!timeStr) return '--:--';
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return timeStr.slice(0, 5);
}

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'booking'>('dashboard');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lockTtl, setLockTtl] = useState(60);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('last_user_email') || '');
  const [showMyBookings, setShowMyBookings] = useState(false);

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

    socket.on('slot:locked', ({ slotId, userId }: { slotId: number; userId: string }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'locked', lockedByMe: userId === USER_ID } : s))
      );
    });

    socket.on('slot:booked', ({ slotId }: { slotId: number }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'booked', lockedByMe: false } : s))
      );
      setSelectedSlot((curr) => (curr?.id === slotId ? null : curr));
    });

    socket.on('slot:unlocked', ({ slotId }: { slotId: number }) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: 'available', lockedByMe: false } : s))
      );
      setSelectedSlot((curr) => (curr?.id === slotId ? null : curr));
    });

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
  }, []);

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

  const handleCancelBooking = async () => {
    if (!selectedSlot) return;

    const slotIdToUnlock = selectedSlot.id;

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
        setUserEmail(email);
        localStorage.setItem('last_user_email', email);

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

  const handleReset = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/slots/reset`, { method: 'POST' });
    } catch (err) {
      console.error('Error al resetear:', err);
    }
  };

  const availableCount = slots.filter((s) => s.status === 'available').length;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col items-center relative overflow-hidden font-sans">
      {/* Fondo de Partículas global para toda la app */}
      <ParticlesBackground />

      {/* Luces sutiles de ambiente */}
      <div className="absolute top-[-10%] left-[10%] w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Navbar Superior */}
      <header className="w-full max-w-6xl flex items-center justify-between px-6 py-4 border-b border-slate-800/60 z-30 backdrop-blur-md bg-[#07090e]/70 sticky top-0">
        <div 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              AsyncLock <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">v1.0</span>
            </h1>
            <span className="text-[11px] text-slate-500 font-mono">Distributed Booking Hub</span>
          </div>
        </div>

        {/* Selector de vistas */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-slate-800 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentView('booking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              currentView === 'booking'
                ? 'bg-slate-800 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Turnos</span>
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3">
          {userEmail && (
            <button
              onClick={() => setShowMyBookings(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 rounded-lg transition-all cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mis Reservas</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400 font-mono text-[11px]">{connected ? 'Live' : 'Offline'}</span>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-rose-900/60 rounded-lg transition-all cursor-pointer"
            title="Resetear estados a available"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Contenido principal condicional */}
      <main className="w-full max-w-5xl py-8 px-4 z-20 flex-1">
        {currentView === 'dashboard' ? (
          <DashboardView
            onEnterBooking={() => setCurrentView('booking')}
            connected={connected}
            totalSlots={slots.length}
            availableCount={availableCount}
          />
        ) : (
          <div className="animate-fade-in">
            {/* Header de la sección de turnos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-3">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Turnos Disponibles</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seleccioná un bloque horario para iniciar el bloqueo distribuido en Redis.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-500" />
                  Disponible ({availableCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/30 border border-amber-500" />
                  Bloqueado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-500" />
                  Reservado
                </span>
              </div>
            </div>

            {/* Grilla de turnos con tarjetas translúcidas para dejar ver las partículas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {slots.map((slot) => {
                const isAvailable = slot.status === 'available';
                const isLocked = slot.status === 'locked';
                const isBooked = slot.status === 'booked';

                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm ${
                      isAvailable
                        ? 'bg-[#0b1220]/80 border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1'
                        : isLocked
                        ? 'bg-amber-950/30 border-amber-500/30 cursor-not-allowed'
                        : 'bg-rose-950/30 border-rose-500/30 cursor-not-allowed opacity-60'
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

                    <div className="text-xl font-bold text-white tracking-wide mb-3 font-mono">
                      {formatSlotTime(slot.start_time)} hs
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider font-mono ${
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
            </div>
          </div>
        )}
      </main>

      {/* Modal de confirmación de reserva */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          totalSeconds={lockTtl}
          loading={loading}
          onClose={handleCancelBooking}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Modal Mis Reservas */}
      {showMyBookings && (
        <MyBookingsModal
          userEmail={userEmail}
          onClose={() => setShowMyBookings(false)}
          onBookingCancelled={() => {
            fetchSlots();
          }}
        />
      )}
    </div>
  );
}