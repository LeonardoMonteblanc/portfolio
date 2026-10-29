// src/app/(admin)/solicitacoes/page.tsx
import { listarSolicitacoesAction } from "@/application/solicitacoes/listar";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { NativeSelect } from "@/ui/components/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/table";
import { Badge } from "@/ui/components/badge";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const SITUACOES = [
  { value: "recebida", label: "Recebida" },
  { value: "em_fila_contestacao", label: "Em fila contestação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "reprovada", label: "Reprovada" },
  { value: "incompleta", label: "Incompleta" },
] as const;

const TIPOS = [
  { value: "inclusao", label: "Inclusão" },
  { value: "atualizacao", label: "Atualização" },
] as const;

function SituacaoBadge({ situacao }: { situacao: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    recebida: "default",
    em_fila_contestacao: "secondary",
    aprovada: "default",
    reprovada: "destructive",
    incompleta: "outline",
  };
  const labels: Record<string, string> = {
    recebida: "Recebida",
    em_fila_contestacao: "Em fila",
    aprovada: "Aprovada",
    reprovada: "Reprovada",
    incompleta: "Incompleta",
  };
  return (
    <Badge variant={variants[situacao] || "default"}>
      {labels[situacao] || situacao}
    </Badge>
  );
}

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    situacao?: string;
    tipo?: string;
    busca?: string;
  }>;
}) {
  const params = await searchParams;
  const pagina = Number(params.pagina) || 1;
  const situacao = params.situacao;
  const tipo = params.tipo;
  const busca = params.busca;

  const formData = new FormData();
  if (situacao) formData.append("situacao", situacao);
  if (tipo) formData.append("tipo", tipo);
  if (busca) formData.append("busca", busca);
  formData.append("pagina", String(pagina));
  formData.append("porPagina", "20");

  const result = await listarSolicitacoesAction(null, formData);

  if ("error" in result) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">
            Erro ao carregar solicitações: {result.error}
          </p>
        </div>
      </div>
    );
  }

  const {
    solicitacoes,
    total,
    pagina: currentPagina,
    porPagina,
    totalPaginas,
  } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitações</h1>
          <p className="text-gray-600">
            Gerenciar solicitações de inclusão e atualização
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="busca"
                  name="busca"
                  placeholder="Nome do negócio..."
                  value={busca || ""}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação</Label>
              <NativeSelect
                id="situacao"
                name="situacao"
                value={situacao || ""}
              >
                <option value="">Todas</option>
                {SITUACOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <NativeSelect id="tipo" name="tipo" value={tipo || ""}>
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negócio</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  solicitacoes.map((sol: any) => (
                    <TableRow key={sol.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {sol.dadosNegocioProposto?.nome || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {sol.tipo === "inclusao"
                              ? "Inclusão"
                              : "Atualização"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {sol.solicitante?.nome || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {sol.solicitante?.email || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {sol.tipo === "inclusao" ? "Inclusão" : "Atualização"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <SituacaoBadge situacao={sol.situacao} />
                      </TableCell>
                      <TableCell>
                        {new Date(sol.criadoEm).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/solicitacoes/${sol.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Ver detalhes
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-600">
              Mostrando {(currentPagina - 1) * porPagina + 1} a{" "}
              {Math.min(currentPagina * porPagina, total)} de {total} resultados
            </p>
            <div className="flex gap-2">
              {currentPagina > 1 && (
                <Link
                  href={`/admin/solicitacoes?pagina=${currentPagina - 1}${situacao ? `&situacao=${situacao}` : ""}${tipo ? `&tipo=${tipo}` : ""}${busca ? `&busca=${busca}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                </Link>
              )}
              {currentPagina < totalPaginas && (
                <Link
                  href={`/admin/solicitacoes?pagina=${currentPagina + 1}${situacao ? `&situacao=${situacao}` : ""}${tipo ? `&tipo=${tipo}` : ""}${busca ? `&busca=${busca}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
