// src/app/(admin)/categorias/page.tsx
import { listarCategoriasAction } from "@/application/categorias/listar";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
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

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{
    pagina?: string;
    ativa?: string;
    busca?: string;
  }>;
}) {
  const params = (await searchParams) as {
    pagina?: string;
    ativa?: string;
    busca?: string;
  };
  const pagina = Number(params?.pagina) || 1;
  const ativa = params?.ativa;
  const busca = params?.busca;

  const result = await listarCategoriasAction({
    pagina: Number(pagina),
    porPagina: 20,
    ativa: ativa === "true" ? true : ativa === "false" ? false : undefined,
    busca: busca || undefined,
  });

  const { categorias, paginacao } = result;
  const { total, pagina: currentPagina, porPagina, totalPaginas } = paginacao;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600">Gerenciar categorias do catálogo</p>
        </div>
        <Link href="/admin/categorias/novo">
          <Button>Nova Categoria</Button>
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
                  placeholder="Nome da categoria..."
                  value={params.busca || ""}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ativa">Status</Label>
              <Select value={params.ativa || ""} onValueChange={() => {}}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="true">Ativas</SelectItem>
                  <SelectItem value="false">Inativas</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      Nenhuma categoria encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map(
                    (cat: {
                      id: string;
                      nome: string;
                      slug: string;
                      ativa: boolean;
                      criadoEm: string | Date;
                    }) => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <p className="font-medium">{cat.nome}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-500 text-sm">
                            {cat.slug}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cat.ativa ? "default" : "outline"}>
                            {cat.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(cat.criadoEm).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/categorias/${cat.id}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Editar
                          </Link>
                        </TableCell>
                      </TableRow>
                    ),
                  )
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
                  href={`/admin/categorias?pagina=${currentPagina - 1}${params.ativa ? `&ativa=${params.ativa}` : ""}${params.busca ? `&busca=${params.busca}` : ""}`}
                >
                  <Button variant="outline" size="sm">
                    Anterior
                  </Button>
                </Link>
              )}
              {currentPagina < totalPaginas && (
                <Link
                  href={`/admin/categorias?pagina=${currentPagina + 1}${params.ativa ? `&ativa=${params.ativa}` : ""}${params.busca ? `&busca=${params.busca}` : ""}`}
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
