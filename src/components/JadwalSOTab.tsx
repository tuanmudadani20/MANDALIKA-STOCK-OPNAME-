import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { WIL_COLORS } from "@/data/locationData";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, Plus, ChevronLeft, ChevronRight, Save, Printer, FileSpreadsheet } from "lucide-react";
import { downloadFile } from "@/lib/csv";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

const PRINT_BASE = `
  @page { margin: 18mm 14mm 22mm 14mm; }
  *{box-sizing:border-box}
  body{font-family:Inter,Arial,sans-serif;color:#111;padding:0;margin:0;font-size:12px}
  .brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:14px}
  .brand-name{font-size:22px;font-weight:800;color:#1a1a2e}
  .brand-name span{color:#c9a84c;font-style:italic;font-weight:600}
  .brand-sub{font-size:11px;color:#555;text-align:right}
  h1{margin:0 0 6px;font-size:18px}
  .muted{color:#666;font-size:11px}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}
  th,td{border:1px solid #ddd;padding:5px 7px;text-align:left}
  th{background:#1a1a2e;color:#fff}
  .footer{position:fixed;bottom:8mm;left:14mm;right:14mm;font-size:9px;color:#888;display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:4px}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:10px}
  .legend span.dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}
`;

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
            {state.stores.map((s) => <SelectItem key={s.id} value={s.name}>{s.code} — {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button className="w-full" onClick={() => {
          if (!loc || !date) { toast.warning("Lengkapi lokasi & tanggal"); return; }
          addSchedule(loc, date);
          setDate("");
        }}>
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
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{formatDate(s.date)}</div>
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
                      <AlertDialogDescription>{s.location} — {formatDate(s.date)}</AlertDialogDescription>
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
    for (const s of state.schedulePlanner) (g[s.wil] ||= []).push(s);
    return g;
  }, [state.schedulePlanner]);

  const printPlanner = () => {
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;
    const rows = state.schedulePlanner
      .map((s) => `<tr><td>${s.nama}</td><td>${s.mall}</td><td>${s.area}</td><td>${s.wil}</td><td style="text-align:center">${s.tgl}</td></tr>`)
      .join("");
    const now = new Date().toLocaleString("id-ID");
    w.document.write(`<!doctype html><html><head><title>Planner SO</title>
      <style>${PRINT_BASE}</style></head><body>
      <div class="brand"><div class="brand-name">MANDALIKA <span>Perfume</span></div>
        <div class="brand-sub">Planner Stock Opname<br/>Dicetak: ${now}</div></div>
      <h1>Planner SO — Tanggal Default per Toko</h1>
      <table><thead><tr><th>Toko</th><th>Mall</th><th>Area</th><th>Wilayah</th><th>Tgl SO</th></tr></thead>
        <tbody>${rows}</tbody></table>
      <div class="footer"><span>Mandalika Perfume</span><span>${now}</span></div>
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
          <div className="flex items-center gap-2 border-b border-border px-4 py-2"
            style={{ background: `${WIL_COLORS[wil]}15` }}>
            <span className="h-3 w-3 rounded-full" style={{ background: WIL_COLORS[wil] }} />
            <span className="font-semibold">{wil}</span>
            <span className="text-xs text-muted-foreground">({stores.length} toko)</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Toko</TableHead><TableHead>Mall</TableHead><TableHead>Area</TableHead>
                <TableHead className="w-24">Tgl SO</TableHead><TableHead className="w-40">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell>{s.mall}</TableCell>
                  <TableCell className="text-muted-foreground">{s.area || "-"}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} max={31} value={s.tgl}
                      onChange={(e) => updatePlannerTgl(s.id, Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                      className="h-8 w-20" />
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
  const [wilFilter, setWilFilter] = useState<string>("__all__");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const allWil = Object.keys(WIL_COLORS);

  const completedKey = (loc: string, monthPrefix: string) =>
    state.history.some((h) => h.location === loc && h.approvedAt.slice(0, 7) === monthPrefix);

  const monthSchedules = useMemo(() => {
    const map: Record<number, { store: string; wil: string; locationKey: string; redirected?: boolean; done?: boolean }[]> = {};
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    for (const sch of state.schedules) {
      if (!sch.date.startsWith(prefix)) continue;
      const d = Number(sch.date.slice(8, 10));
      const planner = state.schedulePlanner.find((p) => p.locationKey === sch.location);
      const wil = planner?.wil || "Gudang";
      const dayOfWeek = new Date(year, month, d).getDay();
      const target = dayOfWeek === 0 ? Math.min(d + 1, daysInMonth) : d;
      (map[target] ||= []).push({
        store: planner?.nama || sch.location,
        wil, locationKey: sch.location,
        redirected: dayOfWeek === 0,
        done: completedKey(sch.location, prefix),
      });
    }
    for (const p of state.schedulePlanner) {
      const d = p.tgl;
      if (d < 1 || d > daysInMonth) continue;
      const dayOfWeek = new Date(year, month, d).getDay();
      const target = dayOfWeek === 0 ? Math.min(d + 1, daysInMonth) : d;
      const exists = (map[target] || []).some((x) => x.store === p.nama);
      if (!exists) (map[target] ||= []).push({
        store: p.nama, wil: p.wil, locationKey: p.locationKey,
        redirected: dayOfWeek === 0,
        done: completedKey(p.locationKey, prefix),
      });
    }
    return map;
  }, [state.schedules, state.schedulePlanner, state.history, year, month, daysInMonth]); // eslint-disable-line

  // wilayah filter
  const filterByWil = <T extends { wil: string }>(entries: T[] | undefined): T[] =>
    !entries ? [] : (wilFilter === "__all__" ? entries : entries.filter((e) => e.wil === wilFilter));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const navMonth = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // Build flat list for export
  const flatSchedule = useMemo(() => {
    const out: { tgl: string; toko: string; wilayah: string; locationKey: string; status: string }[] = [];
    Object.entries(monthSchedules).forEach(([d, entries]) => {
      const date = `${d.padStart(2, "0")} ${MONTHS_ID[month]} ${year}`;
      for (const e of entries) {
        if (wilFilter !== "__all__" && e.wil !== wilFilter) continue;
        out.push({
          tgl: date, toko: e.store, wilayah: e.wil,
          locationKey: e.locationKey, status: e.done ? "Selesai" : "Pending",
        });
      }
    });
    return out.sort((a, b) => a.tgl.localeCompare(b.tgl));
  }, [monthSchedules, wilFilter, month, year]);


  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      flatSchedule.map((r) => ({
        Tanggal: r.tgl, Toko: r.toko, Wilayah: r.wilayah, Lokasi: r.locationKey, Status: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${MONTHS_ID[month]} ${year}`);
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadFile(
      `jadwal-so-${MONTHS_ID[month].toLowerCase()}-${year}.xlsx`,
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
  };

  const printNow = () => window.print();

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #calendar-print-area, #calendar-print-area * { visibility: visible; }
          #calendar-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 12mm;
          }
          .calendar-nav-btn, .calendar-no-print { display: none !important; }
          #calendar-print-area .print-only { display: block !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 calendar-no-print">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navMonth(-1)} className="calendar-nav-btn">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-bold">{MONTHS_ID[month]} {year}</h3>
          <Button variant="ghost" size="sm" onClick={() => navMonth(1)} className="calendar-nav-btn">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <Button variant={viewMode === "calendar" ? "default" : "ghost"} size="sm"
              className={viewMode === "calendar" ? "bg-[#1a1a2e] hover:bg-[#1a1a2e]/90 rounded-none" : "rounded-none"}
              onClick={() => setViewMode("calendar")}>
              Tampilan Kalender
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm"
              className={viewMode === "list" ? "bg-[#1a1a2e] hover:bg-[#1a1a2e]/90 rounded-none" : "rounded-none"}
              onClick={() => setViewMode("list")}>
              Tampilan List
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={printNow} className="bg-[#1a1a2e] hover:bg-[#1a1a2e]/90">
            <Printer className="mr-2 h-4 w-4" /> Print Kalender
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Wilayah filter chips */}
      <div className="flex flex-wrap gap-2 calendar-no-print">
        <FilterChip active={wilFilter === "__all__"} onClick={() => setWilFilter("__all__")}>
          Semua
        </FilterChip>
        {allWil.map((w2) => (
          <FilterChip key={w2} active={wilFilter === w2} color={WIL_COLORS[w2]} onClick={() => setWilFilter(w2)}>
            {w2}
          </FilterChip>
        ))}
      </div>

      {viewMode === "calendar" ? (
        <div id="calendar-print-area">
          <div className="print-only" style={{ marginBottom: 12, borderBottom: "2px solid #1a1a2e", paddingBottom: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>
              MANDALIKA <span style={{ color: "#c9a84c", fontStyle: "italic", fontWeight: 600 }}>Perfume</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              Jadwal Stock Opname — {MONTHS_ID[month]} {year}
            </div>
            <div style={{ fontSize: 10, color: "#666" }}>
              Filter wilayah: {wilFilter === "__all__" ? "Semua" : wilFilter} • Dicetak: {new Date().toLocaleString("id-ID")}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <div key={d} className="p-2 text-center font-semibold text-muted-foreground">{d}</div>
            ))}
            {cells.map((d, i) => {
              const isToday = d !== null
                && today.getFullYear() === year
                && today.getMonth() === month
                && today.getDate() === d;
              const dayEntries = d ? filterByWil(monthSchedules[d]) : [];
              return (
                <div key={i}
                  className={`min-h-[80px] sm:min-h-[80px] rounded-md border border-border p-1 ${
                    d === null ? "bg-muted/30" : isToday ? "bg-[#fff7d6]" : dayEntries.length ? "bg-card" : "bg-card"
                  }`}>
                  {d && (
                    <>
                      <div className="text-left text-xs font-bold text-foreground">{d}</div>
                      <div className="mt-1 space-y-0.5">
                        {dayEntries.slice(0, 3).map((s, idx) => (
                          <div key={idx}
                            className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${s.done ? "opacity-50 line-through" : ""}`}
                            style={{ background: s.done ? "#6b7280" : WIL_COLORS[s.wil] || "#6b7280" }}
                            title={`${s.store} — ${s.done ? "Selesai" : s.wil}`}>
                            {s.redirected && "→ "}{s.store}
                          </div>
                        ))}
                        {dayEntries.length > 3 && (
                          <div className="px-1.5 text-[10px] text-muted-foreground">
                            +{dayEntries.length - 3} lagi
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Legenda Warna</div>
            <div className="flex flex-wrap gap-3 text-xs">
              {allWil.map((w2) => (
                <div key={w2} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded" style={{ background: WIL_COLORS[w2] }} />
                  <span>{w2}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#6b7280] opacity-50" />
                <span className="line-through opacity-70">Selesai</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">→</span>
                <span>Digeser dari Minggu</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatSchedule.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Tidak ada jadwal pada periode ini
                  </TableCell>
                </TableRow>
              ) : flatSchedule.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.tgl}</TableCell>
                  <TableCell className="font-medium">{r.toko}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: WIL_COLORS[r.wilayah] || "#6b7280" }} />
                      {r.wilayah}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.locationKey}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${r.status === "Selesai" ? "text-green-600" : "text-amber-600"}`}>
                      {r.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active, onClick, color, children,
}: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? "border-[#c9a84c] bg-[#1a1a2e] text-white" : "border-border bg-card hover:bg-muted"
      }`}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
