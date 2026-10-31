import Link from "next/link";
import {
  buscarNegocios,
  listarCategoriasAtivas,
  listarBairrosComNegocios,
} from "@/application/catalogo";
import { NegocioCard } from "./negocio-card";
import { Button } from "@/ui/components/button";
import { Badge } from "@/ui/components/badge";
import {
  Building2,
  MapPin,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

type SearchParams = Record<string, string | string[] | undefined>;

type Ordenacao = "relevancia" | "nome_asc" | "nome_desc" | "atualizado_desc";

const ORDENACOES: Array<{ valor: Ordenacao; rotulo: string }> = [
  { valor: "relevancia", rotulo: "Mais relevantes" },
  { valor: "atualizado_desc", rotulo: "Atualizados recentemente" },
  { valor: "nome_asc", rotulo: "Nome (A-Z)" },
  { valor: "nome_desc", rotulo: "Nome (Z-A)" },
];

const POR_PAGINA = 20;

function toArray(valor: string | string[] | undefined): string[] {
  if (!valor) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function primeiro(valor: string | string[] | undefined): string {
  return toArray(valor)[0] ?? "";
}

function parsePagina(valor: string | string[] | undefined): number {
  const numero = Number(primeiro(valor));
  return Number.isInteger(numero) && numero > 0 ? numero : 1;
}

function parseOrdenacao(valor: string | string[] | undefined): Ordenacao {
  const bruto = primeiro(valor);
  return ORDENACOES.some((o) => o.valor === bruto)
    ? (bruto as Ordenacao)
    : "relevancia";
}

function montarUrl(
  basePath: string,
  params: SearchParams,
  opcoes: {
    remover?: string[];
    removerValor?: [string, string];
    pagina?: number;
  } = {},
): string {
  const search = new URLSearchParams();

  for (const [chave, valor] of Object.entries(params)) {
    if (chave === "pagina") continue;
    if (opcoes.remover?.includes(chave)) continue;

    for (const item of toArray(valor)) {
      if (!item) continue;
      if (
        opcoes.removerValor &&
        opcoes.removerValor[0] === chave &&
        opcoes.removerValor[1] === item
      ) {
        continue;
      }
      search.append(chave, item);
    }
  }

  if (opcoes.pagina && opcoes.pagina > 1)
    search.set("pagina", String(opcoes.pagina));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export interface CatalogoViewProps {
  basePath: string;
  searchParams: SearchParams;
  titulo: string;
  descricao: string;
}

export async function CatalogoView({
  basePath,
  searchParams,
  titulo,
  descricao,
}: CatalogoViewProps) {
  const termo = primeiro(searchParams.q).trim();
  const categoriasSelecionadas = toArray(searchParams.categoria).filter(
    Boolean,
  );
  const bairrosSelecionados = toArray(searchParams.bairro).filter(Boolean);
  const ordenacao = parseOrdenacao(searchParams.ordem);
  const pagina = parsePagina(searchParams.pagina);

  const [categorias, bairros] = await Promise.all([
    listarCategoriasAtivas(),
    listarBairrosComNegocios(),
  ]);

  const idsPorSlug = new Map(categorias.map((c) => [c.slug, c.id]));
  const nomesPorSlug = new Map(categorias.map((c) => [c.slug, c.nome]));
  const categoriasIds = categoriasSelecionadas
    .map((slug) => idsPorSlug.get(slug))
    .filter((id): id is string => Boolean(id));

  const resultado = await buscarNegocios({
    q: termo || undefined,
    categoriasIds,
    bairros: bairrosSelecionados,
    pagina,
    porPagina: POR_PAGINA,
    ordenacao,
  });

  const { negocios, paginacao } = resultado;
  const temFiltros =
    Boolean(termo) ||
    categoriasSelecionadas.length > 0 ||
    bairrosSelecionados.length > 0 ||
    ordenacao !== "relevancia";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav
          aria-label="Você está aqui"
          className="text-sm text-muted-foreground mb-4"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Início
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span className="text-foreground">{titulo}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {titulo}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{descricao}</p>
        </header>

        {/* Busca (RF-002) — formulário GET funciona sem JS e preserva a URL */}
        <form
          method="get"
          action={basePath}
          role="search"
          className="mb-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="busca-q"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Buscar no catálogo
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="busca-q"
                  name="q"
                  type="search"
                  defaultValue={termo}
                  placeholder="Busque por negócio, serviço ou categoria"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="sm:w-56">
              <label
                htmlFor="busca-ordem"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Ordenar por
              </label>
              <select
                id="busca-ordem"
                name="ordem"
                defaultValue={ordenacao}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {ORDENACOES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" size="lg" className="gap-2 sm:w-auto">
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </Button>
          </div>
        </form>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Filtros (RF-003 / RF-004) */}
          <aside aria-label="Filtros do catálogo" className="space-y-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h2 className="font-semibold text-foreground">Filtros</h2>
            </div>

            <form method="get" action={basePath} className="space-y-6">
              {termo && <input type="hidden" name="q" value={termo} />}
              {ordenacao !== "relevancia" && (
                <input type="hidden" name="ordem" value={ordenacao} />
              )}

              <fieldset className="space-y-2">
                <legend className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                  <Tag
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Categoria
                </legend>
                <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5 border border-border rounded-lg p-2 bg-background">
                  {categorias.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma categoria ativa.
                    </p>
                  )}
                  {categorias.map((categoria) => (
                    <label
                      key={categoria.id}
                      htmlFor={`cat-${categoria.id}`}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer rounded px-1 py-0.5"
                    >
                      <input
                        id={`cat-${categoria.id}`}
                        type="checkbox"
                        name="categoria"
                        value={categoria.slug}
                        defaultChecked={categoriasSelecionadas.includes(
                          categoria.slug,
                        )}
                        className="h-4 w-4 rounded border-border accent-[color:var(--primary)]"
                      />
                      <span>{categoria.nome}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                  <MapPin
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Bairro
                </legend>
                <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 border border-border rounded-lg p-2 bg-background">
                  {bairros.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum bairro informado.
                    </p>
                  )}
                  {bairros.map((bairro) => (
                    <label
                      key={bairro.bairro}
                      htmlFor={`bairro-${bairro.bairro}`}
                      className="flex items-center gap-2 text-sm text-foreground cursor-pointer rounded px-1 py-0.5"
                    >
                      <input
                        id={`bairro-${bairro.bairro}`}
                        type="checkbox"
                        name="bairro"
                        value={bairro.bairro}
                        defaultChecked={bairrosSelecionados.includes(
                          bairro.bairro,
                        )}
                        className="h-4 w-4 rounded border-border accent-[color:var(--primary)]"
                      />
                      <span>
                        {bairro.bairro}{" "}
                        <span className="text-muted-foreground">
                          ({bairro.total})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-2">
                <Button type="submit" variant="outline" className="w-full">
                  Aplicar filtros
                </Button>
                {temFiltros && (
                  <Link
                    href={basePath}
                    className="inline-flex items-center justify-center gap-1 text-sm text-primary hover:underline py-1"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Limpar filtros
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* Resultados */}
          <section aria-label="Resultados" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {paginacao.total === 0
                  ? "Nenhum resultado"
                  : `${paginacao.total} ${paginacao.total === 1 ? "negócio encontrado" : "negócios encontrados"}`}
                {termo && (
                  <>
                    {" "}
                    para <strong className="text-foreground">“{termo}”</strong>
                  </>
                )}
              </p>

              {(categoriasSelecionadas.length > 0 ||
                bairrosSelecionados.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {categoriasSelecionadas.map((slug) => (
                    <Link
                      key={`cat-${slug}`}
                      href={montarUrl(basePath, searchParams, {
                        removerValor: ["categoria", slug],
                      })}
                      aria-label={`Remover filtro de categoria ${nomesPorSlug.get(slug) ?? slug}`}
                    >
                      <Badge variant="secondary" className="gap-1.5">
                        {nomesPorSlug.get(slug) ?? slug}
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Badge>
                    </Link>
                  ))}
                  {bairrosSelecionados.map((bairro) => (
                    <Link
                      key={`bairro-${bairro}`}
                      href={montarUrl(basePath, searchParams, {
                        removerValor: ["bairro", bairro],
                      })}
                      aria-label={`Remover filtro de bairro ${bairro}`}
                    >
                      <Badge variant="secondary" className="gap-1.5">
                        {bairro}
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {negocios.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {negocios.map((negocio) => (
                  <NegocioCard key={negocio.id} negocio={negocio} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-xl bg-muted/20">
                <Building2
                  className="h-12 w-12 text-muted-foreground mx-auto mb-4"
                  aria-hidden="true"
                />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {temFiltros
                    ? "Nenhum negócio com esses filtros"
                    : "O catálogo ainda está começando"}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {temFiltros
                    ? "Tente outra busca, remova algum filtro ou veja todas as categorias."
                    : "Assim que os primeiros negócios forem publicados, eles aparecem aqui."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {temFiltros && (
                    <Link href={basePath}>
                      <Button variant="outline" size="lg">
                        Limpar filtros
                      </Button>
                    </Link>
                  )}
                  <Link href="/solicitar">
                    <Button size="lg" className="gap-2">
                      Cadastrar meu negócio
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {paginacao.totalPaginas > 1 && (
              <nav
                aria-label="Paginação"
                className="mt-10 flex items-center justify-center gap-2"
              >
                {pagina > 1 && (
                  <Link
                    href={montarUrl(basePath, searchParams, {
                      pagina: pagina - 1,
                    })}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                  >
                    Anterior
                  </Link>
                )}

                {Array.from({ length: paginacao.totalPaginas }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 ||
                      n === paginacao.totalPaginas ||
                      Math.abs(n - pagina) <= 1,
                  )
                  .map((n, index, lista) => {
                    const anterior = lista[index - 1];
                    const mostrarReticencias =
                      anterior !== undefined && n - anterior > 1;
                    return (
                      <span key={n} className="flex items-center gap-2">
                        {mostrarReticencias && (
                          <span
                            className="text-muted-foreground"
                            aria-hidden="true"
                          >
                            …
                          </span>
                        )}
                        <Link
                          href={montarUrl(basePath, searchParams, {
                            pagina: n,
                          })}
                          aria-current={n === pagina ? "page" : undefined}
                          className={
                            n === pagina
                              ? "rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                              : "rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                          }
                        >
                          {n}
                        </Link>
                      </span>
                    );
                  })}

                {pagina < paginacao.totalPaginas && (
                  <Link
                    href={montarUrl(basePath, searchParams, {
                      pagina: pagina + 1,
                    })}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                  >
                    Próxima
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
