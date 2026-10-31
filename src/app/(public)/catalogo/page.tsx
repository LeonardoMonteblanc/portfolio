import type { Metadata } from "next";
import { CatalogoView } from "../_components/catalogo-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catálogo de negócios | GuiaBG",
  description:
    "Explore negócios, serviços e iniciativas de Bento Gonçalves por categoria e bairro.",
  alternates: { canonical: "/catalogo" },
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <CatalogoView
      basePath="/catalogo"
      searchParams={params}
      titulo="Catálogo"
      descricao="Negócios, serviços e iniciativas da nossa comunidade. Use a busca e os filtros para encontrar o que precisa."
    />
  );
}
