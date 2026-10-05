const BACKEND_URL = 'http://localhost:3000';
const TARGET_SLOT_ID = 1; // El turno que van a disputarse
const TOTAL_REQUESTS = 50; // Cantidad de usuarios simultáneos

interface TestResult {
  userId: string;
  status: number;
  data: any;
}

async function attemptLock(userId: string): Promise<TestResult> {
  const response = await fetch(`${BACKEND_URL}/api/slots/${TARGET_SLOT_ID}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();
  return {
    userId,
    status: response.status,
    data,
  };
}

async function runConcurrencyTest() {
  console.log(`\n==============================================`);
  console.log(`🧪 Iniciando test de estrés sobre el Turno #${TARGET_SLOT_ID}`);
  console.log(`👥 Simulando ${TOTAL_REQUESTS} peticiones simultáneas...`);
  console.log(`==============================================\n`);

  // Primero reseteamos el estado para arrancar limpios
  await fetch(`${BACKEND_URL}/api/slots/reset`, { method: 'POST' });

  // Creamos un array con las 50 promesas listas para salir al mismo tiempo
  const promises: Promise<TestResult>[] = [];

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const userId = `bot_user_${i}`;
    promises.push(attemptLock(userId));
  }

  // Promise.all las dispara en paralelo
  const results = await Promise.all(promises);

  // Filtramos cuántas ganaron (HTTP 200) y cuántas rebotaron (HTTP 409)
  const winners = results.filter((r) => r.status === 200);
  const rejected = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log('📊 Resultados del test:');
  console.log(`   ✅ Bloqueos exitosos (200 OK): ${winners.length}`);
  console.log(`   ⛔ Rechazados por bloqueo activo (409 Conflict): ${rejected.length}`);

  if (errors.length > 0) {
    console.log(`   ❌ Errores no controlados (500 u otros): ${errors.length}`);
  }

  console.log('\n----------------------------------------------');
  if (winners.length === 1 && rejected.length === TOTAL_REQUESTS - 1) {
    console.log(`🎯 PRUEBA SUPERADA: Redis garantizó atomicidad perfecta.`);
    console.log(`   Ganador del turno: ${winners[0]?.userId}`);
  } else {
    console.log(`⚠️ ALERTA: Hubo una condición de carrera (race condition).`);
  }
  console.log('----------------------------------------------\n');
}

runConcurrencyTest();