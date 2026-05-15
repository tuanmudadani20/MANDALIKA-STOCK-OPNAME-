import type { MasterProduct } from "@/data/masterData";

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];
  const headers = splitLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] || "").trim()));
    return row;
  });
}

export function getCsvHeaders(text: string): string[] {
  const firstLine = text.replace(/\r\n/g, "\n").split("\n")[0] || "";
  return splitLine(firstLine).map((h) => h.trim().toLowerCase());
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const MASTER_KEYS = {
  barcode: ["barcode"],
  name: ["nama", "name", "nama_produk"],
  size: ["ukuran", "size"],
  category: ["kategori", "category"],
  unit: ["satuan", "unit"],
  price: ["harga", "price"],
};

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k];
  return "";
}

function hasAny(headers: string[], keys: string[]) {
  return keys.some((k) => headers.includes(k));
}

export function validateMasterCsv(text: string): { ok: true } | { ok: false; error: string } {
  const headers = getCsvHeaders(text);
  if (headers.length === 0) return { ok: false, error: "File CSV kosong." };
  if (!hasAny(headers, MASTER_KEYS.barcode))
    return { ok: false, error: "Kolom 'Barcode' tidak ditemukan. Periksa format file CSV Anda." };
  if (!hasAny(headers, MASTER_KEYS.name))
    return { ok: false, error: "Kolom 'Nama Produk' tidak ditemukan. Periksa format file CSV Anda." };
  if (!hasAny(headers, MASTER_KEYS.category))
    return { ok: false, error: "Kolom 'Kategori' tidak ditemukan. Periksa format file CSV Anda." };
  return { ok: true };
}

export function parseMasterCsv(text: string): MasterProduct[] {
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      barcode: pick(r, MASTER_KEYS.barcode).trim().toUpperCase(),
      name: pick(r, MASTER_KEYS.name),
      size: pick(r, MASTER_KEYS.size),
      category: pick(r, MASTER_KEYS.category),
      unit: pick(r, MASTER_KEYS.unit) || "PCS",
      price: Number(pick(r, MASTER_KEYS.price).replace(/[^\d.-]/g, "")) || 0,
    }))
    .filter((p) => p.barcode);
}

export function previewMasterCsv(text: string, limit = 5) {
  const headers = getCsvHeaders(text);
  const rows = parseCsv(text);
  const preview = rows.slice(0, limit).map((r) => ({
    barcode: pick(r, MASTER_KEYS.barcode),
    name: pick(r, MASTER_KEYS.name),
    size: pick(r, MASTER_KEYS.size),
    category: pick(r, MASTER_KEYS.category),
    unit: pick(r, MASTER_KEYS.unit),
    price: pick(r, MASTER_KEYS.price),
  }));
  return { headers, total: rows.length, preview };
}

export function parseStockCsv(
  text: string,
): { barcode: string; systemStock: number }[] {
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      barcode: (r["barcode"] || "").trim().toUpperCase(),
      systemStock:
        Number(
          (r["stok_sistem"] ?? r["system_stock"] ?? r["stok"] ?? r["stock"] ?? "0")
            .toString()
            .replace(/[^\d.-]/g, ""),
        ) || 0,
    }))
    .filter((r) => r.barcode);
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadFile(filename: string, content: string | Blob, mime = "text/csv") {
  const blob = typeof content === "string" ? new Blob([content], { type: `${mime};charset=utf-8;` }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function exportMasterCsv(products: MasterProduct[]): string {
  const header = ["barcode", "nama", "ukuran", "kategori", "harga", "unit"];
  const rows = products.map((p) => [p.barcode, p.name, p.size, p.category, p.price, p.unit]);
  return toCsv([header, ...rows]);
}
