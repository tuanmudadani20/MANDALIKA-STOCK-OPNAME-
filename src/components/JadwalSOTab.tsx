import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { LOCATIONS, WIL_COLORS } from "@/data/locationData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Plus, ChevronLeft, ChevronRight, Save, Printer } from "lucide-react";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

export function JadwalSOTab() {
  return (
    <Tabs defaultValue="board" className="w-full">
      <TabsList>
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="planner">Planner</TabsTrigger>
        <TabsTrigger value="kalender">Kalender</TabsTrigger>
      </TabsList>
      <TabsContent value="board" className="mt-4"><BoardView /></TabsContent>
      <TabsContent value="planner" className="mt-4"><PlannerView /></TabsContent>
      <TabsContent value="kalender" className="mt-4"><KalenderView /></TabsContent>
    </Tabs>
  );
}

function BoardView() {
  const { state, addSchedule, deleteSchedule } = useStore();
  const [loc, setLoc] = useState<string>("");
  const [date, setDate] = useState<string>("");

  const sorted = [...state.schedules].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground">Tambah Jadwal</h3>
        <Select value={loc} onValueChange={setLoc}>
          <SelectTrigger><SelectValue placeholder="Pilih lokasi" /></SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button
          className="w-full"
          onClick={() => {
            if (!loc || !date) { toast.warning("Lengkapi lokasi & tanggal"); return; }
            addSchedule(loc, date);
            setDate("");
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah Jadwal
        </Button>
      </div>

      <div>
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Belum ada jadwal SO. Tambahkan dari panel kiri.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatDate(s.date)}
                </div>
                <div className="mt-1 font-semibold text-foreground">{s.location}</div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="mt-2 text-red-600 hover:text-red-700">
                      <Trash2 className="mr-1 h-3 w-3" /> Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {s.location} — {formatDate(s.date)}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSchedule(s.id)}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlannerView() {
  const { state, updatePlannerTgl, plannerToSchedule } = useStore();

  const grouped = useMemo(() => {
    const g: Record<string, typeof state.schedulePlanner> = {};
    for (const s of state.schedulePlanner) {
      (g[s.wil] ||= []).push(s);
    }
    return g;
  }, [state.schedulePlanner]);

  const printPlanner = () => {
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;
    const rows = state.schedulePlanner
      .map(
        (s) => `<tr><td>${s.nama}</td><td>${s.mall}</td><td>${s.area}</td><td>${s.wil}</td><td style="text-align:center">${s.tgl}</td></tr>`,
      )
      .join("");
    w.document.write(`<!doctype html><html><head><title>Planner SO</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:24px}h1{margin:0 0 12px;font-size:20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#1a1a2e;color:#fff}</style></head><body>
      <h1>Planner Stock Opname</h1>
      <table><thead><tr><th>Toko</th><th>Mall</th><th>Area</th><th>Wilayah</th><th>Tgl SO</th></tr></thead><tbody>${rows}</tbody></table>
      <script>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={printPlanner}>
          <Printer className="mr-2 h-4 w-4" /> Print Planner
        </Button>
      </div>
      {Object.entries(grouped).map(([wil, stores]) => (
        <div key={wil} className="rounded-lg border border-border bg-card">
          <div
            className="flex items-center gap-2 border-b border-border px-4 py-2"
            style={{ background: `${WIL_COLORS[wil]}15` }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: WIL_COLORS[wil] }}
            />
            <span className="font-semibold">{wil}</span>
            <span className="text-xs text-muted-foreground">({stores.length} toko)</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Toko</TableHead>
                <TableHead>Mall</TableHead>
                <TableHead>Area</TableHead>
                <TableHead className="w-24">Tgl SO</TableHead>
                <TableHead className="w-40">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell>{s.mall}</TableCell>
                  <TableCell className="text-muted-foreground">{s.area || "-"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={s.tgl}
                      onChange={(e) =>
                        updatePlannerTgl(
                          s.id,
                          Math.max(1, Math.min(31, Number(e.target.value) || 1)),
                        )
                      }
                      className="h-8 w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => plannerToSchedule(s.id)}>
                      <Save className="mr-1 h-3 w-3" /> Simpan ke Jadwal
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

function KalenderView() {
  const { state } = useStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthSchedules = useMemo(() => {
    const map: Record<number, { store: string; wil: string; redirected?: boolean }[]> = {};
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    for (const sch of state.schedules) {
      if (!sch.date.startsWith(prefix)) continue;
      const d = Number(sch.date.slice(8, 10));
      const planner = state.schedulePlanner.find((p) => p.locationKey === sch.location);
      const wil = planner?.wil || "Gudang";
      const dayOfWeek = new Date(year, month, d).getDay();
      if (dayOfWeek === 0) {
        const next = d + 1 <= daysInMonth ? d + 1 : d;
        (map[next] ||= []).push({ store: planner?.nama || sch.location, wil, redirected: true });
      } else {
        (map[d] ||= []).push({ store: planner?.nama || sch.location, wil });
      }
    }
    // also include planner default tgls (so calendar shows even without explicit schedule)
    for (const p of state.schedulePlanner) {
      const d = p.tgl;
      if (d < 1 || d > daysInMonth) continue;
      const dayOfWeek = new Date(year, month, d).getDay();
      const target = dayOfWeek === 0 ? Math.min(d + 1, daysInMonth) : d;
      const exists = (map[target] || []).some((x) => x.store === p.nama);
      if (!exists) (map[target] ||= []).push({ store: p.nama, wil: p.wil, redirected: dayOfWeek === 0 });
    }
    return map;
  }, [state.schedules, state.schedulePlanner, year, month, daysInMonth]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <Button variant="ghost" size="sm" onClick={() => navMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-bold">{MONTHS_ID[month]} {year}</h3>
        <Button variant="ghost" size="sm" onClick={() => navMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(WIL_COLORS).map(([w, c]) => (
          <div key={w} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: c }} />
            <span>{w}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
          <div key={d} className="p-2 text-center font-semibold text-muted-foreground">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`min-h-24 rounded-md border border-border p-1 ${
              d === null ? "bg-muted/30" : "bg-card"
            }`}
          >
            {d && (
              <>
                <div className="text-right text-xs font-semibold text-muted-foreground">{d}</div>
                <div className="mt-1 space-y-0.5">
                  {(monthSchedules[d] || []).map((s, idx) => (
                    <div
                      key={idx}
                      className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ background: WIL_COLORS[s.wil] || "#6b7280" }}
                      title={s.store}
                    >
                      {s.redirected && "→ "}{s.store}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
