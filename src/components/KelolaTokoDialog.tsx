import { useState } from "react";
import { useStore, nextStoreCode, type Store } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, X, Plus, Store as StoreIcon } from "lucide-react";

export function KelolaTokoDialog() {
  const { state, addStore, updateStore, deleteStore } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [confirmDel, setConfirmDel] = useState<Store | null>(null);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState(nextStoreCode(state.stores));

  const startEdit = (s: Store) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCode(s.code);
  };
  const saveEdit = () => {
    if (!editingId) return;
    updateStore(editingId, { name: editName.trim(), code: editCode.trim() });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!addStore(newCode, newName)) return;
    setNewName("");
    setNewCode(nextStoreCode([
      ...state.stores,
      { id: "_", code: newCode, name: newName, createdAt: "" },
    ]));
  };

  const sorted = [...state.stores].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => {
        setOpen(o);
        if (o) setNewCode(nextStoreCode(state.stores));
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <StoreIcon className="mr-2 h-4 w-4" /> Kelola Toko
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kelola Daftar Toko</DialogTitle>
            <DialogDescription>
              Tambah, ubah, atau hapus toko. Daftar ini dipakai di seluruh aplikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-24">Kode</th>
                  <th className="px-3 py-2 text-left">Nama Toko</th>
                  <th className="px-3 py-2 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Belum ada toko</td></tr>
                )}
                {sorted.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    {editingId === s.id ? (
                      <>
                        <td className="px-2 py-1">
                          <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="h-8" />
                        </td>
                        <td className="px-2 py-1">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8"
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()} autoFocus />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7">
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-2 py-1 text-right">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => setConfirmDel(s)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-dashed border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Tambah Toko</div>
            <div className="grid grid-cols-[100px_1fr_auto] gap-2">
              <Input placeholder="Kode" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              <Input placeholder="Nama Toko" value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
              <Button onClick={handleAdd}>
                <Plus className="mr-1 h-4 w-4" /> Simpan
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus toko {confirmDel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Data SO toko ini tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmDel) deleteStore(confirmDel.id);
              setConfirmDel(null);
            }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
