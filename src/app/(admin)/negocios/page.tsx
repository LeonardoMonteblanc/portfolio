// src/app/(admin)/negocios/page.tsx
import { listarNegociosAction } from "@/application/negocios/listar";
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
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  SITUACOES,
  SituacaoBadge,
} from "@/app/(admin)/_components/admin-shared";

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    situacao?: string;
    busca?: string;
  }>;
}) {
  const params = await searchParams;
  const pagina = Number(params?.pagina) || 1;
  const situacao = params?.situacao;
  const busca = params?.busca;

  const formData = new FormData();
  if (situacao) formData.append("situacao", situacao);
  if (busca) formData.append("busca", busca);
  formData.append("pagina", String(pagina));
  formData.append("porPagina", "20");

  const result = await listarNegociosAction({
    pagina: Number(pagina),
    porPagina: 20,
    situacao: situacao || undefined,
    busca: busca || undefined,
  });

  const { negocios, paginacao } = result;
  const { total, pagina: currentPagina, porPagina, totalPaginas } = paginacao;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negócios</h1>
          <p className="text-gray-600">Gerenciar negócios cadastrados</p>
        </div>
        <Link href="/admin/negocios/novo">
          <Button>
            <span className="mr-2">+</span>
            Novo Negócio
          </Button>
        </Link>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <Input
                  id="busca"
                  name="busca"
                  placeholder="Nome do negócio..."
                  value={params.busca || ""}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="situacao">Situação</Label>
              <NativeSelect
                id="situacao"
                name="situacao"
                value={params.situacao || ""}
              >
                <option value="">Todas</option>
                {SITUACOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit">
              <span className="mr-2">🔍</span>
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
                  <TableHead>Situação</TableHead>
                  <TableHead>Categorias</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {negocios.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      Nenhum negócio encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  negocios.map((neg: any) => (
                    <TableRow key={neg.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{neg.nome}</p>
                          <p className="text-sm text-gray-500">
                            {neg.descricao?.substring(0, 100)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <SituacaoBadge situacao={neg.situacaoPublicacao} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {neg.categorias?.map(
                            (c: { id: string; nome: string }) => (
                              <Badge key={c.id} variant="outline">
                                {c.nome}
                              </Badge>
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(neg.criadoEm).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/negocios/${neg.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Editar
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
              Mostrando {(pagina - 1) * 20 + 1} a {Math.min(pagina * 20, total)}{" "}
              de {total} resultados
            </p>
            <div className="flex gap-2">
              {currentPagina > 1 && (
                <Link
                  href={`/admin/negocios?pagina=${currentPagina - 1}${situacao ? `&situacao=${situacao}` : ""}${busca ? `&busca=${busca}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Anterior
                  </Button>
                </Link>
              )}
              {currentPagina < totalPaginas && (
                <Link
                  href={`/admin/negocios?pagina=${currentPagina + 1}${situacao ? `&situacao=${situacao}` : ""}${busca ? `&busca=${busca}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Próxima
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
