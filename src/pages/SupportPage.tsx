import { HelpCircle, MessageSquare, BookOpen, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

const SupportPage = () => (
  <div className="flex flex-col h-full overflow-hidden">
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
      <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Como podemos ajudar?</p>
    </div>
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
        {[
          { icon: MessageSquare, title: "Chat de Suporte", desc: "Fale com nossa equipe diretamente", action: "Abrir chat" },
          { icon: BookOpen, title: "Documentação", desc: "Guias e tutoriais completos", action: "Ver docs" },
          { icon: Video, title: "Vídeos tutoriais", desc: "Aprenda com vídeos passo a passo", action: "Ver vídeos" },
        ].map(({ icon: Icon, title, desc, action }) => (
          <div key={title} className="rounded-xl border border-border p-5">
            <Icon className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{desc}</p>
            <Button variant="outline" size="sm">{action}</Button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default SupportPage;
