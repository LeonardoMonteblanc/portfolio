// src/app/(admin)/categorias/page.tsx
import { Button } from "@/ui/components/button";
import { Label } from "@/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
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
            <div className="space-y-2">
              <Label htmlFor="ativa">Status</Label>
              <Select value="" onValueChange={() => {}}>
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
        <CardHeader>
          <CardTitle>Teste apenas com Select</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Select funcionando</p>
        </CardContent>
      </Card>
    </div>
  );
}
