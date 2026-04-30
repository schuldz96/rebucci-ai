import { useParams } from "react-router-dom";
import { Bot } from "lucide-react";

const FeedbackFormPage = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Formulário de Feedback</h1>
            <p className="text-sm text-gray-500">Responda com sinceridade — leva apenas 2 minutos</p>
          </div>
        </div>

        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Token: <code className="bg-gray-100 px-2 py-0.5 rounded">{token}</code></p>
          <p className="mt-4 text-sm">Formulário em implementação — Sprint 2</p>
        </div>
      </div>
    </div>
  );
};

export default FeedbackFormPage;
