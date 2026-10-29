// src/app/(admin)/categorias/page.tsx
import { listarCategoriasAction } from "@/application/categorias/listar";
import { Button } from "@/ui/components/button";
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
          <CardTitle>Teste simples</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Página de categorias funcionando</p>
        </CardContent>
      </Card>
    </div>
  );
}
