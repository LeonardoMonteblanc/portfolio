import Link from "next/link";
import { buscarNegocios, listarCategoriasAtivas } from "@/application/catalogo";
import { Button } from "@/ui/components/button";
import { Search, Tag, Building2, Sparkles } from "lucide-react";
import { CategoryFilter } from "./_components/category-filter";
import { NegocioCard } from "./_components/negocio-card";

export const dynamic = "force-dynamic";

interface CategoryPillProps {
  nome: string;
  slug: string;
  selecionada?: boolean;
}

function CategoryPill({ nome, slug, selecionada = false }: CategoryPillProps) {
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        selecionada
          ? "bg-primary text-primary-foreground shadow-lg"
          : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
      }`}
    >
      {nome}
    </span>
  );
}

async function HomePage() {
  const [negociosResult, categorias] = await Promise.all([
    buscarNegocios({ porPagina: 8, ordenacao: "relevancia" }),
    listarCategoriasAtivas(),
  ]);

  const negocios = negociosResult.negocios || [];
  const categoriasAtivas = categorias || [];

  const copyrightText =
    "© 2025 GuiaBG. Diretório Comunitário de Bento Gonçalves.";

  function getCopyrightText() {
    return copyrightText;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex items-center">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Guia Comunitário de Bento Gonçalves
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight mb-6">
              Encontre o melhor de{" "}
              <span className="text-primary">Bento Gonçalves</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed">
              O guia comunitário para encontrar comércios, serviços e empresas
              locais na Serra Gaúcha. Feito pela comunidade, para a comunidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/solicitar">
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-8 py-3.5 text-lg gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  Cadastrar seu negócio
                </Button>
              </Link>
              <Link href="/catalogo" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-3.5 text-lg gap-2"
                >
                  <Search className="h-5 w-5" />
                  Explorar catálogo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V4"
            />
          </svg>
        </div>
      </section>

      {/* Categorias com Filtro */}
      <section className="py-16 md:py-24 bg-muted/30 dark:bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
                <Tag className="h-4 w-4" />
                Categorias
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Explore por categoria
              </h2>
            </div>
            <Link
              href="/catalogo"
              className="hidden md:inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Ver todas <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Filtro de categoria com NativeSelect */}
          <CategoryFilter categorias={categoriasAtivas} />

          <div className="flex flex-wrap gap-3">
            {categoriasAtivas.slice(0, 12).map((cat) => (
              <Link key={cat.id} href={`/catalogo?categoria=${cat.slug}`}>
                <CategoryPill
                  nome={cat.nome}
                  slug={cat.slug}
                  selecionada={false}
                />
              </Link>
            ))}
            {categoriasAtivas.length > 12 && (
              <Link
                href="/catalogo"
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-all"
              >
                +{categoriasAtivas.length - 12} mais
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Negócios em Destaque */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-3">
                <Sparkles className="h-4 w-4" />
                Destaque
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Negócios em destaque
              </h2>
              <p className="text-muted-foreground mt-2">
                Alguns dos negócios mais acessados da comunidade
              </p>
            </div>
            <Link
              href="/catalogo"
              className="hidden md:inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Ver todas <span aria-hidden="true">→</span>
            </Link>
          </div>

          {negocios.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {negocios.map((negocio) => (
                <NegocioCard key={negocio.id} negocio={negocio} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum negócio cadastrado ainda
              </h3>
              <p className="text-muted-foreground mb-6">
                Seja o primeiro a cadastrar seu negócio no GuiaBG!
              </p>
              <Link href="/solicitar">
                <Button size="lg" className="px-8 py-3 gap-2">
                  <Sparkles className="h-5 w-5" />
                  Cadastrar meu negócio
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Faça parte do GuiaBG
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Cadastre seu negócio gratuitamente e seja encontrado por milhares de
            moradores e visitantes de Bento Gonçalves.
          </p>
          <Link href="/solicitar">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-3.5 text-lg gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Sparkles className="h-5 w-5" />
              Cadastrar meu negócio grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 dark:bg-muted/10 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold text-foreground">
                  GuiaBG
                </span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                O guia comunitário de Bento Gonçalves. Feito pela comunidade,
                para a comunidade.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links úteis</h4>
              <nav className="space-y-2 text-sm text-muted-foreground">
                <Link
                  href="/catalogo"
                  className="block hover:text-primary transition-colors"
                >
                  Catálogo completo
                </Link>
                <Link
                  href="/solicitar"
                  className="block hover:text-primary transition-colors"
                >
                  Cadastrar negócio
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <address className="not-italic text-sm text-muted-foreground space-y-1">
                <p>Bento Gonçalves, RS</p>
                <p>Serra Gaúcha</p>
              </address>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 GuiaBG.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
