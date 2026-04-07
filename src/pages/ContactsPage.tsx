import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useContactStore } from "@/store/contactStore";
import { useDealStore } from "@/store/dealStore";
import type { Contact } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, X, Filter } from "lucide-react";
import { cn, formatPhone, stripPhone } from "@/lib/utils";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";

const STORAGE_KEY = "contacts-col-widths";
const COLUMNS = [
  { key: "name", label: "Nome", default: 180 },
  { key: "email", label: "Email", default: 220 },
  { key: "phone", label: "Telefone", default: 150 },
  { key: "company", label: "Empresa", default: 180 },
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
  lead: "bg-primary/20 text-primary",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  lead: "Lead",
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
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", company: "", status: "lead" as Contact["status"] });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);
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

  const filtered = contacts
    .filter((c) => (statusFilter === "all" ? true : c.status === statusFilter))
    .filter((c) =>
      search
        ? c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.company.toLowerCase().includes(search.toLowerCase())
        : true
    );

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
          <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          {["all", "active", "lead", "inactive"].map((s) => (
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
      </div>

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
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap relative select-none"
                      style={{ width: colWidths[col.key] ?? col.default, minWidth: 60 }}
                    >
                      {col.label}
                      <div
                        onMouseDown={(e) => onResizeStart(col.key, e)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 active:bg-primary/50"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground truncate" style={{ maxWidth: colWidths.name }}>{c.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate" style={{ maxWidth: colWidths.email }}>{c.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatPhone(c.phone)}</td>
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
                    placeholder={{ name: "Nome", email: "Email", phone: "Telefone", company: "Empresa" }[field]}
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
