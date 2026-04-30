import { CreditCard } from "lucide-react";

const AccountSubscriptionPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Gerencie seu plano da plataforma</p>
    </div>
    <div className="flex-1 overflow-auto p-6 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Assinatura — Sprint 7</p>
        <p className="text-xs mt-1">Gerenciamento do plano SaaS da plataforma</p>
      </div>
    </div>
  </div>
);

export default AccountSubscriptionPage;
