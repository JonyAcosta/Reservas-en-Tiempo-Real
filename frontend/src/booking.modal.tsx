import React, { useState, useEffect } from 'react';
import type { Slot } from './types';
import { Timer, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  slot: Slot;
  totalSeconds: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: (name: string, email: string) => Promise<void>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  totalSeconds,
  loading,
  onClose,
  onConfirm,
}) => {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Cuenta regresiva de segundo a segundo
  useEffect(() => {
    setTimeLeft(totalSeconds);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [slot.id, totalSeconds]);

  // Formato mm:ss
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Porcentaje restante para la barra
  const percentage = Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));

  // Cambiar el color según la urgencia
  const isUrgent = timeLeft <= totalSeconds * 0.2; // Último 20% del tiempo

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    onConfirm(name, email);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        
        {/* Barra de progreso animada en la parte superior */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Encabezado con contador */}
        <div className="flex items-start justify-between mb-3 mt-1">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Confirmar Reserva</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Turno #{slot.id} · {slot.start_time.slice(0, 5)} hs
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
              isUrgent
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {isUrgent && (
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>¡Tu reserva temporal está por vencer! Completá tus datos para no perderla.</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Jonathan Acosta"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || timeLeft === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-medium rounded-lg text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Confirmando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};