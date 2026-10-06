import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Database, 
  Flame, 
  Radio, 
  Cpu, 
  CheckCircle2, 
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import TiltedCard from './TiltedCard';

interface DashboardViewProps {
  onEnterBooking: () => void;
  connected: boolean;
  totalSlots: number;
  availableCount: number;
}

const SLIDES = [
  {
    prefix: 'Reservas concurrentes con',
    highlight: 'bloqueo atómico distribuido',
    highlightGradient: 'from-cyan-400 via-teal-300 to-indigo-400',
    description: 'Cero condiciones de carrera y sin doble reserva gracias a Redis In-Memory Locks con TTL de 60s y sincronización global por WebSockets.',
    tag: 'Redis SET NX EX'
  },
  {
    prefix: 'Sincronización en tiempo real con',
    highlight: 'latencia sub-milisegundo',
    highlightGradient: 'from-cyan-400 via-teal-300 to-indigo-400',
    description: 'Actualizaciones bi-direccionales de estado instantáneas: cuando un usuario selecciona un turno, todos los clientes lo ven bloqueado de inmediato.',
    tag: 'WebSockets & Socket.io'
  },
  {
    prefix: 'Pruebas de estrés superadas:',
    highlight: '50 clientes en el mismo milisegundo',
    highlightGradient: 'from-cyan-400 via-teal-300 to-indigo-400',
    description: '1 sola petición adquiere la reserva exitosamente y 49 reciben conflicto 409 instantáneo sin saturar PostgreSQL ni corromper turnos.',
    tag: '100% Race-Condition Proof'
  },
  {
    prefix: 'Persistencia ACID sólida con',
    highlight: 'PostgreSQL como verdad única',
    highlightGradient: 'from-cyan-400 via-teal-300 to-indigo-400',
    description: 'Arquitectura desacoplada en tres capas (Controller - Service - Repository) que asegura atomicidad de extremo a extremo.',
    tag: 'Clean Architecture'
  }
];

export function DashboardView({
  onEnterBooking,
  connected,
  totalSlots,
  availableCount,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'lock' | 'socket' | 'db'>('lock');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotación estricta cada 5 segundos
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [currentSlide, isPaused]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col justify-center py-4 animate-fade-in">
      {/* Hero Carrusel de Titulares */}
      <div 
        className="text-center mb-8 z-10 relative px-8 sm:px-14 min-h-[230px] flex flex-col items-center justify-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Flecha Izquierda */}
        <button
          onClick={prevSlide}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-800/90 text-slate-400 hover:text-white transition-all backdrop-blur-md hover:scale-110 active:scale-95 z-20 cursor-pointer"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Flecha Derecha */}
        <button
          onClick={nextSlide}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full border border-slate-800 bg-slate-900/60 hover:bg-slate-800/90 text-slate-400 hover:text-white transition-all backdrop-blur-md hover:scale-110 active:scale-95 z-20 cursor-pointer"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Badges superiores */}
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/60 backdrop-blur-md text-[11px] font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'}`} />
            <span>Distributed Engine Live</span>
            <Sparkles className="w-3 h-3 text-cyan-400 ml-0.5" />
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-800/40 bg-slate-900/80 text-cyan-300">
            {slide.tag}
          </span>
        </div>

        {/* Contenido animado */}
        <div className="relative w-full max-w-3xl min-h-[145px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full"
            >
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {slide.prefix}{' '}
                <span className={`bg-gradient-to-r ${slide.highlightGradient} bg-clip-text text-transparent block sm:inline`}>
                  {slide.highlight}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-3 font-light leading-relaxed">
                {slide.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicadores de puntos estáticos */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-colors duration-200 cursor-pointer ${
                idx === currentSlide 
                  ? 'w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.7)]' 
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              aria-label={`Ir al slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* CTA Principal */}
        <div className="mt-5 flex justify-center items-center gap-3">
          <button
            onClick={onEnterBooking}
            className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:brightness-110 transition-all duration-200 shadow-[0_0_25px_rgba(45,212,191,0.25)] hover:shadow-[0_0_35px_rgba(45,212,191,0.45)] active:scale-95 cursor-pointer"
          >
            <span>Ir a la Grilla de Turnos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Bento Grid con TiltedCard 3D */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 z-10"
      >
        {/* Card 1: Redis Lock */}
        <TiltedCard
          captionText="Redis: SET NX EX 60"
          rotateAmplitude={10}
          scaleOnHover={1.02}
          onClick={() => setActiveTab('lock')}
        >
          <div 
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden h-full backdrop-blur-sm ${
              activeTab === 'lock' 
                ? 'bg-[#0b1220]/95 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/40' 
                : 'bg-[#0b1220]/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Redis Lock</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1 tracking-tight">SET NX Atómico</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Bloqueo en microsegundos con auto-expiración TTL (60s) que previene sobreescrituras en caliente.
            </p>
            <div className="mt-3 font-mono text-[11px] text-cyan-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              SET lock:slot:1 user_abc EX 60 NX
            </div>
          </div>
        </TiltedCard>

        {/* Card 2: Socket.io Live */}
        <TiltedCard
          captionText="WS: io.emit('slot:locked')"
          rotateAmplitude={10}
          scaleOnHover={1.02}
          onClick={() => setActiveTab('socket')}
        >
          <div 
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden h-full backdrop-blur-sm ${
              activeTab === 'socket' 
                ? 'bg-[#0b1220]/95 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/40' 
                : 'bg-[#0b1220]/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">WebSockets</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Sincronización Live</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Emisión bidireccional inmediata de eventos sin polling: los clientes ven los turnos ocupados al instante.
            </p>
            <div className="mt-3 font-mono text-[11px] text-emerald-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              io.emit('slot:locked', &#123; slotId &#125;)
            </div>
          </div>
        </TiltedCard>

        {/* Card 3: PostgreSQL Single Truth */}
        <TiltedCard
          captionText="SQL: INSERT INTO bookings"
          rotateAmplitude={10}
          scaleOnHover={1.02}
          onClick={() => setActiveTab('db')}
        >
          <div 
            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative overflow-hidden h-full backdrop-blur-sm ${
              activeTab === 'db' 
                ? 'bg-[#0b1220]/95 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/40' 
                : 'bg-[#0b1220]/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">PostgreSQL</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Persistencia ACID</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Fuente de la verdad final. Solo se confirma la reserva definitiva si el lock temporal sigue siendo válido.
            </p>
            <div className="mt-3 font-mono text-[11px] text-indigo-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              INSERT INTO bookings (...)
            </div>
          </div>
        </TiltedCard>
      </motion.div>

      {/* Footer / Barra de Métricas */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400 z-10"
      >
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Arquitectura en Capas: Controller · Service · Repository</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>50 Concurrentes Validados</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Turnos Disponibles: <strong className="text-white">{availableCount}</strong>/{totalSlots}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}