export const LOCATIONS = [
  "GUDANG CIBUBUR",
  "GUDANG PUSAT",
  "LAIN - LAIN",
  "MANDALIKA AEON BSD",
  "MANDALIKA AEON DELTAMAS",
  "MANDALIKA AEON SENTUL",
  "MANDALIKA BOTANI",
  "MANDALIKA BXC",
  "MANDALIKA CCM",
  "MANDALIKA DMB",
  "MANDALIKA DP MALL",
  "MANDALIKA KARAWACI",
  "MANDALIKA KOKAS",
  "MANDALIKA KUNCIT",
  "MANDALIKA LMK",
  "MANDALIKA LW ALSUT",
  "MANDALIKA LW BALI",
  "MANDALIKA MKG",
  "MANDALIKA PASKAL 23",
  "MANDALIKA PMB",
  "MANDALIKA PMJ",
  "MANDALIKA PMS",
  "MANDALIKA PVJ 1",
  "MANDALIKA PVJ 2",
  "MANDALIKA QUEEN",
  "MANDALIKA SMB",
  "MANDALIKA SMS",
  "MANDALIKA TSM CIBUBUR",
  "MANDALIKA TSM MAKASSAR",
] as const;

export interface ScheduleStore {
  id: string;
  nama: string;
  mall: string;
  area: string;
  wil: string;
  tgl: number;
  locationKey: string;
}

export const SCHEDULE_STORES: ScheduleStore[] = [
  { id: "T01", nama: "AEON Sentul", mall: "AEON Mall Sentul", area: "Kab. Bogor", wil: "Bogor", tgl: 11, locationKey: "MANDALIKA AEON SENTUL" },
  { id: "T02", nama: "Botani", mall: "Botani Square", area: "Kota Bogor", wil: "Bogor", tgl: 12, locationKey: "MANDALIKA BOTANI" },
  { id: "T03", nama: "CCM", mall: "Cibinong City Mall", area: "Kab. Bogor", wil: "Bogor", tgl: 13, locationKey: "MANDALIKA CCM" },
  { id: "T04", nama: "TSM Cibubur", mall: "Trans Studio Mall Cibubur", area: "Kota Depok", wil: "Bogor", tgl: 14, locationKey: "MANDALIKA TSM CIBUBUR" },
  { id: "T05", nama: "AEON Deltamas", mall: "AEON Mall Deltamas", area: "Kab. Bekasi", wil: "Bekasi", tgl: 15, locationKey: "MANDALIKA AEON DELTAMAS" },
  { id: "T06", nama: "SMB", mall: "Summarecon Mall Bekasi", area: "Kota Bekasi", wil: "Bekasi", tgl: 16, locationKey: "MANDALIKA SMB" },
  { id: "T07", nama: "PMB", mall: "Pakuwon Mall Bekasi", area: "Kota Bekasi", wil: "Bekasi", tgl: 17, locationKey: "MANDALIKA PMB" },
  { id: "T08", nama: "MKG", mall: "Summarecon Mall Kelapa Gading", area: "Jakarta Utara", wil: "Jakarta", tgl: 18, locationKey: "MANDALIKA MKG" },
  { id: "T09", nama: "Kokas", mall: "Kota Kasablanka", area: "Jakarta Selatan", wil: "Jakarta", tgl: 19, locationKey: "MANDALIKA KOKAS" },
  { id: "T10", nama: "Kuncit", mall: "Kuningan City", area: "Jakarta Selatan", wil: "Jakarta", tgl: 20, locationKey: "MANDALIKA KUNCIT" },
  { id: "T11", nama: "LMK", mall: "Lippo Mall Kemang", area: "Jakarta Selatan", wil: "Jakarta", tgl: 21, locationKey: "MANDALIKA LMK" },
  { id: "T12", nama: "BXC", mall: "Bintaro Xchange", area: "Kota Tangerang Selatan", wil: "Tangerang", tgl: 22, locationKey: "MANDALIKA BXC" },
  { id: "T13", nama: "LW Alsut", mall: "LW Alam Sutera", area: "Kota Tangerang Selatan", wil: "Tangerang", tgl: 23, locationKey: "MANDALIKA LW ALSUT" },
  { id: "T14", nama: "AEON BSD", mall: "AEON Mall BSD", area: "Kab. Tangerang", wil: "Tangerang", tgl: 24, locationKey: "MANDALIKA AEON BSD" },
  { id: "T15", nama: "SMS", mall: "Summarecon Mall Serpong", area: "Kab. Tangerang", wil: "Tangerang", tgl: 25, locationKey: "MANDALIKA SMS" },
  { id: "T16", nama: "Karawaci", mall: "Supermal Karawaci", area: "Kab. Tangerang", wil: "Tangerang", tgl: 26, locationKey: "MANDALIKA KARAWACI" },
  { id: "B01", nama: "PVJ 1", mall: "Paris Van Java", area: "Kota Bandung", wil: "Bandung", tgl: 6, locationKey: "MANDALIKA PVJ 1" },
  { id: "B02", nama: "PVJ 2", mall: "Paris Van Java", area: "Kota Bandung", wil: "Bandung", tgl: 7, locationKey: "MANDALIKA PVJ 2" },
  { id: "B03", nama: "Paskal 23", mall: "23 Paskal", area: "Kota Bandung", wil: "Bandung", tgl: 8, locationKey: "MANDALIKA PASKAL 23" },
  { id: "G01", nama: "Gudang Cibubur", mall: "Gudang Cibubur", area: "", wil: "Gudang", tgl: 29, locationKey: "GUDANG CIBUBUR" },
  { id: "G02", nama: "Marketplace", mall: "Gudang Marketplace", area: "", wil: "Gudang", tgl: 30, locationKey: "GUDANG PUSAT" },
];

export const WIL_COLORS: Record<string, string> = {
  Bogor: "#3b82f6",
  Bekasi: "#10b981",
  Jakarta: "#f97316",
  Tangerang: "#a855f7",
  Bandung: "#ec4899",
  Gudang: "#6b7280",
};
