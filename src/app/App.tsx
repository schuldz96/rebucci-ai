import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/authStore";
import AppLayout from "@/components/layout/AppLayout";

// Páginas existentes
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import WhatsAppPage from "@/pages/WhatsAppPage";
import ContactsPage from "@/pages/ContactsPage";
import DealsPage from "@/pages/DealsPage";
import SettingsPage from "@/pages/SettingsPage";
import AIRagPage from "@/pages/AIRagPage";
import NotFound from "@/pages/NotFound";

// Coaching — Clientes
import CustomersActivePage from "@/pages/customers/CustomersActivePage";
import CustomersFeedbacksPage from "@/pages/customers/CustomersFeedbacksPage";
import CustomersListPage from "@/pages/customers/CustomersListPage";
import CustomersEngagementPage from "@/pages/customers/CustomersEngagementPage";
import CustomersDropoutsPage from "@/pages/customers/CustomersDropoutsPage";
import CustomerProfilePage from "@/pages/customers/CustomerProfilePage";

// Coaching — Agenda
import SchedulePage from "@/pages/SchedulePage";

// Coaching — Produtos
import ProductsListPage from "@/pages/products/ProductsListPage";
import ProductEditorPage from "@/pages/products/ProductEditorPage";
import CartRecoveryPage from "@/pages/products/CartRecoveryPage";
import AffiliatesPage from "@/pages/products/AffiliatesPage";

// Coaching — Bibliotecas
import LibraryWorkoutPage from "@/pages/library/LibraryWorkoutPage";
import LibraryDietPage from "@/pages/library/LibraryDietPage";

// Coaching — Ferramentas
import ImportCustomersPage from "@/pages/tools/ImportCustomersPage";
import ImportProtocolsPage from "@/pages/tools/ImportProtocolsPage";
import ToolsGroupsPage from "@/pages/tools/ToolsGroupsPage";

// Coaching — Financeiro, Apps, Suporte
import FinancePage from "@/pages/FinancePage";
import AppsPage from "@/pages/AppsPage";
import SupportPage from "@/pages/SupportPage";

// Coaching — Minha Conta
import AccountSettingsPage from "@/pages/account/AccountSettingsPage";
import AccountSubscriptionPage from "@/pages/account/AccountSubscriptionPage";

// Rotas públicas
import FeedbackFormPage from "@/pages/public/FeedbackFormPage";
import AnamnesisFormPage from "@/pages/public/AnamnesisFormPage";

// Páginas extras
import NotificationsPage from "@/pages/NotificationsPage";
import AwardsPage from "@/pages/AwardsPage";
import PatchNotesPage from "@/pages/PatchNotesPage";

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const AppRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route path="/f/:token" element={<FeedbackFormPage />} />
      <Route path="/anamnese/:token" element={<AnamnesisFormPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoutes />}>
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Agenda */}
        <Route path="/schedule" element={<SchedulePage />} />

        {/* Clientes (coaching) */}
        <Route path="/customers/actives" element={<CustomersActivePage />} />
        <Route path="/customers/feedbacks" element={<CustomersFeedbacksPage />} />
        <Route path="/customers/list" element={<CustomersListPage />} />
        <Route path="/customers/engagement" element={<CustomersEngagementPage />} />
        <Route path="/customers/dropouts" element={<CustomersDropoutsPage />} />
        <Route path="/customers/:id" element={<CustomerProfilePage />} />

        {/* Produtos */}
        <Route path="/products/list" element={<ProductsListPage />} />
        <Route path="/products/new" element={<ProductEditorPage />} />
        <Route path="/products/:id/edit" element={<ProductEditorPage />} />
        <Route path="/products/cart-recovery" element={<CartRecoveryPage />} />
        <Route path="/products/affiliates" element={<AffiliatesPage />} />

        {/* Bibliotecas */}
        <Route path="/library/workout" element={<LibraryWorkoutPage />} />
        <Route path="/library/diet" element={<LibraryDietPage />} />

        {/* Ferramentas */}
        <Route path="/tools/import/customers" element={<ImportCustomersPage />} />
        <Route path="/tools/import/protocols" element={<ImportProtocolsPage />} />
        <Route path="/tools/groups" element={<ToolsGroupsPage />} />

        {/* Financeiro, Apps, Suporte */}
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/help" element={<SupportPage />} />
        <Route path="/notifications/all" element={<NotificationsPage />} />
        <Route path="/awards" element={<AwardsPage />} />
        <Route path="/patch-notes" element={<PatchNotesPage />} />

        {/* Minha Conta */}
        <Route path="/account/settings" element={<AccountSettingsPage />} />
        <Route path="/account/subscription" element={<AccountSubscriptionPage />} />
        <Route path="/account" element={<Navigate to="/account/settings" replace />} />

        {/* CRM — módulo existente */}
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/ai-rag" element={<AIRagPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:contactId" element={<ContactsPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:dealId" element={<DealsPage />} />
        <Route path="/settings" element={<Navigate to="/settings/geral" replace />} />
        <Route path="/settings/:subsection" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
