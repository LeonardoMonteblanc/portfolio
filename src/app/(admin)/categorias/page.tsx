// src/app/(admin)/categorias/page.tsx
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { NativeSelect } from "@/ui/components/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import Link from "next/link";

export default async function CategoriasPage() {
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
                  value=""
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ativa">Status</Label>
              <NativeSelect id="ativa" name="ativa" value="">
                <option value="">Todas</option>
                <option value="true">Ativas</option>
                <option value="false">Inativas</option>
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
        <CardHeader>
          <CardTitle>Teste com NativeSelect</CardTitle>
        </CardHeader>
        <CardContent>
          <p>NativeSelect funcionando</p>
        </CardContent>
      </Card>
    </div>
  );
}
