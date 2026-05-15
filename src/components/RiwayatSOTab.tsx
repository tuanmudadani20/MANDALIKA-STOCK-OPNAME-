import { useMemo, useState } from "react";
import { useStore, type HistoryEntry } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, History as HistoryIcon } from "lucide-react";

export function RiwayatSOTab() {
  const { state, deleteHistory } = useStore();
  const [detail, setDetail] = useState<HistoryEntry | null>(null);

  const history = useMemo(
    () => [...state.history].sort((a, b) => b.approvedAt.localeCompare(a.approvedAt)),
    [state.history],
  );

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h3 className="mt-3 font-semibold text-foreground">Belum ada riwayat SO</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Riwayat SO akan otomatis tercatat saat dokumen di-approve.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Riwayat SO ({history.length})</h3>
          <p className="text-xs text-muted-foreground">
            Daftar dokumen SO yang telah di-approve. Tersimpan di browser ini.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tanggal Approve</TableHead>
                <TableHead className="w-24">Total Item</TableHead>
                <TableHead className="w-24">Total Qty</TableHead>
                <TableHead className="w-24">Selisih</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Approved By</TableHead>
                <TableHead className="w-32">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.location}</TableCell>
                  <TableCell className="text-xs">{new Date(h.approvedAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{h.totalItem}</TableCell>
                  <TableCell>{h.totalQty}</TableCell>
                  <TableCell>
                    <Badge className={h.variance > 0 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}>
                      {h.variance}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{h.status.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{h.approvedBy}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setDetail(h)}>
                        <Eye className="mr-1 h-3 w-3" /> Detail
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus riwayat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hapus riwayat SO {h.location} ({new Date(h.approvedAt).toLocaleString("id-ID")})?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteHistory(h.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detail SO — {detail?.location}</DialogTitle>
            <DialogDescription>
              Approved {detail && new Date(detail.approvedAt).toLocaleString("id-ID")} oleh {detail?.approvedBy}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Total Item" v={detail.totalItem} />
                <Stat label="Total Qty" v={detail.totalQty} />
                <Stat label="Selisih" v={detail.variance} />
                <Stat label="Unknown" v={detail.unknown} />
              </div>
              <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-20">Sistem</TableHead>
                      <TableHead className="w-20">Selisih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.rows.map((r) => (
                      <TableRow key={r.barcode}>
                        <TableCell className="font-mono text-xs">{r.barcode}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                        <TableCell>{r.qty}</TableCell>
                        <TableCell>{r.sysStock}</TableCell>
                        <TableCell className={r.diff === 0 ? "" : r.diff > 0 ? "text-emerald-600" : "text-red-600"}>
                          {r.diff > 0 ? "+" : ""}{r.diff}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{v}</div>
    </div>
  );
}
