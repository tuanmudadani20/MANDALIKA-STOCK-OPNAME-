import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { LOCATIONS } from "@/data/locationData";
import { parseMasterCsv, parseStockCsv, toCsv, downloadFile, slugify } from "@/lib/csv";
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
import { Upload, RotateCcw, Printer, Download, CheckCircle2, Lock } from "lucide-react";

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

  useEffect(() => {
    scanRef.current?.focus();
  }, [loc]);

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

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.barcode.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q),
        )
      : rows;
    return [...list].sort((a, b) => (b.lastScannedAt || "").localeCompare(a.lastScannedAt || ""));
  }, [rows, filter]);

  const stats = useMemo(() => {
    const totalItem = rows.filter((r) => r.qty > 0).length;
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const variance = rows.filter((r) => r.diff !== 0 && (r.qty > 0 || r.sysStock > 0)).length;
    const unknown = rows.filter((r) => r.unknown && r.qty > 0).length;
    return { totalItem, totalQty, variance, unknown };
  }, [rows]);

  const lastScanned = useMemo(() => {
    let latest: { bc: string; at: string } | null = null;
    for (const [bc, e] of Object.entries(scans)) {
      if (!latest || e.lastScannedAt > latest.at) latest = { bc, at: e.lastScannedAt };
    }
    if (!latest) return null;
    const p = state.master[latest.bc];
    return { barcode: latest.bc, name: p?.name || "(Unknown)" };
  }, [scans, state.master]);

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const v = scanInput;
    setScanInput("");
    if (v.trim()) scanBarcode(v);
    setTimeout(() => scanRef.current?.focus(), 0);
  };

  const handleMasterFile = async (f: File) => {
    const text = await f.text();
    const products = parseMasterCsv(text);
    if (!products.length) {
      toast.error("CSV master kosong / format salah");
      return;
    }
    importMaster(products);
  };
  const handleStockFile = async (f: File) => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    const text = await f.text();
    const rows = parseStockCsv(text);
    if (!rows.length) {
      toast.error("CSV stok kosong / format salah");
      return;
    }
    importStock(rows);
  };

  const exportCsv = () => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    const header = [
      "lokasi",
      "barcode",
      "nama",
      "kategori",
      "qty_scan",
      "stok_sistem",
      "selisih",
      "waktu_terakhir_scan",
    ];
    const data = rows.map((r) => [
      loc,
      r.barcode,
      r.name,
      r.category,
      r.qty,
      r.sysStock,
      r.diff,
      r.lastScannedAt,
    ]);
    const csv = toCsv([header, ...data]);
    const dt = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    downloadFile(`hasil-so-${slugify(loc)}-${dt}.csv`, csv);
  };

  const printReport = () => {
    if (!loc) {
      toast.warning("Pilih lokasi terlebih dahulu");
      return;
    }
    const w = window.open("", "_blank", "width=1024,height=768");
    if (!w) return;
    const tableRows = rows
      .map(
        (r) => `
        <tr>
          <td>${r.barcode}</td><td>${r.name}</td><td>${r.category}</td>
          <td style="text-align:right">${r.qty}</td>
          <td style="text-align:right">${r.sysStock}</td>
          <td style="text-align:right;color:${r.diff === 0 ? "#666" : r.diff > 0 ? "#16a34a" : "#dc2626"}">${r.diff > 0 ? "+" : ""}${r.diff}</td>
        </tr>`,
      )
      .join("");
    const now = new Date().toLocaleString("id-ID");
    w.document.write(`<!doctype html><html><head><title>Laporan SO ${loc}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#111}
      h1{margin:0 0 4px;font-size:20px}.muted{color:#666;font-size:12px}
      .summary{display:flex;gap:12px;margin:16px 0}
      .box{flex:1;border:1px solid #ddd;padding:12px;border-radius:8px}
      .box .label{font-size:11px;color:#666;text-transform:uppercase}
      .box .val{font-size:22px;font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#1a1a2e;color:#fff}
      .sign{display:flex;justify-content:space-between;margin-top:48px;font-size:12px}
      .sign div{text-align:center;width:30%}
      .sign .line{border-top:1px solid #333;margin-top:60px;padding-top:4px}
      </style></head><body>
      <h1>Laporan Stock Opname — ${loc}</h1>
      <div class="muted">Status: ${doc.status.toUpperCase()} • Dicetak: ${now}</div>
      <div class="summary">
        <div class="box"><div class="label">Total Item</div><div class="val">${stats.totalItem}</div></div>
        <div class="box"><div class="label">Total Qty</div><div class="val">${stats.totalQty}</div></div>
        <div class="box"><div class="label">Item Selisih</div><div class="val">${stats.variance}</div></div>
        <div class="box"><div class="label">Unknown</div><div class="val">${stats.unknown}</div></div>
      </div>
      <table><thead><tr><th>Barcode</th><th>Nama</th><th>Kategori</th><th>Qty Scan</th><th>Stok Sistem</th><th>Selisih</th></tr></thead><tbody>${tableRows}</tbody></table>
      <div class="sign">
        <div><div class="line">Dibuat oleh</div></div>
        <div><div class="line">Diperiksa oleh</div></div>
        <div><div class="line">Disetujui oleh</div></div>
      </div>
      <script>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

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
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loc && <div className="mt-2 text-sm font-bold text-foreground">{loc}</div>}
        </div>

        <div className="space-y-2">
          <input
            ref={masterFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleMasterFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={stockFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleStockFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => masterFileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Import Master CSV
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => stockFileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> Import Stok Sistem CSV
          </Button>
        </div>

        <div className="space-y-1 rounded-md bg-muted p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Master Item</span>
            <span className="font-semibold">{Object.keys(state.master).length}</span>
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
                  Terakhir: <span className="font-mono">{lastScanned.barcode}</span> —{" "}
                  {lastScanned.name}
                </p>
              )}
            </div>
            <Badge
              className={
                doc.status === "approved"
                  ? "bg-amber-500 text-white"
                  : doc.status === "closed"
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
              }
            >
              {doc.status.toUpperCase()}
            </Badge>
          </div>

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
          <StatCard label="Unknown Barcode" value={stats.unknown} tone="danger" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={approveDocument}
            disabled={!loc || rows.length === 0 || doc.status === "closed"}
            className="bg-amber-500 text-white hover:bg-amber-600"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
          <Button
            onClick={closeDocument}
            disabled={doc.status !== "approved"}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Lock className="mr-2 h-4 w-4" /> Close SO
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" /> Print Laporan
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-3">
            <Input
              placeholder="Cari barcode / nama / kategori..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="w-24">Qty Scan</TableHead>
                  <TableHead className="w-24">Stok Sistem</TableHead>
                  <TableHead className="w-24">Selisih</TableHead>
                  <TableHead>Update Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Belum ada data scan.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((r) => {
                  const bg = r.unknown
                    ? "bg-red-50 dark:bg-red-950/20"
                    : r.diff === 0
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-amber-50 dark:bg-amber-950/20";
                  return (
                    <TableRow key={r.barcode} className={bg}>
                      <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={r.qty}
                          min={0}
                          onChange={(e) =>
                            updateScanQty(r.barcode, Math.max(0, Number(e.target.value)))
                          }
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>{r.sysStock}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.diff > 0
                              ? "bg-emerald-600 text-white"
                              : r.diff < 0
                                ? "bg-red-600 text-white"
                                : "bg-muted text-muted-foreground"
                          }
                        >
                          {r.diff > 0 ? "+" : ""}
                          {r.diff}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.lastScannedAt
                          ? new Date(r.lastScannedAt).toLocaleString("id-ID")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-red-600"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
