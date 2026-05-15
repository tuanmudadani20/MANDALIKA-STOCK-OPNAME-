import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_MASTER_PRODUCTS, type MasterProduct } from "@/data/masterData";
import {
  parseMasterCsv,
  validateMasterCsv,
  previewMasterCsv,
  exportMasterCsv,
  downloadFile,
} from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Save, Trash2, RotateCcw, Upload, Download, Loader2 } from "lucide-react";

const fmtRp = (n: number) => (n > 0 ? n.toLocaleString("id-ID") : "0");

export function MasterDataTab() {
  const { state, updateMasterPrices, addMasterProduct, deleteMasterProduct, resetMasterToDefault } =
    useStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("__all__");
  const [dirty, setDirty] = useState<Record<string, number>>({});
  const [addOpen, setAddOpen] = useState(false);

  const products = useMemo(() => Object.values(state.master), [state.master]);
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => (catFilter === "__all__" ? true : p.category === catFilter))
      .filter(
        (p) =>
          !q ||
          p.barcode.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
      .sort((a, b) =>
        a.category === b.category
          ? a.name.localeCompare(b.name)
          : a.category.localeCompare(b.category),
      );
  }, [products, search, catFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, MasterProduct[]> = {};
    for (const p of filtered) (g[p.category] ||= []).push(p);
    return g;
  }, [filtered]);

  const dirtyCount = Object.keys(dirty).length;

  const handlePriceChange = (barcode: string, val: string) => {
    const num = Math.max(0, Number(val.replace(/[^\d]/g, "")) || 0);
    setDirty((d) => {
      const orig = state.master[barcode]?.price ?? 0;
      const next = { ...d };
      if (num === orig) delete next[barcode];
      else next[barcode] = num;
      return next;
    });
  };

  const saveAll = () => {
    if (dirtyCount === 0) return;
    updateMasterPrices(dirty);
    setDirty({});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Input
          placeholder="Cari barcode / nama / kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{filtered.length} item</Badge>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => setAddOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Tambah Produk Baru
          </Button>
          {dirtyCount > 0 && (
            <Button onClick={saveAll} className="bg-amber-500 text-white hover:bg-amber-600">
              <Save className="mr-2 h-4 w-4" /> Simpan Perubahan ({dirtyCount})
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {Object.keys(grouped).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            Tidak ada produk yang cocok.
          </div>
        )}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
              <span className="font-semibold">{cat}</span>
              <span className="text-xs text-muted-foreground">({items.length} item)</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Barcode</TableHead>
                    <TableHead className="w-[300px]">Nama Produk</TableHead>
                    <TableHead className="w-[80px]">Ukuran</TableHead>
                    <TableHead className="w-[140px]">Kategori</TableHead>
                    <TableHead className="w-[150px]">Harga (Rp)</TableHead>
                    <TableHead className="w-[70px]">Unit</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => {
                    const isDirty = p.barcode in dirty;
                    const value = isDirty ? dirty[p.barcode] : p.price;
                    return (
                      <TableRow
                        key={p.barcode}
                        className={isDirty ? "bg-amber-50 dark:bg-amber-950/20" : ""}
                      >
                        <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.size}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.category}</TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={fmtRp(value)}
                            onChange={(e) => handlePriceChange(p.barcode, e.target.value)}
                            className="h-8 w-32 text-right font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-xs">{p.unit}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Hapus <strong>{p.name}</strong> dari master? Data scan yang
                                  sudah ada tidak akan hilang, tapi produk ini tidak akan dikenali
                                  saat scan berikutnya.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    deleteMasterProduct(p.barcode);
                                    setDirty((d) => {
                                      const n = { ...d };
                                      delete n[p.barcode];
                                      return n;
                                    });
                                  }}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
        <span>{products.length} item terdaftar</span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <RotateCcw className="mr-1 h-3 w-3" /> Reset ke Default
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset master ke default?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua perubahan harga, produk tambahan, dan produk yang dihapus akan dikembalikan
                ke {DEFAULT_MASTER_PRODUCTS.length} item bawaan. Tindakan ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetMasterToDefault();
                  setDirty({});
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        existingBarcodes={new Set(Object.keys(state.master))}
        onAdd={(p) => addMasterProduct(p)}
      />
    </div>
  );
}

function AddProductDialog({
  open,
  onOpenChange,
  categories,
  existingBarcodes,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
  existingBarcodes: Set<string>;
  onAdd: (p: MasterProduct) => boolean;
}) {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [unit, setUnit] = useState("PCS");

  const reset = () => {
    setBarcode("");
    setName("");
    setSize("");
    setCategory("");
    setNewCategory("");
    setPrice("0");
    setUnit("PCS");
  };

  const dupErr = barcode && existingBarcodes.has(barcode.trim().toUpperCase());

  const submit = () => {
    const bc = barcode.trim().toUpperCase();
    const nm = name.trim().toUpperCase();
    const sz = size.trim().toUpperCase();
    const cat = category === "__new__" ? newCategory.trim().toUpperCase() : category;
    if (!bc) return toast.warning("Barcode wajib diisi");
    if (existingBarcodes.has(bc)) return toast.error("Barcode sudah terdaftar");
    if (!nm) return toast.warning("Nama wajib diisi");
    if (!sz) return toast.warning("Ukuran wajib diisi");
    if (!cat) return toast.warning("Kategori wajib dipilih");
    const ok = onAdd({
      barcode: bc,
      name: nm,
      size: sz,
      category: cat,
      price: Math.max(0, Number(price) || 0),
      unit,
    });
    if (ok) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Produk Baru</DialogTitle>
          <DialogDescription>Lengkapi data produk untuk ditambahkan ke master.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Barcode *</label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.toUpperCase())}
              placeholder="MIS. PP100E-XXX"
              className="font-mono"
            />
            {dupErr && <p className="mt-1 text-xs text-red-600">Barcode sudah terdaftar</p>}
          </div>
          <div>
            <label className="text-xs font-medium">Nama Produk *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="MIS. NEW SCENT - 100ML EDP"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Ukuran *</label>
            <Input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="100ML / 10ML / 2ML / PENUNJANG"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Kategori *</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value="__new__">+ Kategori Baru...</SelectItem>
              </SelectContent>
            </Select>
            {category === "__new__" && (
              <Input
                className="mt-2"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value.toUpperCase())}
                placeholder="Nama kategori baru"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Harga</label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Unit</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="SET">SET</SelectItem>
                  <SelectItem value="LUSIN">LUSIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit}>Tambah Produk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
