# ⚡ Real-Time Concurrent Booking System

Sistema de reservas concurrentes de alta disponibilidad y consistencia en tiempo real, diseñado para resolver condiciones de carrera (*race conditions*) y reservas duplicadas (*double booking*) mediante bloqueos distribuidos en memoria y sincronización bidireccional vía WebSockets.

---

## 🏗️ Arquitectura y Tecnologías

El sistema sigue una arquitectura desacoplada en capas (**Controller - Service - Repository**) orientada a soportar alta concurrencia con separación clara de responsabilidades:

* **Backend:** Node.js, Express, TypeScript.
* **Base de Datos Relacional:** PostgreSQL (Fuente de la verdad para la persistencia de turnos y reservas confirmadas).
* **Gestor de Concurrencia en Memoria:** Redis (Bloqueos atómicos distribuidos con expiración TTL).
* **Comunicación en Tiempo Real:** Socket.io / WebSockets (Sincronización instantánea de estados entre todos los clientes conectados).
* **Frontend:** React, Vite, Tailwind CSS, Lucide Icons.
* **Infraestructura:** Docker Compose.

---

## 🧠 ¿Cómo se resuelve la concurrencia? (Redis Locks vs. DB Locks)

En sistemas tradicionales de reserva, cuando múltiples usuarios intentan adquirir el mismo recurso simultáneamente, delegar el bloqueo a la base de datos relacional genera contención a nivel de fila (*row-level locking*), cuellos de botella en disco o inconsistencias por lecturas sucias.

Este sistema implementa un patrón de **Distributed Lock Atómico**:

1. **Bloqueo Atómico (`SET NX EX`):**  
   Al intentar seleccionar un turno, se ejecuta una operación atómica en Redis con un Time-to-Live (TTL):
   ```text
   SET lock:slot:{slotId} {userId} EX 60 NX
   🧪 Pruebas de Estrés y Atomicidad
El repositorio incluye un script de prueba de concurrencia (test-concurrency.ts) que simula 50 peticiones simultáneas compitiendo exactamente en el mismo instante por el mismo turno mediante Promise.all:

Bash
# Ejecutar desde la carpeta /backend
npm run test:concurrency
Resultado validado:

1 única petición adquiere el turno (200 OK).

49 peticiones son rechazadas de inmediato con conflicto (409 Conflict).

0 turnos duplicados o inconsistencias en PostgreSQL.

🚀 Puesta en Marcha Local
Prerrequisitos
Docker y Docker Desktop corriendo.

Node.js (v18+ recomendado).

1. Clonar el repositorio
Bash
git clone <URL_DEL_REPOSITORIO>
cd "Reservas en tiempo real"
2. Levantar la infraestructura con Docker Compose
Bash
docker compose up -d
Esto inicializa en segundo plano:

PostgreSQL (Puerto 5432) con el esquema de tablas y datos iniciales precargados (init.sql).

Redis (Puerto 6379).

3. Iniciar el Backend
Bash
cd backend
npm install
npm run dev
Servidor backend y WebSockets disponible en http://localhost:3000.

4. Iniciar el Frontend
En otra terminal:

Bash
cd frontend
npm install
npm run dev
Aplicación disponible en http://localhost:5173.

📌 Funcionalidades Implementadas
🟢 Grilla de turnos en tiempo real: Visualización interactiva de estados (DISPONIBLE, EN PROCESO, RESERVADO).

⏱️ Timer de reserva activa: Feedback visual con cuenta regresiva del TTL asignado al turno bloqueado.

📋 Panel "Mis Reservas": Permite al usuario consultar sus reservas activas y cancelarlas con un clic, liberando el turno al instante para otros clientes.

🔄 Reset global: Endpoint y control para restaurar el estado inicial de la base de datos y Redis durante pruebas y demostraciones.