// src/app/(public)/negocio/[slug]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarNegocioPorSlug } from "@/application/negocios/listar";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import { ShareButton } from "@/ui/components/share-button";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MapPin as MapPinIcon,
  Building2,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Tag,
} from "lucide-react";
import Link from "next/link";

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
      <path d="M20.52 3.48a11.914 11.914 0 0 0-7.26-3.36 11.9 11.9 0 0 0-7.12 3.03A11.94 11.94 0 0 0 1.56 11.67c0 2.57.94 4.95 2.58 6.87l-1.92 7.35c-.14.55.15 1.1.6 1.35.38.17.81.09 1.13-.14l3.44-2.48a.5.5 0 0 1 .64-.02c2.36 1.74 5.24 2.79 8.15 2.79 4.02 0 7.57-1.93 9.9-4.93a11.87 11.87 0 0 0 3.18-8.67 11.92 11.92 0 0 0-3.36-7.47 11.95 11.95 0 0 0-7.31-3.28 11.97 11.97 0 0 0-7.32 3.03A11.97 11.97 0 0 0 12 22.56c0 6.63-5.37 12-12 12S0 18.63 0 12 5.37 0 12 0s12 5.37 12 12a11.96 11.96 0 0 1-.14 1.58 11.85 11.85 0 0 1-1.44.7c-1.84.18-3.65-.36-5.1-1.44-.87-.61-1.6-1.43-2.2-2.38-.52-.82-.78-1.74-.74-2.73.02-.47.11-.93.29-1.38.3-.74.88-1.39 1.58-1.92a9.66 9.66 0 0 1 2.52-.92c.95 0 1.9.15 2.81.43.45.14.9.23 1.34.28l.32.04c.27.02.54-.04.77-.18.27-.17.48-.4.63-.68.13-.24.2-.5.27-.8.03-.08.05-.17.06-.26.01-.08.01-.16-.02-.24-.01-.17 0-.35-.01-.52-.02-.69-.01-1.37-.03-1.98-.04l-.35-.02a53.37 53.37 0 0 1-2.1-.33c-.25-.05-.5-.09-.73-.14a.5.5 0 0 1-.17-.81c.31-1.03.65-2.04 1.04-3.06.2-.47.32-.94.41-1.42.1-.47.15-.93.19-1.4.07-.81.1-1.61.1-2.43 0-.92-.04-1.84-.12-2.72-.08-.7-.17-1.37-.32-2.01-.18-.75-.4-1.47-.71-2.15-.36-.79-.8-1.5-1.29-2.1-.62-.73-1.32-1.33-2.11-1.77-.3-.18-.59-.36-.88-.53-.7-.44-1.24-1.03-1.64-1.71-.23-.38-.43-.77-.58-1.18-.15-.4-.26-.8-.33-1.2-.07-.38-.1-.76-.12-1.14-.02-.4-.02-.8-.01-1.2-.01-.4-.01-.8-.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.4.01-.8.01-1.2 0-.39.01-.78.01-1.17.01-.38 0-.77-.01-1.15-.01-.36-.01-.72-.01-1.07-.02-.33-.01-.65-.01-.96-.01-.3-.01-.59-.01-.89 0-.28 0-.55 0-.83.01-1.16.02-1.52.03-1.88.05-2.24.08-2.6.13-2.96.19-3.32.27-3.68.37-3.81.41-3.84.41-3.85.41h-.16c-3.34-.02-6.38-.1-9.38-.1-2.78 0-5.44.06-7.9.18-.82.04-1.62.11-2.4.22-.96.13-1.87.34-2.72.61-1.14.37-2.2.87-3.13 1.26-.4.17-.8.36-1.17.57-1.38.79-1.22.94-1.77 1.43-1.85 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18 1.85-1.18" />
    </svg>
  );
}

async function getNegocioData(slug: string) {
  return buscarNegocioPorSlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug) {
    return {
      title: "Negócio - GuiaBG",
    };
  }

  const negocio = await getNegocioData(slug);

  if (!negocio) {
    return {
      title: "Negócio não encontrado - GuiaBG",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://guiabg.com.br";
  const pageUrl = `${siteUrl}/negocio/${slug}`;

  return {
    title: `${negocio.nome} - GuiaBG`,
    description: negocio.descricao.slice(0, 160),
    openGraph: {
      title: negocio.nome,
      description: negocio.descricao.slice(0, 160),
      type: "website",
      url: pageUrl,
      siteName: "GuiaBG",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: negocio.nome,
      description: negocio.descricao.slice(0, 160),
    },
    other: {
      "og:url": pageUrl,
    },
  };
}

async function NegocioPageContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await getNegocioData(slug);

  if (!negocio) {
    notFound();
  }

  const primeiroContato = negocio.contatos[0];
  const telefoneFormatado = primeiroContato
    ? primeiroContato.valor.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
    : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://guiabg.com.br";
  const pageUrl = `${siteUrl}/negocio/${slug}`;

  const DIAS_SEMANA = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">GuiaBG</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/catalogo"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Catálogo
              </Link>
              <Link
                href="/solicitar"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cadastrar
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/catalogo"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <span aria-hidden="true">←</span> Voltar ao catálogo
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {negocio.categorias
                    .map((cat: any) => cat.categoria?.nome || cat.nome)
                    .join(", ") || "Sem categoria"}
                </span>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mt-2">
                  {negocio.nome}
                </h1>
              </div>
              <ShareButton
                url={pageUrl}
                title={negocio.nome}
                text={negocio.descricao}
                variant="outline"
                size="default"
              />
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg text-muted-foreground">
                {negocio.descricao}
              </p>
            </div>

            {/* Contatos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contatos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {negocio.contatos.map((contato, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="font-medium capitalize text-sm text-muted-foreground min-w-[100px]">
                      {contato.tipo}:
                    </span>
                    {contato.tipo === "whatsapp" && telefoneFormatado ? (
                      <a
                        href={`https://wa.me/55${telefoneFormatado.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <span className="font-medium">{telefoneFormatado}</span>
                        <span className="text-green-600">WhatsApp</span>
                      </a>
                    ) : (
                      <span className="font-medium">{contato.valor}</span>
                    )}
                    {contato.ordem !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        (ordem: {contato.ordem})
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Localização */}
            {negocio.localizacao && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {negocio.localizacao.endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p>{negocio.localizacao.endereco}</p>
                    </div>
                  )}
                  {negocio.localizacao.bairro && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span>Bairro: {negocio.localizacao.bairro}</span>
                    </div>
                  )}
                  {negocio.localizacao.areaAtendimento && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Área de atendimento:{" "}
                        {negocio.localizacao.areaAtendimento}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Horários */}
            {negocio.horarios && negocio.horarios.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários de Funcionamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {negocio.horarios.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span className="font-medium capitalize">
                          {DIAS_SEMANA[h.diaSemana]}
                        </span>
                        <div className="flex items-center gap-4">
                          <span>
                            {h.horaAbertura} - {h.horaFechamento}
                          </span>
                          {h.observacao && (
                            <span className="text-sm text-muted-foreground">
                              ({h.observacao})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categorias */}
            {negocio.categorias.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Categorias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {negocio.categorias.map((cat: any) => (
                      <Badge
                        key={cat.categoria?.id || cat.id}
                        variant="secondary"
                        className="text-sm"
                      >
                        {cat.categoria?.nome || cat.nome}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão solicitar correção */}
            <div className="pt-4">
              <Link
                href={`/solicitar?negocio=${negocio.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Solicitar correção ou atualização
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-1 space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações
                </CardTitle>
                <CardDescription>Detalhes do negócio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {negocio.localizacao?.bairro && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{negocio.localizacao.bairro}</span>
                  </div>
                )}

                {negocio.categorias.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Categorias
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {negocio.categorias.map((cat: any) => (
                        <Badge
                          key={cat.categoria?.id || cat.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {cat.categoria?.nome || cat.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Link
                    href={`/solicitar?negocio=${negocio.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Solicitar correção
                  </Link>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>© 2025 GuiaBG. Diretório Comunitário de Bento Gonçalves.</p>
        </div>
      </footer>
    </div>
  );
}

export default async function NegocioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const negocio = await getNegocioData(slug);

  if (!negocio) {
    notFound();
  }

  return <NegocioPageContent params={Promise.resolve({ slug })} />;
}
