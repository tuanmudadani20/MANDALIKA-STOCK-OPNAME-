import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StockOpnameTab } from "@/components/StockOpnameTab";
import { MasterDataTab } from "@/components/MasterDataTab";
import { JadwalSOTab } from "@/components/JadwalSOTab";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[#1a1a2e] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-[#c9a84c]">Mandalika</span> Stock Opname
            </h1>
            <p className="text-xs text-white/60">Browser-based stock counting</p>
          </div>
          <div className="text-sm text-white/70">v2.0</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="so" className="w-full">
          <TabsList>
            <TabsTrigger value="so">Stock Opname</TabsTrigger>
            <TabsTrigger value="master">Master Data</TabsTrigger>
            <TabsTrigger value="jadwal">Jadwal SO</TabsTrigger>
          </TabsList>
          <TabsContent value="so" className="mt-6">
            <StockOpnameTab />
          </TabsContent>
          <TabsContent value="master" className="mt-6">
            <MasterDataTab />
          </TabsContent>
          <TabsContent value="jadwal" className="mt-6">
            <JadwalSOTab />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
