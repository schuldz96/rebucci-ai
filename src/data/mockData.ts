export interface Instance {
  id: string;
  name: string;
  phone: string;
  status: "online" | "offline";
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  type: "text" | "audio" | "image";
  direction: "sent" | "received";
  timestamp: string;
  imageUrl?: string;
}

export interface Conversation {
  id: string;
  instanceId: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: "pending" | "unanswered" | "answered";
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "inactive" | "lead";
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  contactName: string;
  value: number;
  priority: "low" | "medium" | "high";
  stage: string;
}

export interface RAGBase {
  id: string;
  name: string;
  origin: string;
  createdAt: string;
  documentCount: number;
}

export interface AgentConfig {
  name: string;
  provider: string;
  instanceName: string;
  active: boolean;
  systemPrompt: string;
  promptComplement: string;
  groupingDelay: number;
  responseDelay: number;
  questions: string[];
  ragBaseId: string | null;
}

export const KANBAN_STAGES = [
  "Novo Lead",
  "Tentativa de Contato",
  "Conectado",
  "Qualificado",
  "Reunião Agendada",
  "No-Show",
  "Fechado",
];

export const mockInstances: Instance[] = [
  { id: "inst-1", name: "Vendas Principal", phone: "+55 11 99999-0001", status: "online" },
  { id: "inst-2", name: "Suporte", phone: "+55 11 99999-0002", status: "online" },
  { id: "inst-3", name: "Marketing", phone: "+55 11 99999-0003", status: "offline" },
  { id: "inst-4", name: "Pós-Venda", phone: "+55 11 99999-0004", status: "offline" },
];

export const mockConversations: Conversation[] = [
  { id: "conv-1", instanceId: "inst-1", contactName: "Ana Silva", contactPhone: "+55 11 98765-4321", lastMessage: "Olá, gostaria de saber mais sobre o plano premium", lastMessageTime: "10:32", unreadCount: 3, status: "pending" },
  { id: "conv-2", instanceId: "inst-1", contactName: "Carlos Mendes", contactPhone: "+55 21 97654-3210", lastMessage: "Perfeito, vou analisar a proposta", lastMessageTime: "09:15", unreadCount: 0, status: "answered" },
  { id: "conv-3", instanceId: "inst-1", contactName: "Juliana Costa", contactPhone: "+55 31 96543-2109", lastMessage: "Quando posso agendar uma demonstração?", lastMessageTime: "Ontem", unreadCount: 1, status: "unanswered" },
  { id: "conv-4", instanceId: "inst-2", contactName: "Roberto Alves", contactPhone: "+55 41 95432-1098", lastMessage: "O sistema está apresentando um erro", lastMessageTime: "Ontem", unreadCount: 2, status: "pending" },
  { id: "conv-5", instanceId: "inst-1", contactName: "Fernanda Lima", contactPhone: "+55 51 94321-0987", lastMessage: "Obrigada pelo atendimento!", lastMessageTime: "22/03", unreadCount: 0, status: "answered" },
  { id: "conv-6", instanceId: "inst-2", contactName: "Pedro Santos", contactPhone: "+55 61 93210-9876", lastMessage: "Preciso de ajuda com a integração", lastMessageTime: "21/03", unreadCount: 0, status: "unanswered" },
];

export const mockMessages: ChatMessage[] = [
  { id: "msg-1", conversationId: "conv-1", content: "Olá, gostaria de saber mais sobre o plano premium", type: "text", direction: "received", timestamp: "10:30" },
  { id: "msg-2", conversationId: "conv-1", content: "Claro! O plano premium inclui automação com IA, integração WhatsApp ilimitada e suporte prioritário.", type: "text", direction: "sent", timestamp: "10:31" },
  { id: "msg-3", conversationId: "conv-1", content: "Qual o valor mensal?", type: "text", direction: "received", timestamp: "10:32" },
  { id: "msg-4", conversationId: "conv-1", content: "O investimento é de R$ 497/mês. Posso enviar uma proposta detalhada?", type: "text", direction: "sent", timestamp: "10:33" },
  { id: "msg-5", conversationId: "conv-1", content: "Sim, por favor!", type: "text", direction: "received", timestamp: "10:34" },
  { id: "msg-6", conversationId: "conv-2", content: "Bom dia Carlos! Segue a proposta comercial conforme conversamos.", type: "text", direction: "sent", timestamp: "09:10" },
  { id: "msg-7", conversationId: "conv-2", content: "Perfeito, vou analisar a proposta", type: "text", direction: "received", timestamp: "09:15" },
];

export const mockContacts: Contact[] = [
  { id: "ct-1", name: "Ana Silva", email: "ana@empresa.com", phone: "+55 11 98765-4321", company: "TechCorp", status: "active", createdAt: "2025-03-01" },
  { id: "ct-2", name: "Carlos Mendes", email: "carlos@startup.io", phone: "+55 21 97654-3210", company: "StartupIO", status: "active", createdAt: "2025-02-28" },
  { id: "ct-3", name: "Juliana Costa", email: "juliana@digital.com", phone: "+55 31 96543-2109", company: "Digital Solutions", status: "lead", createdAt: "2025-03-10" },
  { id: "ct-4", name: "Roberto Alves", email: "roberto@corp.com.br", phone: "+55 41 95432-1098", company: "Corp Brasil", status: "active", createdAt: "2025-01-15" },
  { id: "ct-5", name: "Fernanda Lima", email: "fernanda@agencia.com", phone: "+55 51 94321-0987", company: "Agência Criativa", status: "inactive", createdAt: "2024-12-20" },
  { id: "ct-6", name: "Pedro Santos", email: "pedro@tech.dev", phone: "+55 61 93210-9876", company: "DevTech", status: "lead", createdAt: "2025-03-15" },
  { id: "ct-7", name: "Mariana Oliveira", email: "mariana@consulting.com", phone: "+55 71 92109-8765", company: "MO Consulting", status: "active", createdAt: "2025-02-01" },
  { id: "ct-8", name: "Lucas Ferreira", email: "lucas@ecommerce.com", phone: "+55 81 91098-7654", company: "E-Shop", status: "lead", createdAt: "2025-03-20" },
];

export const mockDeals: Deal[] = [
  { id: "deal-1", title: "Plano Premium - TechCorp", contactName: "Ana Silva", value: 4970, priority: "high", stage: "Qualificado" },
  { id: "deal-2", title: "Consultoria IA - StartupIO", contactName: "Carlos Mendes", value: 12000, priority: "high", stage: "Reunião Agendada" },
  { id: "deal-3", title: "Integração WhatsApp - Digital", contactName: "Juliana Costa", value: 2500, priority: "medium", stage: "Novo Lead" },
  { id: "deal-4", title: "Suporte Enterprise - Corp", contactName: "Roberto Alves", value: 8000, priority: "medium", stage: "Conectado" },
  { id: "deal-5", title: "Automação - Agência", contactName: "Fernanda Lima", value: 3500, priority: "low", stage: "Tentativa de Contato" },
  { id: "deal-6", title: "CRM Setup - DevTech", contactName: "Pedro Santos", value: 6000, priority: "high", stage: "Novo Lead" },
  { id: "deal-7", title: "Chatbot - MO Consulting", contactName: "Mariana Oliveira", value: 15000, priority: "high", stage: "Fechado" },
  { id: "deal-8", title: "E-commerce Bot - E-Shop", contactName: "Lucas Ferreira", value: 4000, priority: "medium", stage: "Novo Lead" },
  { id: "deal-9", title: "Reativação - TechCorp", contactName: "Ana Silva", value: 2000, priority: "low", stage: "No-Show" },
];

export const mockRAGBases: RAGBase[] = [
  { id: "rag-1", name: "Base Vendas", origin: "WhatsApp - Vendas Principal", createdAt: "2025-03-10", documentCount: 1247 },
  { id: "rag-2", name: "Base Suporte", origin: "WhatsApp - Suporte", createdAt: "2025-03-05", documentCount: 3891 },
  { id: "rag-3", name: "FAQ Produtos", origin: "Manual", createdAt: "2025-02-20", documentCount: 156 },
];

export const defaultAgentConfig: AgentConfig = {
  name: "",
  provider: "EvolutionAPI",
  instanceName: "",
  active: false,
  systemPrompt: "",
  promptComplement: "",
  groupingDelay: 10.0,
  responseDelay: 10.0,
  questions: [],
  ragBaseId: null,
};
