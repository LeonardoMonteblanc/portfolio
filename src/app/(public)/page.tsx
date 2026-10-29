import Link from "next/link";
import { buscarNegocios, listarCategoriasAtivas } from "@/application/catalogo";
import { Button } from "@/ui/components/button";
import { NativeSelect } from "@/ui/components/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { Badge } from "@/ui/components/badge";
import {
  MapPin,
  Search,
  Tag,
  Star,
  MapPin as MapPinIcon,
  Building2,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

// WhatsApp Icon Component
function WhatsAppIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48a11.914 11.914 0 0 0-7.26-3.36 11.9 11.9 0 0 0-7.12 3.03A11.94 11.94 0 0 0 1.56 11.67c0 2.57.94 4.95 2.58 6.87l-1.92 7.35c-.14.55.15 1.1.6 1.35.38.17.81.09 1.13-.14l3.44-2.48a.5.5 0 0 1 .64-.02c2.36 1.74 5.24 2.79 8.15 2.79 4.02 0 7.57-1.93 9.9-4.93a11.87 11.87 0 0 0 3.18-8.67 11.92 11.92 0 0 0-3.36-7.47 11.95 11.95 0 0 0-7.31-3.28 11.97 11.97 0 0 0-7.32 3.03A11.97 11.97 0 0 0 12 22.56c0 6.63-5.37 12-12 12S0 18.63 0 12 5.37 0 12 0s12 5.37 12 12a11.96 11.96 0 0 1-.14 1.58 11.85 11.85 0 0 1-1.44.7c-1.84.18-3.65-.36-5.1-1.44-.87-.61-1.6-1.43-2.2-2.38-.52-.82-.78-1.74-.74-2.73.02-.47.11-.93.29-1.38.3-.74.88-1.39 1.58-1.92a9.66 9.66 0 0 1 2.52-.92c.95 0 1.9.15 2.81.43.45.14.9.23 1.34.28l.32.04c.27.02.54-.04.77-.18.27-.17.48-.4.63-.68.13-.24.2-.5.27-.8.03-.08.05-.17.06-.26.01-.08.01-.16-.02-.24-.01-.17 0-.35-.01-.52-.02-.69-.01-1.37-.03-1.98-.04l-.35-.02a53.37 53.37 0 0 1-2.1-.33c-.25-.05-.5-.09-.73-.14a.5.5 0 0 1-.17-.81c.31-1.03.65-2.04 1.04-3.06.2-.47.32-.94.41-1.42.1-.47.15-.93.19-1.4.07-.81.1-1.61.1-2.43 0-.92-.04-1.84-.12-2.72-.08-.7-.17-1.37-.32-2.01-.18-.75-.4-1.47-.71-2.15-.36-.79-.8-1.5-1.29-2.1-.62-.73-1.32-1.33-2.11-1.77-.3-.18-.59-.36-.88-.53-.7-.44-1.24-1.03-1.64-1.71-.23-.38-.43-.77-.58-1.18-.15-.4-.26-.8-.33-1.2-.07-.38-.1-.76-.12-1.14-.02-.4-.02-.8-.01-1.2-.01-.4-.01-.8-.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.39.01-.78.01-1.17.01-.38 0-.77-.01-1.15-.01-.36-.01-.72-.01-1.07-.02-.33-.01-.65-.01-.96-.01-.3-.01-.59-.01-.89 0-.28 0-.55 0-.83.01-1.16.02-1.52.03-1.88.05-2.24.08-2.6.13-2.96.19-3.32.27-3.68.37-3.81.41-3.84.41-3.85.41h-.16c-3.34-.02-6.38-.1-9.38-.1-2.78 0-5.44.06-7.9.18-.82.04-1.62.11-2.4.22-.96.13-1.87.34-2.72.61-1.14.37-2.2.87-3.13 1.26-.4.17-.8.36-1.17.57-1.38.79-1.22.94-1.77 1.43-1.85 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18" />
    </svg>
  );
}

interface NegocioCardProps {
  negocio: {
    id: string;
    slug: string;
    nome: string;
    descricao: string;
    categorias: Array<{ id: string; nome: string; slug: string }>;
    contatos: Array<{ tipo: string; valor: string; ordem: number }>;
    localizacao: {
      bairro: string | null;
      areaAtendimento: string | null;
    } | null;
    abertoAgora: "aberto" | "fechado" | "sem_horario";
  };
}

function NegocioCard({ negocio }: NegocioCardProps) {
  const primeiroContato = negocio.contatos[0];
  const telefoneFormatado = primeiroContato
    ? primeiroContato.valor.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
    : null;

  return (
    <Link href={`/negocio/${negocio.slug}`} className="group">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            {negocio.categorias.slice(0, 3).map((cat) => (
              <Badge
                key={cat.id}
                variant="secondary"
                className="text-xs px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
              >
                {cat.nome}
              </Badge>
            ))}
            {negocio.categorias.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{negocio.categorias.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
                {negocio.nome}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                {negocio.descricao}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {negocio.abertoAgora === "aberto" && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Aberto
                </span>
              )}
              {negocio.abertoAgora === "fechado" && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Fechado
                </span>
              )}
              {negocio.abertoAgora === "sem_horario" && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <MapPinIcon className="h-3 w-3" />
                  Sem horário
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {negocio.localizacao?.bairro && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5" />
                <span>{negocio.localizacao.bairro}</span>
              </span>
            )}
            {telefoneFormatado && (
              <a
                href={`https://wa.me/55${telefoneFormatado.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
          <div className="mb-6">
            <Label
              htmlFor="filtro-categoria-home"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filtrar por categoria
            </Label>
            <NativeSelect
              id="filtro-categoria-home"
              name="categoria"
              value=""
              onChange={(e) => {
                const slug = e.target.value;
                if (slug) {
                  window.location.href = `/catalogo?categoria=${slug}`;
                } else {
                  window.location.href = "/catalogo";
                }
              }}
            >
              <option value="">Todas as categorias</option>
              {categoriasAtivas.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.nome}
                </option>
              ))}
            </NativeSelect>
          </div>

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
