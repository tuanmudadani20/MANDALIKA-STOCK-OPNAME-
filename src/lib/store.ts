import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { DEFAULT_MASTER_PRODUCTS, type MasterProduct } from "@/data/masterData";
import { SCHEDULE_STORES } from "@/data/locationData";

export interface ScanEntry {
  barcode: string;
  qty: number;
  lastScannedAt: string;
}
export interface Schedule {
  id: string;
  location: string;
  date: string;
  createdAt: string;
}
export interface DocumentState {
  status: "draft" | "approved" | "closed";
  approvedAt: string;
  closedAt: string;
}
export interface PlannerStore {
  id: string;
  nama: string;
  mall: string;
  area: string;
  wil: string;
  tgl: number;
  locationKey: string;
}
export interface HistoryEntry {
  id: string;
  location: string;
  startedAt: string;
  approvedAt: string;
  closedAt: string;
  totalItem: number;
  totalQty: number;
  variance: number;
  unknown: number;
  approvedBy: string;
  status: "approved" | "closed";
  rows: { barcode: string; name: string; category: string; qty: number; sysStock: number; diff: number; price: number }[];
}
export interface Store {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}
export interface AppState {
  activeLocation: string;
  master: Record<string, MasterProduct>;
  locationStocks: Record<string, Record<string, { barcode: string; systemStock: number }>>;
  scans: Record<string, Record<string, ScanEntry>>;
  schedules: Schedule[];
  documents: Record<string, DocumentState>;
  schedulePlanner: PlannerStore[];
  sessionStartedAt: Record<string, string>;
  history: HistoryEntry[];
  stores: Store[];
}

const STORAGE_KEY = "mandalika-stock-opname-v2";
const MASTER_OVERRIDES_KEY = "mandalika-master-overrides";
const STORES_KEY = "mandalika_stores";

function defaultStores(): Store[] {
  const now = new Date().toISOString();
  const fromPlanner = SCHEDULE_STORES.map((s) => ({
    id: crypto.randomUUID(),
    code: s.id,
    name: s.locationKey,
    createdAt: now,
  }));
  const extras: Store[] = [
    { id: crypto.randomUUID(), code: "GDG-1", name: "GUDANG CIBUBUR", createdAt: now },
    { id: crypto.randomUUID(), code: "GDG-2", name: "GUDANG PUSAT", createdAt: now },
    { id: crypto.randomUUID(), code: "AMS", name: "PERFORMANCE PERFUME AMS", createdAt: now },
    { id: crypto.randomUUID(), code: "GPS", name: "PERFORMANCE PERFUME GPS", createdAt: now },
  ];
  const seen = new Set(fromPlanner.map((s) => s.name));
  return [...fromPlanner, ...extras.filter((e) => !seen.has(e.name))];
}

function loadStores(): Store[] {
  if (typeof window === "undefined") return defaultStores();
  try {
    const raw = window.localStorage.getItem(STORES_KEY);
    if (!raw) return defaultStores();
    const arr = JSON.parse(raw) as Store[];
    if (!Array.isArray(arr) || arr.length === 0) return defaultStores();
    return arr;
  } catch {
    return defaultStores();
  }
}

function saveStores(stores: Store[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  } catch {
    toast.error("Penyimpanan penuh.");
  }
}

export function nextStoreCode(stores: Store[]): string {
  const nums = stores
    .map((s) => s.code.match(/^T(\d+)$/i))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `T${String(next).padStart(2, "0")}`;
}

function loadMaster(): Record<string, MasterProduct> {
  const defaults: Record<string, MasterProduct> = {};
  for (const p of DEFAULT_MASTER_PRODUCTS) defaults[p.barcode] = p;
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(MASTER_OVERRIDES_KEY);
    if (!raw) return defaults;
    const data = JSON.parse(raw) as
      | { overrides?: Record<string, MasterProduct>; deleted?: string[] }
      | Record<string, MasterProduct>;
    const isWrapped = data && typeof data === "object" && ("overrides" in data || "deleted" in data);
    const overrides = (isWrapped ? (data as { overrides?: Record<string, MasterProduct> }).overrides : (data as Record<string, MasterProduct>)) || {};
    const deleted = isWrapped ? ((data as { deleted?: string[] }).deleted || []) : [];
    const merged: Record<string, MasterProduct> = { ...defaults };
    for (const [bc, p] of Object.entries(overrides)) {
      const def = defaults[bc];
      merged[bc] = def ? { ...def, ...p } : (p as MasterProduct);
    }
    for (const bc of deleted) delete merged[bc];
    return merged;
  } catch {
    return defaults;
  }
}

function saveMasterOverrides(master: Record<string, MasterProduct>) {
  if (typeof window === "undefined") return;
  const defaults: Record<string, MasterProduct> = {};
  for (const p of DEFAULT_MASTER_PRODUCTS) defaults[p.barcode] = p;
  const overrides: Record<string, MasterProduct> = {};
  for (const [bc, p] of Object.entries(master)) {
    const def = defaults[bc];
    if (!def) {
      overrides[bc] = p;
    } else if (
      p.price !== def.price ||
      p.name !== def.name ||
      p.size !== def.size ||
      p.category !== def.category ||
      p.unit !== def.unit
    ) {
      overrides[bc] = p;
    }
  }
  const present = new Set(Object.keys(master));
  const deleted: string[] = [];
  for (const bc of Object.keys(defaults)) {
    if (!present.has(bc)) deleted.push(bc);
  }
  try {
    window.localStorage.setItem(
      MASTER_OVERRIDES_KEY,
      JSON.stringify({ overrides, deleted }),
    );
  } catch {
    toast.error("Penyimpanan penuh. Export data terlebih dahulu.");
  }
}

function defaultState(): AppState {
  return {
    activeLocation: "",
    master: loadMaster(),
    locationStocks: {},
    scans: {},
    schedules: [],
    documents: {},
    schedulePlanner: SCHEDULE_STORES.map((s) => ({ ...s })),
    sessionStartedAt: {},
    history: [],
    stores: loadStores(),
  };
}

let memoryState: AppState | null = null;
const listeners = new Set<() => void>();

function loadInitial(): AppState {
  if (memoryState) return memoryState;
  const base = defaultState();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...base,
      ...parsed,
      master: base.master,
      schedulePlanner:
        parsed.schedulePlanner && parsed.schedulePlanner.length > 0
          ? parsed.schedulePlanner
          : base.schedulePlanner,
    };
  } catch {
    return base;
  }
}

function persist(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    // strip master — persisted separately in MASTER_OVERRIDES_KEY
    const { master: _master, ...rest } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    toast.error("Penyimpanan penuh. Export data terlebih dahulu.");
  }
}

function setState(updater: (s: AppState) => AppState) {
  const current = memoryState ?? loadInitial();
  const next = updater(current);
  memoryState = next;
  persist(next);
  listeners.forEach((l) => l());
}

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    if (!memoryState) {
      memoryState = loadInitial();
      force((n) => n + 1);
    }
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  const state = memoryState ?? loadInitial();

  const actions = {
    setActiveLocation: useCallback((loc: string) => {
      setState((s) => ({ ...s, activeLocation: loc }));
    }, []),
    scanBarcode: useCallback((rawBarcode: string) => {
      const barcode = rawBarcode.trim().toUpperCase();
      if (!barcode) return;
      setState((s) => {
        if (!s.activeLocation) {
          toast.warning("Pilih lokasi terlebih dahulu");
          return s;
        }
        const bucket = { ...(s.scans[s.activeLocation] || {}) };
        const existing = bucket[barcode];
        bucket[barcode] = {
          barcode,
          qty: existing ? existing.qty + 1 : 1,
          lastScannedAt: new Date().toISOString(),
        };
        const product = s.master[barcode];
        if (product) {
          toast.success(`${barcode} — ${product.name}`, { duration: 1500 });
        } else {
          toast.error(`Barcode tidak dikenal: ${barcode}`, { duration: 2000 });
        }
        const sessionStartedAt = { ...s.sessionStartedAt };
        if (!sessionStartedAt[s.activeLocation]) {
          sessionStartedAt[s.activeLocation] = new Date().toISOString();
        }
        return { ...s, scans: { ...s.scans, [s.activeLocation]: bucket }, sessionStartedAt };
      });
    }, []),
    updateScanQty: useCallback((barcode: string, qty: number) => {
      setState((s) => {
        if (!s.activeLocation) return s;
        const bucket = { ...(s.scans[s.activeLocation] || {}) };
        if (qty <= 0) {
          delete bucket[barcode];
        } else {
          bucket[barcode] = {
            barcode,
            qty,
            lastScannedAt: bucket[barcode]?.lastScannedAt || new Date().toISOString(),
          };
        }
        return { ...s, scans: { ...s.scans, [s.activeLocation]: bucket } };
      });
    }, []),
    resetScans: useCallback(() => {
      setState((s) => {
        if (!s.activeLocation) return s;
        const scans = { ...s.scans };
        delete scans[s.activeLocation];
        const documents = { ...s.documents };
        delete documents[s.activeLocation];
        const sessionStartedAt = { ...s.sessionStartedAt };
        delete sessionStartedAt[s.activeLocation];
        return { ...s, scans, documents, sessionStartedAt };
      });
      toast.success("Data scan direset");
    }, []),
    importMaster: useCallback((products: MasterProduct[]) => {
      setState((s) => {
        const master = { ...s.master };
        for (const p of products) master[p.barcode] = p;
        saveMasterOverrides(master);
        return { ...s, master };
      });
      toast.success(`Master diimport: ${products.length} item`);
    }, []),
    updateMasterPrices: useCallback(
      (changes: Record<string, number>) => {
        setState((s) => {
          const master = { ...s.master };
          let count = 0;
          for (const [bc, price] of Object.entries(changes)) {
            if (master[bc] && master[bc].price !== price) {
              master[bc] = { ...master[bc], price };
              count++;
            }
          }
          saveMasterOverrides(master);
          if (count > 0) toast.success(`Harga berhasil disimpan (${count} item diperbarui)`);
          return { ...s, master };
        });
      },
      [],
    ),
    addMasterProduct: useCallback(
      (p: MasterProduct): boolean => {
        let ok = true;
        setState((s) => {
          if (s.master[p.barcode]) {
            ok = false;
            return s;
          }
          const master = { ...s.master, [p.barcode]: p };
          saveMasterOverrides(master);
          return { ...s, master };
        });
        if (ok) toast.success(`Produk berhasil ditambahkan: ${p.name}`);
        return ok;
      },
      [],
    ),
    deleteMasterProduct: useCallback((barcode: string) => {
      setState((s) => {
        if (!s.master[barcode]) return s;
        const master = { ...s.master };
        delete master[barcode];
        saveMasterOverrides(master);
        return { ...s, master };
      });
      toast.success("Produk dihapus dari master");
    }, []),
    resetMasterToDefault: useCallback(() => {
      setState((s) => {
        const master: Record<string, MasterProduct> = {};
        for (const p of DEFAULT_MASTER_PRODUCTS) master[p.barcode] = p;
        saveMasterOverrides(master);
        return { ...s, master };
      });
      toast.success("Master di-reset ke default");
    }, []),
    importStock: useCallback(
      (rows: { barcode: string; systemStock: number }[]) => {
        setState((s) => {
          if (!s.activeLocation) {
            toast.warning("Pilih lokasi terlebih dahulu");
            return s;
          }
          const bucket: Record<string, { barcode: string; systemStock: number }> = {};
          for (const r of rows) bucket[r.barcode] = r;
          return {
            ...s,
            locationStocks: { ...s.locationStocks, [s.activeLocation]: bucket },
          };
        });
        toast.success(`Stok sistem diimport: ${rows.length} item`);
      },
      [],
    ),
    approveDocument: useCallback((approvedBy = "—") => {
      setState((s) => {
        if (!s.activeLocation) return s;
        const loc = s.activeLocation;
        const approvedAt = new Date().toISOString();
        const startedAt = s.sessionStartedAt[loc] || approvedAt;
        const scans = s.scans[loc] || {};
        const stocks = s.locationStocks[loc] || {};
        const all = new Set<string>([...Object.keys(scans), ...Object.keys(stocks)]);
        const rows = Array.from(all).map((bc) => {
          const product = s.master[bc];
          const qty = scans[bc]?.qty ?? 0;
          const sysStock = stocks[bc]?.systemStock ?? 0;
          return {
            barcode: bc,
            name: product?.name || "(Unknown)",
            category: product?.category || "-",
            qty,
            sysStock,
            diff: qty - sysStock,
            price: product?.price ?? 0,
          };
        });
        const totalItem = rows.filter((r) => r.qty > 0).length;
        const totalQty = rows.reduce((a, r) => a + r.qty, 0);
        const variance = rows.filter((r) => r.diff !== 0 && (r.qty > 0 || r.sysStock > 0)).length;
        const unknown = rows.filter((r) => !s.master[r.barcode] && r.qty > 0).length;
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          location: loc,
          startedAt,
          approvedAt,
          closedAt: "",
          totalItem,
          totalQty,
          variance,
          unknown,
          approvedBy,
          status: "approved",
          rows,
        };
        const history = [entry, ...s.history].slice(0, 100);
        return {
          ...s,
          documents: {
            ...s.documents,
            [loc]: {
              status: "approved",
              approvedAt,
              closedAt: s.documents[loc]?.closedAt || "",
            },
          },
          history,
        };
      });
      toast.success("Dokumen di-approve");
    }, []),
    deleteHistory: useCallback((id: string) => {
      setState((s) => ({ ...s, history: s.history.filter((h) => h.id !== id) }));
      toast.success("Riwayat dihapus");
    }, []),
    closeDocument: useCallback(() => {
      setState((s) => {
        if (!s.activeLocation) return s;
        const cur = s.documents[s.activeLocation];
        if (!cur || cur.status !== "approved") return s;
        return {
          ...s,
          documents: {
            ...s.documents,
            [s.activeLocation]: {
              ...cur,
              status: "closed",
              closedAt: new Date().toISOString(),
            },
          },
        };
      });
      toast.success("Dokumen ditutup");
    }, []),
    addSchedule: useCallback((location: string, date: string) => {
      setState((s) => ({
        ...s,
        schedules: [
          ...s.schedules,
          {
            id: crypto.randomUUID(),
            location,
            date,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      toast.success("Jadwal ditambahkan");
    }, []),
    deleteSchedule: useCallback((id: string) => {
      setState((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) }));
      toast.success("Jadwal dihapus");
    }, []),
    updatePlannerTgl: useCallback((id: string, tgl: number) => {
      setState((s) => ({
        ...s,
        schedulePlanner: s.schedulePlanner.map((p) =>
          p.id === id ? { ...p, tgl } : p,
        ),
      }));
    }, []),
    plannerToSchedule: useCallback((id: string) => {
      setState((s) => {
        const planner = s.schedulePlanner.find((p) => p.id === id);
        if (!planner) return s;
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(planner.tgl).padStart(2, "0")}`;
        const others = s.schedules.filter(
          (x) => !(x.location === planner.locationKey && x.date.startsWith(date.slice(0, 7))),
        );
        return {
          ...s,
          schedules: [
            ...others,
            {
              id: crypto.randomUUID(),
              location: planner.locationKey,
              date,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
      toast.success("Disimpan ke jadwal");
    }, []),
    addStore: useCallback((code: string, name: string): boolean => {
      const cleanName = name.trim();
      const cleanCode = code.trim();
      if (!cleanName || !cleanCode) {
        toast.warning("Nama & kode toko wajib diisi");
        return false;
      }
      let ok = true;
      setState((s) => {
        if (s.stores.some((x) => x.code.toLowerCase() === cleanCode.toLowerCase())) {
          ok = false;
          return s;
        }
        const stores = [
          ...s.stores,
          { id: crypto.randomUUID(), code: cleanCode, name: cleanName, createdAt: new Date().toISOString() },
        ];
        saveStores(stores);
        return { ...s, stores };
      });
      if (ok) toast.success(`Toko ${cleanName} ditambahkan`);
      else toast.error(`Kode ${cleanCode} sudah ada`);
      return ok;
    }, []),
    updateStore: useCallback((id: string, patch: Partial<Pick<Store, "name" | "code">>) => {
      setState((s) => {
        const stores = s.stores.map((x) => (x.id === id ? { ...x, ...patch } : x));
        saveStores(stores);
        return { ...s, stores };
      });
      toast.success("Toko diperbarui");
    }, []),
    deleteStore: useCallback((id: string) => {
      setState((s) => {
        const stores = s.stores.filter((x) => x.id !== id);
        saveStores(stores);
        return { ...s, stores };
      });
      toast.success("Toko dihapus");
    }, []),
  };

  return { state, ...actions };
}
