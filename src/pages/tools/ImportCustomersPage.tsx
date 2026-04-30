import { useState, useRef } from "react";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  gender?: string;
  birthdate?: string;
  plan_name?: string;
  start_date?: string;
  duration_days?: number;
  value?: number;
  payment_method?: string;
  valid: boolean;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CSV_TEMPLATE = `name,email,whatsapp,phone,gender,birthdate,plan_name,start_date,duration_days,value,payment_method
João Silva,joao@email.com,11999990001,,masculino,1990-05-15,,2026-01-01,90,350,pix
Maria Souza,maria@email.com,11999990002,,feminino,1995-08-22,,2026-01-01,90,350,cartao`;

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

    const name = row["name"] ?? "";
    if (!name) return { name: "", valid: false, error: "Nome obrigatório" };

    return {
      name,
      email: row["email"] || undefined,
      whatsapp: row["whatsapp"] || undefined,
      phone: row["phone"] || undefined,
      gender: row["gender"] || undefined,
      birthdate: row["birthdate"] || undefined,
      plan_name: row["plan_name"] || undefined,
      start_date: row["start_date"] || format(new Date(), "yyyy-MM-dd"),
      duration_days: parseInt(row["duration_days"]) || 90,
      value: parseFloat(row["value"]) || 0,
      payment_method: row["payment_method"] || "pix",
      valid: true,
    };
  });
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_alunos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ImportCustomersPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Formato inválido", description: "Envie um arquivo .csv", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setImported(null);
    setErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!user || rows.length === 0) return;
    const valid = rows.filter((r) => r.valid);
    if (valid.length === 0) { toast({ title: "Nenhuma linha válida para importar", variant: "destructive" }); return; }

    setImporting(true);
    const errs: string[] = [];
    let count = 0;

    for (const row of valid) {
      // Cria customer
      const { data: customer, error: custErr } = await supabase
        .from("customers")
        .insert({
          coach_id: user.id,
          name: row.name,
          email: row.email || null,
          whatsapp: row.whatsapp || null,
          phone: row.phone || null,
          gender: row.gender || null,
          birthdate: row.birthdate || null,
        })
        .select("id")
        .single();

      if (custErr || !customer) { errs.push(`${row.name}: ${custErr?.message ?? "erro ao criar"}`); continue; }

      // Busca plano pelo nome se informado
      let planId: string | null = null;
      if (row.plan_name) {
        const { data: plan } = await supabase
          .from("plans")
          .select("id")
          .eq("coach_id", user.id)
          .ilike("name", row.plan_name)
          .maybeSingle();
        planId = plan?.id ?? null;
      }

      // Cria consultoria
      const startDate = row.start_date ?? format(new Date(), "yyyy-MM-dd");
      const endDate = format(addDays(new Date(startDate), row.duration_days ?? 90), "yyyy-MM-dd");
      const { error: consErr } = await supabase.from("consultorias").insert({
        coach_id: user.id,
        customer_id: customer.id,
        plan_id: planId,
        status: "active",
        start_date: startDate,
        end_date: endDate,
        value: row.value ?? 0,
        payment_method: row.payment_method ?? "pix",
        payment_status: "pending",
      });

      if (consErr) { errs.push(`${row.name}: consultoria — ${consErr.message}`); } else { count++; }
    }

    setImporting(false);
    setImported(count);
    setErrors(errs);
    toast({ title: `${count} aluno(s) importado(s) com sucesso!` });
  };

  const clear = () => { setRows([]); setFileName(""); setImported(null); setErrors([]); };
  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Importar Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Importe alunos em massa via arquivo CSV</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Passo 1 */}
          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              <h3 className="font-semibold text-foreground">Baixar template CSV</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 ml-8">
              Baixe o modelo, preencha com seus alunos e salve como <code className="bg-muted px-1 rounded">.csv</code>.
            </p>
            <Button variant="outline" className="gap-2 ml-8" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Baixar template CSV
            </Button>
          </div>

          {/* Passo 2 */}
          <div className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
              <h3 className="font-semibold text-foreground">Enviar arquivo preenchido</h3>
            </div>

            {!fileName ? (
              <div
                className={cn(
                  "mt-3 rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
                  dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium text-foreground">Clique ou arraste seu arquivo CSV aqui</p>
                <p className="text-xs text-muted-foreground mt-1">Apenas arquivos .csv são aceitos</p>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                <FileText className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} linha(s) · <span className="text-green-400">{validCount} válidas</span>
                    {invalidCount > 0 && <span className="text-red-400"> · {invalidCount} com erro</span>}
                  </p>
                </div>
                <button onClick={clear} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Preview de linhas */}
          {rows.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview — {rows.length} linhas</p>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b border-border">
                    <tr>
                      {["Status", "Nome", "E-mail", "WhatsApp", "Plano", "Início", "Dias", "Valor"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={cn("border-b border-border", !row.valid && "bg-red-500/5")}>
                        <td className="px-3 py-2">
                          {row.valid
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            : <AlertCircle className="w-3.5 h-3.5 text-red-400" title={row.error} />
                          }
                        </td>
                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{row.name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.email || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.whatsapp || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.plan_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.start_date || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.duration_days ?? 90}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.value ? `R$ ${row.value}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Passo 3 — importar */}
          {rows.length > 0 && (
            <div className="rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                <h3 className="font-semibold text-foreground">Confirmar importação</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8 mb-4">
                Serão importados <strong>{validCount}</strong> aluno(s).
                {invalidCount > 0 && <span className="text-red-400"> {invalidCount} linha(s) com erro serão ignoradas.</span>}
              </p>
              <div className="ml-8">
                <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
                  {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importando...</> : <><Upload className="w-4 h-4" />Importar {validCount} aluno(s)</>}
                </Button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {imported !== null && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="font-semibold text-green-400">{imported} aluno(s) importado(s) com sucesso!</p>
              </div>
              {errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-red-400 font-medium mb-1">{errors.length} erro(s):</p>
                  <ul className="text-xs text-red-400/80 space-y-0.5 list-disc list-inside">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCustomersPage;
