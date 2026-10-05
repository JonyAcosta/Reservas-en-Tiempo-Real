================================================================================
GUÍA CONCEPTUAL Y ARQUITECTURA: SISTEMA DE RESERVAS EN TIEMPO REAL
================================================================================

1. EL PROBLEMA DE NEGOCIO Y EL DESAFÍO TÉCNICO
--------------------------------------------------------------------------------
¿Qué problema resolvemos?
En plataformas de turnos, eventos o canchas deportivas, múltiples usuarios intentan 
reservar el mismo slot de tiempo simultáneamente.

El desafío de la concurrencia:
- Si dos personas tocan "Reservar a las 20:00" al mismo tiempo, el sistema debe 
  garantizar que solo una se quede con el turno (cero overbooking).
- El usuario que gana el turno necesita unos 3 a 5 minutos para cargar sus datos 
  o pagar. Durante ese lapso, el turno debe quedar bloqueado provisionalmente.(usando redis)
- Si el usuario cierra el navegador o abandona, el turno debe liberarse 
  automáticamente sin dejar basura en la base de datos ni requerir tareas manuales.


2. EL ECOSISTEMA TECNOLÓGICO Y EL ROL DE CADA PIEZA
--------------------------------------------------------------------------------
A) Node.js y npm:
- Node.js: Entorno de ejecución (runtime) que toma el motor V8 de Google Chrome y 
  permite ejecutar JavaScript en el backend (servidor), fuera del navegador.
- npm (Node Package Manager): El gestor de dependencias y librerías del ecosistema. 
  Cumple el mismo rol que NuGet en el entorno .NET.

B) TypeScript:
- Superconjunto de JavaScript que introduce tipado estático, interfaces y contratos.
- Detecta inconsistencias en tiempo de compilación (en el editor de código) antes 
  de que lleguen a ejecución, aportando la robustez y estructura típica de C#.

C) Docker y Docker Compose:
- Docker: Empaqueta aplicaciones y servicios dentro de "contenedores" aislados y 
  ligeros, garantizando que el entorno corra exactamente igual en cualquier máquina.
- Docker Compose: Archivo declarativo (docker-compose.yml) que define y levanta 
  toda la infraestructura (PostgreSQL, Redis, backend) con un único comando:
  "docker compose up". Evita instalaciones locales conflictivas en el sistema operativo.

D) PostgreSQL (Base de Datos Relacional):
- Motor transaccional ACID donde reside la persistencia definitiva.
- Almacena entidades estructurales: usuarios, recursos/canchas y reservas confirmadas.
- Aplica restricciones duras a nivel motor (ej. índices únicos compuestos 
  UNIQUE(court_id, start_time)) para que sea físicamente imposible duplicar reservas.

E) Redis (Memoria Caché y Bloqueo en Concurrencia):
- Almacén en memoria RAM ultra rápido (latencia menor a 1 milisegundo).
- Implementa bloqueos temporales con tiempo de expiración (TTL):
  Comando atómico: SET lock:court:1:slot:2026-10-01-20:00 <userId> NX EX 300
  * NX: Solo asigna si la clave NO existe previamente. Si otro entra un milisegundo 
    tarde, la operación se rechaza en memoria sin saturar la base relacional.
  * EX 300: Expiración automática a los 5 minutos si no se confirma el pago.

F) WebSockets y Socket.io (Comunicación Bidireccional):
- Supera las limitaciones de HTTP tradicional (donde el cliente debe solicitar para recibir).
- Mantiene un canal abierto y continuo entre clientes y servidor.
- Cuando un usuario bloquea o confirma un turno, el backend emite un evento 
  (ej. 'slot_status_changed') a todos los clientes suscritos a esa fecha, actualizando 
  la vista en vivo sin necesidad de recargar la página.

G) React + Tailwind CSS (Frontend Reactivo):
- Construye la grilla de disponibilidad interactiva.
- Asigna estados visuales en tiempo real según los eventos de WebSocket:
  * Verde: Disponible.
  * Amarillo: En proceso de reserva (bloqueado por otro usuario).
  * Azul: Bloqueado temporalmente por vos (con temporizador en cuenta regresiva).
  * Rojo: Confirmado / Ocupado.


3. FLUJO DE VIDA DE UNA RESERVA (CICLO PASO A PASO)
--------------------------------------------------------------------------------
1. Disponibilidad:
   El cliente abre la grilla. El backend consulta las reservas firmes en PostgreSQL 
   y los bloqueos activos en Redis. Se devuelven los slots clasificados por estado.

2. Bloqueo Temporal (Hold):
   El usuario hace clic en un horario libre.
   -> La API ejecuta en Redis: SET key value NX EX 300.
   -> Si responde OK, el turno queda reservado provisionalmente por 5 minutos.
   -> Socket.io avisa a todos los usuarios conectados para pintar el botón en amarillo.

3. Confirmación (Booking Confirmed):
   El usuario completa el flujo de pago/datos y confirma.
   -> La API abre una transacción en PostgreSQL.
   -> Inserta el registro permanente de la reserva.
   -> Se elimina la clave de bloqueo en Redis.
   -> Se emite por WebSocket el estado definitivo a "Ocupado" (rojo).

4. Cancelación o Expiración:
   Si el usuario cancela o deja pasar los 5 minutos, el TTL de Redis destruye 
   la clave automáticamente. Socket.io notifica que el slot vuelve a estar libre (verde).


4. HOJA DE RUTA PARA MAÑANA
--------------------------------------------------------------------------------
Fase 1: Infraestructura y entorno
- Verificar Docker Desktop.
- Crear docker-compose.yml con PostgreSQL 16 y Redis 7.
- Inicializar el backend con Node.js, TypeScript y scripts base.

Fase 2: Persistencia y Bloqueos
- Configurar ORM y modelos de base de datos.
- Escribir el servicio de bloqueo en Redis.

Fase 3: API, WebSockets y Frontend
- Exponer endpoints HTTP y salas en Socket.io.
- Conectar la interfaz en React con feedback en tiempo real.
================================================================================