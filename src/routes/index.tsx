import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StockOpnameTab } from "@/components/StockOpnameTab";
import { MasterDataTab } from "@/components/MasterDataTab";
import { JadwalSOTab } from "@/components/JadwalSOTab";
import { RiwayatSOTab } from "@/components/RiwayatSOTab";
import { Toaster } from "@/components/ui/sonner";
import { Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#1a1a2e] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-[#c9a84c]">Mandalika</span> Stock Opname
            </h1>
            <p className="text-xs text-white/60">Browser-based stock counting</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                online
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-red-500/20 text-red-300"
              }`}
              title={online ? "Terhubung ke internet" : "Offline — data tetap tersimpan lokal"}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Online" : "Offline — Data tersimpan lokal"}
            </span>
            <span className="text-sm text-white/70">v2.1</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="so" className="w-full">
          <TabsList className="bg-muted">
            <TabsTrigger
              value="so"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#c9a84c] data-[state=active]:bg-background data-[state=active]:font-semibold"
            >
              Stock Opname
            </TabsTrigger>
            <TabsTrigger
              value="master"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#c9a84c] data-[state=active]:bg-background data-[state=active]:font-semibold"
            >
              Master Data
            </TabsTrigger>
            <TabsTrigger
              value="jadwal"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#c9a84c] data-[state=active]:bg-background data-[state=active]:font-semibold"
            >
              Jadwal SO
            </TabsTrigger>
            <TabsTrigger
              value="riwayat"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#c9a84c] data-[state=active]:bg-background data-[state=active]:font-semibold"
            >
              Riwayat SO
            </TabsTrigger>
          </TabsList>
          <TabsContent value="so" className="mt-6"><StockOpnameTab /></TabsContent>
          <TabsContent value="master" className="mt-6"><MasterDataTab /></TabsContent>
          <TabsContent value="jadwal" className="mt-6"><JadwalSOTab /></TabsContent>
          <TabsContent value="riwayat" className="mt-6"><RiwayatSOTab /></TabsContent>
        </Tabs>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
