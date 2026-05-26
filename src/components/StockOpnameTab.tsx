import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { KelolaTokoDialog } from "@/components/KelolaTokoDialog";
import {
  parseMasterCsv,
  parseStockCsv,
  toCsv,
  downloadFile,
  slugify,
  validateMasterCsv,
  previewMasterCsv,
  exportMasterCsv,
} from "@/lib/csv";
import { DEFAULT_MASTER_PRODUCTS } from "@/data/masterData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Upload,
  RotateCcw,
  Printer,
  Download,
  CheckCircle2,
  Lock,
  Pencil,
  X,
  Check,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";

type FilterMode = "all" | "diff" | "unknown";

const PRINT_HEADER_HTML = (subtitle: string) => `
  <div class="brand">
    <div class="brand-name">MANDALIKA <span>Perfume</span></div>
    <div class="brand-sub">${subtitle}</div>
  </div>`;

const PRINT_BASE_CSS = `
  @page { margin: 18mm 14mm 22mm 14mm; }
  *{box-sizing:border-box}
  body{font-family:Inter,Arial,sans-serif;color:#111;margin:0;padding:0;font-size:12px}
  .brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:14px}
  .brand-name{font-size:22px;font-weight:800;letter-spacing:.5px;color:#1a1a2e}
  .brand-name span{color:#c9a84c;font-weight:600;font-style:italic}
  .brand-sub{font-size:11px;color:#555;text-align:right}
  h1{margin:0 0 4px;font-size:18px}
  .muted{color:#666;font-size:11px}
  .summary{display:flex;gap:10px;margin:12px 0;flex-wrap:wrap}
  .box{flex:1;min-width:120px;border:1px solid #ddd;padding:10px;border-radius:6px}
  .box .label{font-size:10px;color:#666;text-transform:uppercase}
  .box .val{font-size:16px;font-weight:700;margin-top:2px}
  .box.loss .val{color:#dc2626}
  .box.surplus .val{color:#16a34a}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}
  th,td{border:1px solid #ddd;padding:5px 7px;text-align:left}
  th{background:#1a1a2e;color:#fff;font-weight:600}
  .sign{display:flex;justify-content:space-between;margin-top:32px;font-size:11px}
  .sign div{text-align:center;width:30%}
  .sign .line{border-top:1px solid #333;margin-top:50px;padding-top:4px}
  .footer{position:fixed;bottom:8mm;left:14mm;right:14mm;font-size:9px;color:#888;display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:4px}
`;

export function StockOpnameTab() {
  const {
    state,
    setActiveLocation,
    scanBarcode,
    updateScanQty,
    resetScans,
    importMaster,
    importStock,
    approveDocument,
    closeDocument,
  } = useStore();

  const [scanInput, setScanInput] = useState("");
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<string>("");
  const [unknownOpen, setUnknownOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvedBy, setApprovedBy] = useState("");
  const [importPreview, setImportPreview] = useState<{
    text: string;
    headers: string[];
    total: number;
    rows: { barcode: string; name: string; size: string; category: string; unit: string; price: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [, tick] = useState(0);

  const scanRef = useRef<HTMLInputElement>(null);
  const masterFileRef = useRef<HTMLInputElement>(null);
  const stockFileRef = useRef<HTMLInputElement>(null);

  const loc = state.activeLocation;
  const scans = (loc && state.scans[loc]) || {};
  const stocks = (loc && state.locationStocks[loc]) || {};
  const doc = (loc && state.documents[loc]) || {
    status: "draft" as const,
    approvedAt: "",
    closedAt: "",
  };
  const sessionStart = (loc && state.sessionStartedAt[loc]) || "";

  useEffect(() => {
    scanRef.current?.focus();
  }, [loc]);

  // Tick every minute for session timer
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  const rows = useMemo(() => {
    const all = new Set<string>([...Object.keys(scans), ...Object.keys(stocks)]);
    return Array.from(all).map((bc) => {
      const product = state.master[bc];
      const scan = scans[bc];
      const sysStock = stocks[bc]?.systemStock ?? 0;
      const qty = scan?.qty ?? 0;
      return {
        barcode: bc,
        name: product?.name || "(Unknown)",
        category: product?.category || "-",
        qty,
        sysStock,
        diff: qty - sysStock,
        lastScannedAt: scan?.lastScannedAt || "",
        unknown: !product,
      };
    });
  }, [scans, stocks, state.master]);

  const masterTotal = Object.keys(state.master).length;
  const scannedKnownCount = useMemo(
    () => rows.filter((r) => !r.unknown && r.qty > 0).length,
    [rows],
  );
  const progressPct = masterTotal > 0 ? Math.min(100, (scannedKnownCount / masterTotal) * 100) : 0;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = rows;
    if (filterMode === "diff") list = list.filter((r) => r.diff !== 0 && (r.qty > 0 || r.sysStock > 0));
    else if (filterMode === "unknown") list = list.filter((r) => r.unknown);
    if (q) {
      list = list.filter(
        (r) =>
          r.barcode.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.lastScannedAt || "").localeCompare(a.lastScannedAt || ""));
  }, [rows, filter, filterMode]);

  const stats = useMemo(() => {
    const totalItem = rows.filter((r) => r.qty > 0).length;
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const variance = rows.filter((r) => r.diff !== 0 && (r.qty > 0 || r.sysStock > 0)).length;
    const unknown = rows.filter((r) => r.unknown && r.qty > 0).length;
    return { totalItem, totalQty, variance, unknown };
  }, [rows]);

  const unknownRows = useMemo(() => rows.filter((r) => r.unknown && r.qty > 0), [rows]);

  const lastScanned = useMemo(() => {
    let latest: { bc: string; at: string } | null = null;
    for (const [bc, e] of Object.entries(scans)) {
      if (!latest || e.lastScannedAt > latest.at) latest = { bc, at: e.lastScannedAt };
    }
    if (!latest) return null;
    const p = state.master[latest.bc];
    return { barcode: latest.bc, name: p?.name || "(Unknown)" };
  }, [scans, state.master]);

  const sessionDurationMin = useMemo(() => {
    if (!sessionStart) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(sessionStart).getTime()) / 60_000));
  }, [sessionStart, scans]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = scanInput;
    setScanInput("");
    if (v.trim()) scanBarcode(v);
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  const handleMasterFile = async (f: File) => {
    setImporting(true);
    try {
      const text = await f.text();
      const v = validateMasterCsv(text);
      if (!v.ok) {
        toast.error(v.error);
        return;
      }
      const { headers, total, preview } = previewMasterCsv(text);
      if (total === 0) {
        toast.error("CSV master kosong");
        return;
      }
      setImportPreview({ text, headers, total, rows: preview });
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const products = parseMasterCsv(importPreview.text);
      if (!products.length) {
        toast.error("Tidak ada item valid untuk diimport");
        return;
      }
      importMaster(products);
      setImportPreview(null);
    } finally {
      setImporting(false);
    }
  };

  const handleStockFile = async (f: File) => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    setImporting(true);
    try {
      const text = await f.text();
      const rows = parseStockCsv(text);
      if (!rows.length) {
        toast.error("CSV stok kosong / format salah");
        return;
      }
      importStock(rows);
    } finally {
      setImporting(false);
    }
  };

  const exportCsv = () => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    const header = [
      "lokasi", "barcode", "nama", "kategori", "qty_scan",
      "stok_sistem", "selisih", "waktu_terakhir_scan",
    ];
    const data = rows.map((r) => [
      loc, r.barcode, r.name, r.category, r.qty, r.sysStock, r.diff, r.lastScannedAt,
    ]);
    const csv = toCsv([header, ...data]);
    const dt = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadFile(`hasil-so-${slugify(loc)}-${dt}.csv`, csv);
  };

  const exportMasterAsCsv = () => {
    const csv = exportMasterCsv(Object.values(state.master));
    const dt = new Date().toISOString().slice(0, 10);
    downloadFile(`master-mandalika-${dt}.csv`, csv);
  };

  const printReport = (mode: "discrepancy" | "all") => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;
    const fmtRp = (n: number) => (n === 0 ? "—" : `Rp ${Math.abs(n).toLocaleString("id-ID")}`);
    let totalLoss = 0;
    let totalSurplus = 0;
    const baseRows = mode === "discrepancy"
      ? rows.filter((r) => r.diff !== 0 || r.unknown)
      : rows;
    const tableRows = baseRows
      .map((r) => {
        const price = state.master[r.barcode]?.price ?? 0;
        const value = r.diff * price;
        if (value < 0) totalLoss += value;
        else if (value > 0) totalSurplus += value;
        const valStr =
          price === 0
            ? "—"
            : value < 0
              ? `<strong style="color:#dc2626">(${fmtRp(value)})</strong>`
              : value > 0
                ? `<span style="color:#16a34a">+${fmtRp(value)}</span>`
                : "—";
        return `<tr>
          <td>${r.barcode}</td><td>${r.name}</td><td>${r.category}</td>
          <td style="text-align:right">${r.qty}</td>
          <td style="text-align:right">${r.sysStock}</td>
          <td style="text-align:right;color:${r.diff === 0 ? "#666" : r.diff > 0 ? "#16a34a" : "#dc2626"}">${r.diff > 0 ? "+" : ""}${r.diff}</td>
          <td style="text-align:right">${valStr}</td>
        </tr>`;
      })
      .join("");
    const now = new Date().toLocaleString("id-ID");
    const title = mode === "discrepancy" ? "Laporan Selisih SO" : "Laporan Lengkap SO";
    w.document.write(`<!doctype html><html><head><title>${title} ${loc}</title>
      <style>${PRINT_BASE_CSS}</style></head><body>
      ${PRINT_HEADER_HTML(`Stock Opname Report<br/>Dicetak: ${now}`)}
      <h1>${title} — ${loc}</h1>
      <div class="muted">Status: ${doc.status.toUpperCase()} • Petugas: ${approvedBy || "—"} • Sesi: ${sessionDurationMin} menit</div>
      <div class="summary">
        <div class="box"><div class="label">Total Item</div><div class="val">${stats.totalItem}</div></div>
        <div class="box"><div class="label">Total Qty</div><div class="val">${stats.totalQty}</div></div>
        <div class="box"><div class="label">Item Selisih</div><div class="val">${stats.variance}</div></div>
        <div class="box"><div class="label">Unknown</div><div class="val">${stats.unknown}</div></div>
        <div class="box loss"><div class="label">Total Nilai Loss</div><div class="val">${totalLoss === 0 ? "—" : `(${fmtRp(totalLoss)})`}</div></div>
        <div class="box surplus"><div class="label">Total Nilai Surplus</div><div class="val">${totalSurplus === 0 ? "—" : `+${fmtRp(totalSurplus)}`}</div></div>
      </div>
      <table><thead><tr><th>Barcode</th><th>Nama</th><th>Kategori</th><th>Qty Scan</th><th>Stok Sistem</th><th>Selisih</th><th>Nilai Selisih (Rp)</th></tr></thead>
        <tbody>${tableRows || `<tr><td colspan="7" style="text-align:center;color:#666">Tidak ada baris untuk dicetak</td></tr>`}</tbody></table>
      <div class="sign">
        <div><div class="line">Dibuat oleh</div></div>
        <div><div class="line">Diperiksa oleh</div></div>
        <div><div class="line">Disetujui oleh</div></div>
      </div>
      <div class="footer"><span>Mandalika Perfume — Stock Opname</span><span>${now}</span></div>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  const startEdit = (bc: string, qty: number) => {
    setEditing(bc);
    setEditVal(String(qty));
  };
  const saveEdit = () => {
    if (!editing) return;
    updateScanQty(editing, Math.max(0, Number(editVal) || 0));
    setEditing(null);
    setEditVal("");
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  const stockImported = Object.keys(stocks).length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lokasi Aktif
          </label>
          <Select value={loc} onValueChange={setActiveLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih lokasi" />
            </SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loc && <div className="mt-2 text-sm font-bold text-foreground">{loc}</div>}
        </div>

        <div className="space-y-2">
          <input ref={masterFileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMasterFile(f); e.target.value = ""; }} />
          <input ref={stockFileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleStockFile(f); e.target.value = ""; }} />
          <Button variant="outline" className="w-full justify-start"
            onClick={() => masterFileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Master CSV
          </Button>
          <Button variant="outline" className="w-full justify-start"
            onClick={() => stockFileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Stok Sistem CSV
          </Button>
          <Button variant="outline" className="w-full justify-start" onClick={exportMasterAsCsv}>
            <Download className="mr-2 h-4 w-4" /> Export Master CSV
          </Button>
        </div>

        <div className="space-y-1 rounded-md bg-muted p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Master Item</span>
            <span className="font-semibold">{masterTotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Stok Sistem</span>
            <span className="font-semibold">{Object.keys(stocks).length}</span>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={!loc}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Scan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset semua data scan?</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin reset semua data scan untuk lokasi ini? Tindakan ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={resetScans}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </aside>

      {/* Main */}
      <main className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{loc || "Pilih Lokasi"}</h2>
              {lastScanned && (
                <p className="text-sm text-muted-foreground">
                  Terakhir: <span className="font-mono">{lastScanned.barcode}</span> — {lastScanned.name}
                </p>
              )}
            </div>
            <Badge className={
              doc.status === "approved" ? "bg-amber-500 text-white"
                : doc.status === "closed" ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground"
            }>{doc.status.toUpperCase()}</Badge>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-muted-foreground">Progress Scan</span>
              <span className="font-mono font-semibold">
                {scannedKnownCount} / {masterTotal} item ({progressPct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={progressPct} />
          </div>

          {/* Session timer */}
          {sessionStart && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                SO dimulai: <strong className="text-foreground">{new Date(sessionStart).toLocaleString("id-ID")}</strong>
                <span className="mx-2">•</span>
                Durasi: <strong className="text-foreground">{sessionDurationMin} menit</strong>
              </span>
            </div>
          )}

          {/* Empty state for system stock */}
          {loc && !stockImported && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Stok sistem belum diimport.</strong> Import file CSV stok sistem untuk
                mengaktifkan fitur selisih otomatis.
              </span>
            </div>
          )}

          <Input
            ref={scanRef}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScan}
            placeholder="Scan barcode di sini..."
            className="mt-4 h-12 text-lg font-mono"
            autoFocus
            disabled={!loc || doc.status === "closed"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total Item" value={stats.totalItem} />
          <StatCard label="Total Qty" value={stats.totalQty} />
          <StatCard label="Item Selisih" value={stats.variance} tone="warn" />
          <button
            type="button"
            onClick={() => stats.unknown > 0 && setUnknownOpen(true)}
            className={`rounded-lg border border-border bg-card p-4 text-left transition-colors ${
              stats.unknown > 0 ? "cursor-pointer hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/20" : ""
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Unknown Barcode</div>
            <div className="mt-1 text-3xl font-bold text-red-600">{stats.unknown}</div>
            {stats.unknown > 0 && <div className="mt-1 text-[10px] uppercase text-red-600">Klik untuk detail</div>}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setApproveOpen(true)}
            disabled={!loc || rows.length === 0 || doc.status === "closed"}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
          <Button onClick={closeDocument} disabled={doc.status !== "approved"}
            className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Lock className="mr-2 h-4 w-4" /> Close SO
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => printReport("discrepancy")}>
            <Printer className="mr-2 h-4 w-4" /> Print Laporan (Selisih)
          </Button>
          <Button variant="ghost" onClick={() => printReport("all")}>
            <Printer className="mr-2 h-4 w-4" /> Print Semua
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="space-y-3 border-b border-border p-3">
            <Input
              placeholder="Cari barcode / nama / kategori..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <TabsList>
                <TabsTrigger value="all">Semua ({rows.length})</TabsTrigger>
                <TabsTrigger value="diff">Selisih ({stats.variance})</TabsTrigger>
                <TabsTrigger value="unknown">Unknown ({rows.filter((r) => r.unknown).length})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="w-32">Qty Scan</TableHead>
                  <TableHead className="w-24">Stok Sistem</TableHead>
                  <TableHead className="w-24">Selisih</TableHead>
                  <TableHead>Update Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Tidak ada baris.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => {
                  const bg = r.unknown
                    ? "bg-red-50 dark:bg-red-950/20"
                    : r.diff === 0
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-amber-50 dark:bg-amber-950/20";
                  const isEditing = editing === r.barcode;
                  return (
                    <TableRow key={r.barcode} className={bg}>
                      <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min={0} value={editVal} autoFocus
                              onChange={(e) => setEditVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(null); }}
                              className="h-8 w-20"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{r.qty}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => startEdit(r.barcode, r.qty)} title="Edit qty">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{r.sysStock}</TableCell>
                      <TableCell>
                        <Badge className={
                          r.diff > 0 ? "bg-emerald-600 text-white"
                            : r.diff < 0 ? "bg-red-600 text-white"
                              : "bg-muted text-muted-foreground"
                        }>{r.diff > 0 ? "+" : ""}{r.diff}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.lastScannedAt ? new Date(r.lastScannedAt).toLocaleString("id-ID") : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Unknown barcodes drawer */}
      <Dialog open={unknownOpen} onOpenChange={setUnknownOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Unknown Barcode ({unknownRows.length})</DialogTitle>
            <DialogDescription>
              Barcode yang ter-scan namun tidak terdaftar di master.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unknownRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      Tidak ada unknown barcode.
                    </TableCell>
                  </TableRow>
                )}
                {unknownRows.map((r) => (
                  <TableRow key={r.barcode}>
                    <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                    <TableCell className="font-mono">{r.qty}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.lastScannedAt ? new Date(r.lastScannedAt).toLocaleString("id-ID") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve confirm */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve SO ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin meng-approve SO ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium">Approved by (nama petugas)</label>
            <Input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Nama Anda"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                approveDocument(approvedBy.trim() || "—");
                setApproveOpen(false);
              }}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV import preview */}
      <Dialog open={!!importPreview} onOpenChange={(v) => !v && setImportPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Import Master CSV</DialogTitle>
            <DialogDescription>
              {importPreview?.total} baris terdeteksi. Periksa pemetaan kolom sebelum konfirmasi.
            </DialogDescription>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-xs">
                <div className="font-semibold">Kolom terdeteksi:</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {importPreview.headers.map((h) => (
                    <Badge key={h} variant="outline" className="font-mono text-[10px]">{h}</Badge>
                  ))}
                </div>
                <div className="mt-2 text-muted-foreground">
                  Pemetaan: <strong>barcode → barcode</strong>, <strong>nama → name</strong>,{" "}
                  <strong>ukuran → size</strong>, <strong>kategori → category</strong>,{" "}
                  <strong>satuan → unit</strong>, <strong>harga → price</strong>
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.size}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell>{r.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Menampilkan {importPreview.rows.length} dari {importPreview.total} baris. Default
                master akan tetap ada ({DEFAULT_MASTER_PRODUCTS.length} item) — import ini akan
                menambahkan / menggantikan barcode yang ada.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>Batal</Button>
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Konfirmasi Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warn" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
