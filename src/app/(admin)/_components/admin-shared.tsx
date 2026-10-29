// src/app/(admin)/_components/admin-shared.tsx
import { Badge } from "@/ui/components/badge";

export const SITUACOES = [
  { value: "nao_elegivel", label: "Não elegível" },
  { value: "publicado", label: "Publicado" },
  { value: "rascunho", label: "Rascunho" },
  { value: "expirado", label: "Expirado" },
] as const;

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    publicado: "default",
    rascunho: "secondary",
    nao_elegivel: "outline",
    expirado: "destructive",
  };
  const labels: Record<string, string> = {
    publicado: "Publicado",
    rascunho: "Rascunho",
    nao_elegivel: "Não elegível",
    expirado: "Expirado",
  };
  return (
    <Badge variant={variants[situacao] || "default"}>
      {labels[situacao] || situacao}
    </Badge>
  );
}
