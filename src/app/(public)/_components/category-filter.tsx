"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/ui/components/native-select";
import { Label } from "@/ui/components/label";
import { Tag } from "lucide-react";

interface CategoryFilterProps {
  categorias: Array<{ id: string; nome: string; slug: string }>;
}

export function CategoryFilter({ categorias }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("categoria") || "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    if (slug) {
      router.push(`/catalogo?categoria=${slug}`);
    } else {
      router.push("/catalogo");
    }
  }

  return (
    <div className="mb-6">
      <Label
        htmlFor="filtro-categoria-home"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        <Tag className="h-4 w-4 inline-block mr-1" />
        Filtrar por categoria
      </Label>
      <NativeSelect
        id="filtro-categoria-home"
        name="categoria"
        value={currentCategory}
        onChange={handleChange}
      >
        <option value="">Todas as categorias</option>
        {categorias.map((cat) => (
          <option key={cat.id} value={cat.slug}>
            {cat.nome}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
