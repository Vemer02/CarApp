import { synchronize, SyncDatabaseChangeSet } from '@nozbe/watermelondb/sync';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { database } from './index';
import { getGarageId } from '../services/firebase';

type FS = FirebaseFirestoreTypes.Module;
type DocSnap = FirebaseFirestoreTypes.QueryDocumentSnapshot;

const db: FS = firestore();

// Таблицы WatermelonDB <-> коллекции Firestore — имена совпадают, поля — нет
// (локально snake_case по конвенции WatermelonDB, в Firestore camelCase — см. firestore.rules).
const TABLES = ['cars', 'service_records', 'expenses', 'reminders'] as const;
type Table = (typeof TABLES)[number];

// ---- Конвертация: локальная raw-запись (snake_case) -> документ Firestore (camelCase) ----

function toMillis(v: any): number | null {
  if (v == null) return null;
  return typeof v === 'number' ? v : v.toMillis?.() ?? null;
}

const rawToFirestore: Record<Table, (raw: any, garageId: string) => Record<string, any>> = {
  cars: (raw, garageId) => ({
    garageId,
    make: raw.make,
    model: raw.model,
    year: raw.year,
    vin: raw.vin ?? null,
    plateNumber: raw.plate_number ?? null,
    photoUrl: raw.photo_url ?? null,
    currentMileage: raw.current_mileage,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    deletedAt: null,
  }),
  service_records: (raw, garageId) => ({
    garageId,
    carId: raw.car_id,
    date: raw.date,
    mileage: raw.mileage,
    type: raw.type,
    fluidType: raw.fluid_type ?? null,
    cost: raw.cost,
    serviceName: raw.service_name ?? null,
    photos: JSON.parse(raw.photos || '[]'),
    source: raw.source,
    createdAt: raw.created_at,
    updatedAt: Date.now(),
    deletedAt: null,
  }),
  expenses: (raw, garageId) => ({
    garageId,
    carId: raw.car_id,
    category: raw.category,
    amount: raw.amount,
    date: raw.date,
    fuelVolume: raw.fuel_volume ?? null,
    fuelPrice: raw.fuel_price ?? null,
    notes: raw.notes ?? null,
    photoUrl: raw.photo_url ?? null,
    updatedAt: Date.now(),
    deletedAt: null,
  }),
  reminders: (raw, garageId) => ({
    garageId,
    carId: raw.car_id,
    type: raw.type,
    targetMileage: raw.target_mileage ?? null,
    targetDate: raw.target_date ?? null,
    relatedFluidType: raw.related_fluid_type ?? null,
    status: raw.status,
    calendarSynced: !!raw.calendar_synced,
    updatedAt: Date.now(),
    deletedAt: null,
  }),
};

// ---- Обратная конвертация: документ Firestore (camelCase) -> raw-запись WatermelonDB (snake_case) ----

const firestoreToRaw: Record<Table, (id: string, data: any) => any> = {
  cars: (id, d) => ({
    id,
    garage_id: d.garageId,
    make: d.make,
    model: d.model,
    year: d.year,
    vin: d.vin ?? undefined,
    plate_number: d.plateNumber ?? undefined,
    photo_url: d.photoUrl ?? undefined,
    current_mileage: d.currentMileage,
    created_at: toMillis(d.createdAt),
    updated_at: toMillis(d.updatedAt),
  }),
  service_records: (id, d) => ({
    id,
    car_id: d.carId,
    date: toMillis(d.date),
    mileage: d.mileage,
    type: d.type,
    fluid_type: d.fluidType ?? undefined,
    cost: d.cost,
    service_name: d.serviceName ?? undefined,
    photos: JSON.stringify(d.photos ?? []),
    source: d.source,
    created_at: toMillis(d.createdAt),
  }),
  expenses: (id, d) => ({
    id,
    car_id: d.carId,
    category: d.category,
    amount: d.amount,
    date: toMillis(d.date),
    fuel_volume: d.fuelVolume ?? undefined,
    fuel_price: d.fuelPrice ?? undefined,
    notes: d.notes ?? undefined,
    photo_url: d.photoUrl ?? undefined,
  }),
  reminders: (id, d) => ({
    id,
    car_id: d.carId,
    type: d.type,
    target_mileage: d.targetMileage ?? undefined,
    target_date: toMillis(d.targetDate) ?? undefined,
    related_fluid_type: d.relatedFluidType ?? undefined,
    status: d.status,
    calendar_synced: !!d.calendarSynced,
  }),
};

let syncing = false;
let syncQueued = false;

/**
 * Офлайн-первая синхронизация: локальная WatermelonDB — источник правды на устройстве,
 * Firestore — источник правды между устройствами. Конфликты — last-write-wins по updatedAt
 * (для MVP этого достаточно; для гаража с несколькими участниками при желании можно
 * усложнить до field-level merge позже).
 */
export async function syncWithFirestore(): Promise<void> {
  const garageId = getGarageId();
  if (!garageId) return; // не авторизован — синхронизировать нечего

  if (syncing) {
    syncQueued = true;
    return;
  }
  syncing = true;
  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const since = lastPulledAt ?? 0;
        const changes: SyncDatabaseChangeSet = {};

        for (const table of TABLES) {
          const snap = await db
            .collection(table)
            .where('garageId', '==', garageId)
            .where('updatedAt', '>', since)
            .get();

          const created: any[] = [];
          const updated: any[] = [];
          const deleted: string[] = [];

          snap.docs.forEach((doc: DocSnap) => {
            const data = doc.data();
            if (data.deletedAt) {
              deleted.push(doc.id);
            } else {
              // WatermelonDB одинаково обрабатывает created/updated при синхронизации —
              // не различаем их здесь, кладём всё в updated (упрощение, стандартное для этого паттерна).
              updated.push(firestoreToRaw[table](doc.id, data));
            }
          });

          changes[table] = { created, updated, deleted };
        }

        return { changes, timestamp: Date.now() };
      },

      pushChanges: async ({ changes }) => {
        let batch = db.batch();
        let opsInBatch = 0;

        const commitIfNeeded = async () => {
          if (opsInBatch >= 400) {
            // Firestore ограничивает батч 500 операциями — коммитим с запасом.
            await batch.commit();
            batch = db.batch();
            opsInBatch = 0;
          }
        };

        for (const table of TABLES) {
          const tableChanges = changes[table];
          if (!tableChanges) continue;

          for (const raw of [...tableChanges.created, ...tableChanges.updated]) {
            const docRef = db.collection(table).doc(raw.id);
            batch.set(docRef, rawToFirestore[table](raw, garageId), { merge: true });
            opsInBatch++;
            await commitIfNeeded();
          }

          for (const id of tableChanges.deleted) {
            const docRef = db.collection(table).doc(id);
            batch.set(docRef, { deletedAt: Date.now(), updatedAt: Date.now() }, { merge: true });
            opsInBatch++;
            await commitIfNeeded();
          }
        }

        if (opsInBatch > 0) await batch.commit();
      },

      sendCreatedAsUpdated: true,
    });
  } catch (err) {
    // Офлайн или временная сетевая ошибка — не критично, следующий вызов досинхронизирует.
    console.warn('syncWithFirestore failed (will retry later):', err);
  } finally {
    syncing = false;
    if (syncQueued) {
      syncQueued = false;
      // Пока синхронизировались, накопились новые локальные изменения — прогоняем ещё раз.
      syncWithFirestore();
    }
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/** Периодическая синхронизация, пока пользователь авторизован. Вызывать из App.tsx. */
export function startBackgroundSync(intervalMs = 60000): () => void {
  syncWithFirestore();
  intervalHandle = setInterval(syncWithFirestore, intervalMs);
  return () => {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  };
}
