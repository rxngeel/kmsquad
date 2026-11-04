// Guarda a foto do campo (drone/satélite) e os 2 cantos onde ela foi
// posicionada no IndexedDB — fica disponível mesmo depois de recarregar a
// página 100% offline (é um arquivo local, não precisa de rede pra ler de volta).

const DB_NAME = "kmtak-offline";
const STORE_NAME = "field-image";
const RECORD_ID = "current";

export interface FieldImageRecord {
  blob: Blob;
  bounds: { north: number; south: number; east: number; west: number };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFieldImage(record: FieldImageRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record, RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadFieldImage(): Promise<FieldImageRecord | null> {
  const db = await openDb();
  const record = await new Promise<FieldImageRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(RECORD_ID);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

export async function clearFieldImage(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(RECORD_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
