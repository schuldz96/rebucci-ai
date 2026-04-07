import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContactStore } from "@/store/contactStore";
import { useDealStore } from "@/store/dealStore";
import type { Contact } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Filter, CheckSquare, Square, Loader2 } from "lucide-react";
import { cn, cleanPhone, stripPhone } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";

const STORAGE_KEY = "contacts-col-widths";
const COLUMNS = [
  { key: "name", label: "Nome", default: 180 },
  { key: "email", label: "Email", default: 220 },
  { key: "phone", label: "Telefone", default: 150 },
  { key: "company", label: "Plano", default: 180 },
  { key: "status", label: "Status", default: 90 },
  { key: "createdAt", label: "Criado em", default: 110 },
  { key: "activationDate", label: "Ativação", default: 110 },
  { key: "endDate", label: "Término", default: 110 },
  { key: "lastFeedback", label: "Últ. Feedback", default: 120 },
  { key: "nextFeedback", label: "Próx. Feedback", default: 120 },
] as const;

function loadColWidths(): Record<string, number> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return Object.fromEntries(COLUMNS.map((c) => [c.key, c.default]));
}

function saveColWidths(widths: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widths)); } catch { /* ignore */ }
}

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  inactive: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const ContactsPage = () => {
  const { contacts, loading, loadContacts, addContact } = useContactStore();
  const { loadDeals } = useDealStore();
  const navigate = useNavigate();
  const { contactId } = useParams<{ contactId: string }>();
  const selectedContact = contactId ? (contacts.find((c) => c.id === contactId) ?? null) : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", status: "active" as Contact["status"] });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingDeals, setCreatingDeals] = useState(false);
  const [dealResult, setDealResult] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [advFilters, setAdvFilters] = useState<{ id: string; field: string; op: "equals" | "known" | "unknown"; value: string }[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;
  const [colWidths, setColWidths] = useState<Record<string, number>>(loadColWidths);
  const resizingRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startW: colWidths[key] ?? 150 };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(60, resizingRef.current.startW + delta);
      setColWidths((prev) => {
        const next = { ...prev, [resizingRef.current!.key]: newW };
        saveColWidths(next);
        return next;
      });
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [colWidths]);

  useEffect(() => {
    loadContacts();
    loadDeals();
  }, [loadContacts, loadDeals]);

  // Fecha menu filtro ao clicar fora
  useEffect(() => {
    if (!showFilterMenu) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterMenu]);

  const filtered = contacts
    .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
    .filter((c) =>
      search
        ? c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.company.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((c) => {
      for (const f of advFilters) {
        const val = (c[f.field as keyof Contact] ?? "") as string;
        if (f.op === "known" && (!val || val === "—")) return false;
        if (f.op === "unknown" && val && val !== "—") return false;
        if (f.op === "equals" && f.value && !val.toLowerCase().includes(f.value.toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const key = sortCol as keyof Contact;
      const va = (a[key] ?? "") as string;
      const vb = (b[key] ?? "") as string;
      const cmp = va.localeCompare(vb, "pt", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page quando filtro/busca muda
  useEffect(() => { setPage(0); }, [statusFilter, search, sortCol, sortDir, advFilters]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllPage = () => {
    const allIds = paged.map((c) => c.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) { allIds.forEach((id) => next.delete(id)); }
      else { allIds.forEach((id) => next.add(id)); }
      return next;
    });
  };

  const handleCreateDeals = async () => {
    if (selected.size === 0) return;
    setCreatingDeals(true);
    setDealResult(null);

    // Busca deals existentes para verificar duplicatas (1 deal por email)
    const { data: existingDeals } = await supabase
      .from("deals")
      .select("phone");

    const existingPhones = new Set((existingDeals ?? []).map((d: { phone: string }) => d.phone).filter(Boolean));

    // Busca primeiro stage do pipeline
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("name, pipeline_id")
      .order("order_index", { ascending: true })
      .limit(1);

    const firstStage = stages?.[0]?.name ?? "Suporte IA";
    const pipelineId = stages?.[0]?.pipeline_id ?? null;

    const selectedContacts = contacts.filter((c) => selected.has(c.id));
    let created = 0;
    let skipped = 0;

    for (const c of selectedContacts) {
      if (existingPhones.has(c.phone)) {
        skipped++;
        continue;
      }
      try {
        await supabase.from("deals").insert({
          title: c.name,
          contact_name: c.name,
          contact_id: c.id,
          phone: c.phone,
          value: 0,
          priority: "medium",
          stage: firstStage,
          pipeline_id: pipelineId,
        });
        existingPhones.add(c.phone);
        created++;
      } catch {
        skipped++;
      }
    }

    setDealResult(`${created} negócios criados${skipped > 0 ? `, ${skipped} já existiam` : ""}`);
    setSelected(new Set());
    setCreatingDeals(false);
    loadDeals();
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    if (!newContact.name) { setCreateError("Nome é obrigatório"); return; }
    if (!newContact.email) { setCreateError("Email é obrigatório"); return; }
    if (!newContact.phone) { setCreateError("Telefone é obrigatório"); return; }
    const phoneDigits = stripPhone(newContact.phone);
    if (contacts.some((c) => c.email.toLowerCase() === newContact.email.toLowerCase())) {
      setCreateError("Já existe um contato com este email"); return;
    }
    if (contacts.some((c) => c.phone === phoneDigits)) {
      setCreateError("Já existe um contato com este telefone"); return;
    }
    setSaving(true);
    try {
      await addContact({ ...newContact, phone: phoneDigits });
      setNewContact({ name: "", email: "", phone: "", company: "", status: "lead" });
      setShowModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar contato";
      setCreateError(msg.includes("unique") ? "Email ou telefone já cadastrado" : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-8 pt-6 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Carregando..." : `${contacts.length} contatos cadastrados`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo Contato
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 lg:px-8 pb-4 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contatos..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "active", "inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>

        {/* Filtro avançado */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors border",
              advFilters.length > 0 ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar{advFilters.length > 0 && ` (${advFilters.length})`}
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-card border border-border rounded-xl shadow-lg z-30 p-3 space-y-3">
              {advFilters.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <select value={f.field} onChange={(e) => setAdvFilters((prev) => prev.map((x) => x.id === f.id ? { ...x, field: e.target.value } : x))}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground">
                    {COLUMNS.map((col) => <option key={col.key} value={col.key}>{col.label}</option>)}
                  </select>
                  <select value={f.op} onChange={(e) => setAdvFilters((prev) => prev.map((x) => x.id === f.id ? { ...x, op: e.target.value as "equals" | "known" | "unknown" } : x))}
                    className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground">
                    <option value="equals">igual a</option>
                    <option value="known">é conhecido</option>
                    <option value="unknown">é desconhecido</option>
                  </select>
                  {f.op === "equals" && (
                    <input value={f.value} onChange={(e) => setAdvFilters((prev) => prev.map((x) => x.id === f.id ? { ...x, value: e.target.value } : x))}
                      placeholder="Valor..." className="w-24 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground" />
                  )}
                  <button onClick={() => setAdvFilters((prev) => prev.filter((x) => x.id !== f.id))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAdvFilters((prev) => [...prev, { id: `f-${Date.now()}`, field: "name", op: "equals", value: "" }])}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar filtro
              </button>
              {advFilters.length > 0 && (
                <button onClick={() => { setAdvFilters([]); setShowFilterMenu(false); }} className="text-xs text-muted-foreground hover:text-destructive">
                  Limpar todos
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-6 lg:px-8 pb-2 shrink-0">
          <span className="text-sm text-foreground font-medium">{selected.size} selecionado{selected.size > 1 ? "s" : ""}</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground">Limpar seleção</button>
          <button
            onClick={handleCreateDeals}
            disabled={creatingDeals}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {creatingDeals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Gerar negócios
          </button>
          {dealResult && <span className="text-xs text-success">{dealResult}</span>}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden px-6 lg:px-8 pb-6">
        <div className="surface-elevated h-full overflow-auto scrollbar-thick">
          {loading && contacts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Carregando contatos...
            </div>
          ) : (
            <table style={{ minWidth: COLUMNS.reduce((s, col) => s + (colWidths[col.key] ?? col.default), 0) }}>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 w-10">
                    <button onClick={selectAllPage} className="text-muted-foreground hover:text-foreground">
                      {paged.length > 0 && paged.every((c) => selected.has(c.id))
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap relative select-none cursor-pointer hover:text-foreground transition-colors"
                      style={{ width: colWidths[col.key] ?? col.default, minWidth: 60 }}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {sortCol === col.key && (
                          <span className="text-primary">{sortDir === "asc" ? "▲" : "▼"}</span>
                        )}
                      </span>
                      <div
                        onMouseDown={(e) => onResizeStart(col.key, e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className={cn("border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer", selected.has(c.id) && "bg-primary/5")}
                  >
                    <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(c.id)} className="text-muted-foreground hover:text-foreground">
                        {selected.has(c.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground truncate" style={{ maxWidth: colWidths.name }}>{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate" style={{ maxWidth: colWidths.email }}>{c.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{cleanPhone(c.phone)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate" style={{ maxWidth: colWidths.company }}>{c.company}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("text-xs px-2.5 py-1 rounded-lg font-medium", statusColors[c.status])}>
                        {statusLabels[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{c.createdAt}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{c.activationDate || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{c.endDate || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{c.lastFeedback || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{c.nextFeedback || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 shrink-0 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">«</button>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">‹</button>
              <span className="text-xs text-foreground px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">›</button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded-lg hover:bg-secondary disabled:opacity-30 text-muted-foreground">»</button>
            </div>
          </div>
        )}
      </div>

      {/* Contact Detail Panel */}
      <AnimatePresence>
        {selectedContact && (
          <ContactDetailPanel
            contact={selectedContact}
            onClose={() => navigate("/contacts")}
          />
        )}
      </AnimatePresence>

      {/* Modal novo contato */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="surface-elevated p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Novo Contato</h3>
                <button onClick={() => { setShowModal(false); setCreateError(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {(["name", "email", "phone", "company"] as const).map((field) => (
                  <input
                    key={field}
                    value={newContact[field]}
                    onChange={(e) => setNewContact({ ...newContact, [field]: e.target.value })}
                    placeholder={{ name: "Nome", email: "Email", phone: "Telefone", company: "Plano" }[field]}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                ))}
                <select
                  value={newContact.status}
                  onChange={(e) => setNewContact({ ...newContact, status: e.target.value as Contact["status"] })}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground"
                >
                  <option value="lead">Lead</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
                {createError && <p className="text-xs text-destructive">{createError}</p>}
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Criar Contato"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactsPage;
