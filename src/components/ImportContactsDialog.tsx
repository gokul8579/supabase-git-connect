// src/components/ImportContactsDialog.tsx
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

type TableName = "customers" | "leads";
type ParsedRow = Record<string, any>;

// Sentinal for unmapped header selection (must be non-empty string)
const UNMAPPED = "__unmapped";

const SAMPLE_CUSTOMER_COLUMNS = [
  "name", "company", "email", "phone", "address", "city", "state", "postal_code", "country", "notes",
];

const SAMPLE_LEAD_COLUMNS = [
  "name", "company", "email", "phone", "source", "status", "interest_level", "notes", "assigned_to",
];

//interface ImportContactsDialogProps {
  //onImported?: () => Promise<void> | (() => void);
//}

interface ImportContactsDialogProps {
  onImported?: () => Promise<void> | (() => void);
  fixedTable?: "customers" | "leads";
}


export default function ImportContactsDialog({ onImported, fixedTable }: ImportContactsDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const table: TableName = fixedTable ?? "customers";
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [detectDuplicates, setDetectDuplicates] = useState<boolean>(true);
  const [duplicatesPreview, setDuplicatesPreview] = useState<ParsedRow[]>([]);
  const [inserting, setInserting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [insertResult, setInsertResult] = useState<{ success: number; failed: number; errors: any[] } | null>(null);

  // suggested map typed explicitly to avoid deep types
  const suggestedMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const h of headers) {
      const lower = h.trim().toLowerCase();
      if (/(email|e-mail)/.test(lower)) map[h] = "email";
      else if (/(phone|mobile|contact)/.test(lower)) map[h] = "phone";
      else if (/(name|full name)/.test(lower)) map[h] = "name";
      else if (/(company|organisation|organization)/.test(lower)) map[h] = "company";
      else if (/(address)/.test(lower)) map[h] = "address";
      else if (/(city)/.test(lower)) map[h] = "city";
      else if (/(state)/.test(lower)) map[h] = "state";
      else if (/(postal|pin|zip)/.test(lower)) map[h] = "postal_code";
      else if (/(country)/.test(lower)) map[h] = "country";
      else if (/(source)/.test(lower)) map[h] = "source";
      else if (/(status)/.test(lower)) map[h] = "status";
      else if (/(interest|level)/.test(lower)) map[h] = "interest_level";
      else if (/(assigned|owner)/.test(lower)) map[h] = "assigned_to";
      else map[h] = UNMAPPED; // unmapped sentinel
    }
    return map;
  }, [headers]);

  React.useEffect(() => {
    setMapping((prev) => {
      if (!headers.length) return {};
      const newMap: Record<string, string> = {};
      for (const h of headers) {
        newMap[h] = prev[h] ?? suggestedMap[h] ?? UNMAPPED;
      }
      return newMap;
    });
    setPreviewRows([]);
    setDuplicatesPreview([]);
  }, [headers]); // eslint-disable-line

  // parse file using SheetJS
  // replace your existing handleFile with this
const handleFile = async (file: File | null) => {
  if (!file) return;
  setFileName(file.name);

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // get raw 2D array of the sheet (every row as array)
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (!rawRows || rawRows.length === 0) {
      toast.error("File contains no rows");
      return;
    }

    // find the first row that has at least one non-empty cell -> treat as header row
    let headerRowIndex = -1;
    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r] || [];
      const nonEmptyCount = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;
      if (nonEmptyCount > 0) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      toast.error("Could not detect header row in the sheet");
      return;
    }

    // determine maximum column count across all rows (so we don't miss empty header cells)
    let maxCols = 0;
    for (const row of rawRows) {
      if (Array.isArray(row) && row.length > maxCols) maxCols = row.length;
    }
    if (maxCols === 0) maxCols = (rawRows[headerRowIndex] || []).length || 1;

    // build headers from header row, pad unnamed columns as Column_#
    const headerRow = rawRows[headerRowIndex] || [];
    const fileHeaders = Array.from({ length: maxCols }, (_, i) => {
      const val = headerRow[i];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
      return `Column_${i + 1}`;
    });

    // Convert data rows to objects using our forced headers; range starts after header row
    const dataRows = XLSX.utils.sheet_to_json(sheet, {
      header: fileHeaders,
      range: headerRowIndex + 1,
      defval: "",
      blankrows: false,
    }) as Record<string, any>[];

    if (!dataRows || dataRows.length === 0) {
      toast.error("No data rows found after header row");
      return;
    }

    // debugging: log headers so you can verify in console
    // open DevTools -> Console to check this if still unexpected
    // eslint-disable-next-line no-console
    console.info("Detected import headers:", fileHeaders);

    setHeaders(fileHeaders);
    setRawRows(dataRows);
    setPreviewRows(dataRows.slice(0, 10));
    toast.success(`${dataRows.length} rows parsed from ${file.name}`);
  } catch (err) {
    console.error("Import parse error:", err);
    toast.error("Failed to parse file (check file format)");
  }
};




  // Build mapped object to insert into DB
  const buildMappedRow = (row: ParsedRow) => {
    const mapped: Record<string, any> = {};
    const extraParts: string[] = [];

    for (const h of headers) {
      const rawVal = row[h];
      const sel = mapping[h] ?? UNMAPPED;
      const target = sel === UNMAPPED ? "" : String(sel).trim();

      if (target) {
        if (table === "leads" && target === "interest_level") {
          const num = Number(rawVal);
          mapped[target] = isNaN(num) ? null : num;
        } else {
          mapped[target] = rawVal === "" ? null : String(rawVal).trim();
        }
      } else {
        if (rawVal !== "" && rawVal != null) {
          extraParts.push(`${h}: ${rawVal}`);
        }
      }
    }

    if (!mapped.name) {
      mapped.name = mapped.company || mapped.email || "Unknown";
    }

    const mappedNotes = mapped.notes ? String(mapped.notes) : "";
    const extraNotes = extraParts.join(" | ");
    mapped.notes = [mappedNotes, extraNotes].filter(Boolean).join(" | ") || null;

    // Defaults for mandatory lead fields
if (table === "leads") {
  if (!mapped.source) mapped.source = "other";
  if (!mapped.status) mapped.status = "new";
  if (!mapped.interest_level) mapped.interest_level = 3;
}


// Defaults for mandatory lead fields
if (table === "leads") {
  if (!mapped.source) mapped.source = "other";
  if (!mapped.status) mapped.status = "new";
  if (!mapped.interest_level) mapped.interest_level = 3;
}

return mapped;


    return mapped;
  };

  // Duplicate detection using email / phone
  const detectPossibleDuplicates = async (rowsToCheck: ParsedRow[]) => {
    if (!rowsToCheck || rowsToCheck.length === 0) return [];
    const mappedRows = rowsToCheck.map((r) => buildMappedRow(r));
    const emails = new Set<string>();
    const phones = new Set<string>();
    mappedRows.forEach((mr) => {
      if (mr.email) emails.add(String(mr.email).toLowerCase());
      if (mr.phone) phones.add(String(mr.phone));
    });

    const orClauses: string[] = [];
    if (emails.size) {
      const emailArr = Array.from(emails).map((e) => `email.eq.${encodeURIComponent(e)}`);
      orClauses.push(...emailArr);
    }
    if (phones.size) {
      const phoneArr = Array.from(phones).map((p) => `phone.eq.${encodeURIComponent(p)}`);
      orClauses.push(...phoneArr);
    }

    if (orClauses.length === 0) return [];

    const { data: existing } = await supabase
      .from(table)
      .select("*")
      .or(orClauses.join(","))
      .limit(1000);

    return existing || [];
  };

  const runDuplicateCheck = async () => {
    if (!detectDuplicates) {
      setDuplicatesPreview([]);
      return;
    }
    const existing = await detectPossibleDuplicates(rawRows.slice(0, 200)); // sample check
    setDuplicatesPreview(existing || []);
    toast.success(`Found ${existing?.length || 0} existing records that may match (sample check)`);
  };

  // perform import to supabase with batching
  const runImport = async () => {
    if (!rawRows.length) {
      toast.error("No rows to import");
      return;
    }
    setInsertResult(null);
    setInserting(true);
    setProgress({ done: 0, total: rawRows.length });

    const transformed = rawRows.map(buildMappedRow);

    let existingMap = new Map<string, any>();
    if (detectDuplicates) {
      const emails = Array.from(new Set(transformed.map(r => r.email).filter(Boolean)));
      const phones = Array.from(new Set(transformed.map(r => r.phone).filter(Boolean)));

      // FIX: avoid deep type instantiation by explicitly typing everything as any
const fetchExisting = async (vals: string[], field: string): Promise<any[]> => {
  if (!vals.length) return [];
  const CHUNK = 200;
  const out: any[] = [];

  for (let i = 0; i < vals.length; i += CHUNK) {
    const chunk = vals.slice(i, i + CHUNK);

    // Cast entire supabase call to any to prevent deep TS types
    const res: any = await (supabase as any)
      .from(table as any)
      .select("*")
      .in(field as any, chunk);

    if (res?.data) out.push(...res.data);
  }

  return out;
};


      const [existingByEmail, existingByPhone] = await Promise.all([
        fetchExisting(emails, "email"),
        fetchExisting(phones, "phone"),
      ]);
      [...existingByEmail, ...existingByPhone].forEach((row: any) => {
        if (row.email) existingMap.set(`email:${String(row.email).toLowerCase()}`, row);
        if (row.phone) existingMap.set(`phone:${String(row.phone)}`, row);
      });
    }

    const batches: any[][] = [];
    for (let i = 0; i < transformed.length; i += batchSize) {
      batches.push(transformed.slice(i, i + batchSize));
    }

    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];

      const toInsert = batch.filter((r) => {
        if (!detectDuplicates) return true;
        const keyEmail = r.email ? `email:${String(r.email).toLowerCase()}` : null;
        const keyPhone = r.phone ? `phone:${String(r.phone)}` : null;
        if (keyEmail && existingMap.has(keyEmail)) return false;
        if (keyPhone && existingMap.has(keyPhone)) return false;
        return true;
      });

      if (toInsert.length === 0) {
        setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
        continue;
      }

      const payload = toInsert.map((r) => ({ ...r, user_id: userId }));

      const { data, error } = await supabase.from(table).insert(payload).select();
      if (error) {
        failed += toInsert.length;
        errors.push({ batch: b, error });
        console.error("Insert error for batch", b, error);
      } else {
        success += (data || []).length;
      }

      setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
    }

    setInserting(false);
    setInsertResult({ success, failed, errors });
    toast.success(`Import complete — ${success} inserted, ${failed} failed.`);

    // call optional callback to refresh listing UI
    try { await onImported?.(); } catch (e) { /* ignore */ }
  };

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    await handleFile(file);
    setTimeout(runDuplicateCheck, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Import CSV / XLSX</Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Contacts (Customers / Leads)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            

            <div>
              <Label>Batch Size (rows per insert)</Label>
              <Input
                type="number"
                value={String(batchSize)}
                onChange={(e) => setBatchSize(Math.max(10, Number(e.target.value || 50)))}
              />
            </div>
          </div>

          <div>
            <Label>Upload CSV / XLSX</Label>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={onFileInput}
            />
            {fileName && <div className="text-sm text-muted-foreground mt-1">Parsed file: {fileName} — {rawRows.length} rows</div>}
          </div>

          {headers.length > 0 && (
            <div>
              <Label>Column mapping (CSV header → DB column)</Label>
              <ScrollArea className="h-64 border rounded p-2 overflow-auto">
                <div className="min-w-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left">CSV Header</th>
                      <th className="text-left">Map to DB column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h) => (
                      <tr key={h}>
                        <td className="py-1">{h}</td>
                        <td>
                          <Select
                            value={mapping[h] ?? UNMAPPED}
                            onValueChange={(val) => setMapping((m) => ({ ...m, [h]: val }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(table === "customers" ? SAMPLE_CUSTOMER_COLUMNS : SAMPLE_LEAD_COLUMNS)
                                .map((col) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
                              <SelectItem value={UNMAPPED}>-- leave unmapped (goes to notes) --</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </ScrollArea>
            </div>
          )}

          {previewRows.length > 0 && (
            <div>
              <Label>Preview (first 10 rows)</Label>
              <ScrollArea className="max-h-48 border rounded p-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {headers.map(h => <th key={h} className="text-left">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        {headers.map(h => <td key={h} className="py-1 text-muted-foreground">{String(r[h] ?? "")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Checkbox checked={detectDuplicates} onCheckedChange={(v) => setDetectDuplicates(Boolean(v))} />
            <div className="text-sm">Detect and skip duplicates (by email/phone)</div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={runDuplicateCheck}>Run Duplicate Check</Button>
            </div>
          </div>

          {duplicatesPreview.length > 0 && (
            <div>
              <Label>Existing matches found (sample)</Label>
              <ScrollArea className="max-h-40 border rounded p-2 text-xs">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>id</th><th>name</th><th>email</th><th>phone</th><th>notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicatesPreview.map((d:any)=>(<tr key={d.id}>
                      <td>{d.id}</td>
                      <td>{d.name}</td>
                      <td>{d.email}</td>
                      <td>{d.phone}</td>
                      <td>{String(d.notes || "").slice(0,60)}</td>
                    </tr>))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setOpen(false); setHeaders([]); setRawRows([]); setFileName(null); }}>
              Close
            </Button>
            <Button onClick={runImport} disabled={inserting || rawRows.length === 0}>
              {inserting ? `Importing... ${progress.done}/${progress.total}` : `Import ${rawRows.length} rows`}
            </Button>
          </div>

          {insertResult && (
            <div className="border rounded p-2 text-sm">
              <div>Inserted: {insertResult.success}</div>
              <div>Failed: {insertResult.failed}</div>
              {insertResult.errors.length > 0 && (
                <details>
                  <summary className="cursor-pointer">Errors ({insertResult.errors.length})</summary>
                  <pre className="text-xs">{JSON.stringify(insertResult.errors, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
