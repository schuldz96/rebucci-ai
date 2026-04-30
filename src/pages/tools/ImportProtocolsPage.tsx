import { useState, useRef } from "react";
import { Upload, Download, Loader2, CheckCircle2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Template ─────────────────────────────────────────────────────────────────

const WORKOUT_TEMPLATE = `type,name,description,goal,level,weeks,days_per_week
treino,Hipertrofia A/B — 4x,Protocolo de hipertrofia com foco em volume,Hipertrofia,intermediario,12,4
treino,Full Body Iniciante,Treino completo para iniciantes,Condicionamento,iniciante,8,3`;

const DIET_TEMPLATE = `type,name,description,goal,calorie_target,protein_target,carb_target,fat_target
dieta,Low Carb 1800kcal,Protocolo low carb para emagrecimento,Emagrecimento,1800,150,100,80
dieta,Bulking Limpo 2500kcal,Dieta para ganho de massa muscular,Hipertrofia,2500,200,280,80`;

function downloadTemplate(type: "workout" | "diet") {
  const content = type === "workout" ? WORKOUT_TEMPLATE : DIET_TEMPLATE;
  const name = type === "workout" ? "template_treinos.csv" : "template_dietas.csv";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

interface ParsedProtocol {
  type: "treino" | "dieta";
  name: string;
  description?: string;
  goal?: string;
  level?: string;
  weeks?: number;
  days_per_week?: number;
  calorie_target?: number;
  protein_target?: number;
  carb_target?: number;
  fat_target?: number;
  valid: boolean;
  error?: string;
}

function parseCSV(text: string): ParsedProtocol[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

    const type = row["type"]?.toLowerCase();
    const name = row["name"] ?? "";
    if (!name) return { type: "treino", name: "", valid: false, error: "Nome obrigatório" };
    if (type !== "treino" && type !== "dieta") return { type: "treino", name, valid: false, error: "Tipo deve ser 'treino' ou 'dieta'" };

    return {
      type: type as "treino" | "dieta",
      name,
      description: row["description"] || undefined,
      goal: row["goal"] || undefined,
      level: row["level"] || undefined,
      weeks: parseInt(row["weeks"]) || undefined,
      days_per_week: parseInt(row["days_per_week"]) || undefined,
      calorie_target: parseFloat(row["calorie_target"]) || undefined,
      protein_target: parseFloat(row["protein_target"]) || undefined,
      carb_target: parseFloat(row["carb_target"]) || undefined,
      fat_target: parseFloat(row["fat_target"]) || undefined,
      valid: true,
    };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ImportProtocolsPage = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedProtocol[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Formato inválido", description: "Envie um arquivo .csv", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setImported(null);
    const reader = new FileReader();
    reader.onload = (e) => setRows(parseCSV(e.target?.result as string));
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!user) return;
    const valid = rows.filter((r) => r.valid);
    setImporting(true);
    let count = 0;

    for (const row of valid) {
      if (row.type === "treino") {
        const { error } = await supabase.from("workout_plans").insert({
          coach_id: user.id, name: row.name, description: row.description || null,
          goal: row.goal || null, level: row.level || null,
          weeks: row.weeks || null, days_per_week: row.days_per_week || null,
          is_template: true,
        });
        if (!error) count++;
      } else {
        const { error } = await supabase.from("diet_plans").insert({
          coach_id: user.id, name: row.name, description: row.description || null,
          goal: row.goal || null, calorie_target: row.calorie_target || null,
          protein_target: row.protein_target || null, carb_target: row.carb_target || null,
          fat_target: row.fat_target || null, is_template: true,
        });
        if (!error) count++;
      }
    }

    setImporting(false);
    setImported(count);
    toast({ title: `${count} protocolo(s) importado(s)!` });
  };

  const clear = () => { setRows([]); setFileName(""); setImported(null); };
  const validCount = rows.filter((r) => r.valid).length;
  const treinos = rows.filter((r) => r.valid && r.type === "treino").length;
  const dietas = rows.filter((r) => r.valid && r.type === "dieta").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">Importar Treinos/Dietas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Importe protocolos para a biblioteca via CSV</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Templates */}
          <div className="rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-1">1. Baixar template</h3>
            <p className="text-sm text-muted-foreground mb-4">
              O arquivo deve ter a coluna <code className="bg-muted px-1 rounded">type</code> com valor <code className="bg-muted px-1 rounded">treino</code> ou <code className="bg-muted px-1 rounded">dieta</code>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadTemplate("workout")}>
                <Download className="w-4 h-4" />Template Treinos
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadTemplate("diet")}>
                <Download className="w-4 h-4" />Template Dietas
              </Button>
            </div>
          </div>

          {/* Upload */}
          <div className="rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3">2. Enviar arquivo</h3>
            {!fileName ? (
              <div
                className={cn("rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors", dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="w-9 h-9 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm font-medium text-foreground">Clique ou arraste seu arquivo CSV</p>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <FileText className="w-7 h-7 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {treinos > 0 && <span className="text-primary mr-2">{treinos} treino(s)</span>}
                    {dietas > 0 && <span className="text-teal-400">{dietas} dieta(s)</span>}
                  </p>
                </div>
                <button onClick={clear} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b border-border">
                    <tr>
                      {["Tipo", "Nome", "Objetivo", "Nível/Kcal"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={cn("border-b border-border last:border-0", !row.valid && "bg-red-500/5")}>
                        <td className="px-3 py-2">
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", row.type === "treino" ? "text-primary bg-primary/10" : "text-teal-400 bg-teal-400/10")}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.goal ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.type === "treino" ? (row.level ?? "—") : (row.calorie_target ? `${row.calorie_target}kcal` : "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Importar */}
          {rows.length > 0 && !imported && (
            <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
              {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importando...</> : <><Upload className="w-4 h-4" />Importar {validCount} protocolo(s)</>}
            </Button>
          )}

          {imported !== null && (
            <div className="flex items-center gap-2 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="font-semibold text-green-400">{imported} protocolo(s) importado(s) na biblioteca!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProtocolsPage;
