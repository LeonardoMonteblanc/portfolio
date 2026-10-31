import type { MetadataRoute } from "next";
import {
  listarCategoriasAtivas,
  listarNegociosPublicadosParaSitemap,
} from "@/application/catalogo";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://guiabg.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [negocios, categorias] = await Promise.all([
    listarNegociosPublicadosParaSitemap(),
    listarCategoriasAtivas(),
  ]);

  const estaticas: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalogo`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/solicitar`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const categoriasUrls: MetadataRoute.Sitemap = categorias.map((categoria) => ({
    url: `${SITE_URL}/catalogo?categoria=${encodeURIComponent(categoria.slug)}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const negociosUrls: MetadataRoute.Sitemap = negocios.map((negocio) => ({
    url: `${SITE_URL}/negocio/${encodeURIComponent(negocio.slug)}`,
    lastModified: negocio.atualizadoEm,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...estaticas, ...categoriasUrls, ...negociosUrls];
}
