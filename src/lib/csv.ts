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
  name: ["nama", "name"],
  category: ["kategori", "category"],
  unit: ["satuan", "unit"],
  price: ["harga", "price"],
};

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) if (row[k] !== undefined) return row[k];
  return "";
}

export function parseMasterCsv(text: string): MasterProduct[] {
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      barcode: pick(r, MASTER_KEYS.barcode).trim().toUpperCase(),
      name: pick(r, MASTER_KEYS.name),
      category: pick(r, MASTER_KEYS.category),
      unit: pick(r, MASTER_KEYS.unit) || "PCS",
      price: Number(pick(r, MASTER_KEYS.price).replace(/[^\d.-]/g, "")) || 0,
      source: "import",
    }))
    .filter((p) => p.barcode);
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

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
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
