import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import './config/db.js';
import './config/redis.js';
import { BookingController } from './controllers/booking.controller.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.post('/api/slots/reset', BookingController.reset);

// 1. Creamos el servidor HTTP nativo envolviendo a Express
const server = http.createServer(app);

// 2. Inicializamos Socket.io con soporte de CORS
export const io = new SocketServer(server, {
  cors: {
    origin: '*', // En producción restringís al dominio de tu frontend
    methods: ['GET', 'POST']
  }
});

// 3. Manejo de conexiones en tiempo real
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado vía WebSocket: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// Endpoints HTTP
app.get('/health', async (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Servidor y WebSockets activos' });
});

app.get('/api/slots', BookingController.getSlots);
app.post('/api/slots/:id/lock', BookingController.lock);
app.post('/api/bookings/confirm', BookingController.confirm);

// 4. IMPORTANTE: Levantamos `server.listen` en lugar de `app.listen`
server.listen(PORT, () => {
  console.log(`🚀 Servidor backend y WebSockets corriendo en http://localhost:${PORT}`);
});