import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db/client";
import {
  administrador,
  categoria,
  contato,
  localizacao,
  negocio,
  negocioCategoria,
  solicitacao,
  solicitante,
} from "@/infrastructure/db/schema";

/**
 * Helpers compartilhados pelos testes de integração.
 * Cada teste começa com o banco limpo (TRUNCATE ... CASCADE).
 */

export async function limparBanco(): Promise<void> {
  const linhas = await db.execute(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );

  const nomes = (linhas as unknown as Array<{ tablename: string }>)
    .map((linha) => linha.tablename)
    .filter((nome) => nome !== "__drizzle_migrations");

  if (nomes.length === 0) return;

  await db.execute(
    sql.raw(
      `TRUNCATE TABLE ${nomes.map((nome) => `"${nome}"`).join(", ")} RESTART IDENTITY CASCADE`,
    ),
  );
}

export interface CenarioNegocio {
  slug: string;
  nome: string;
  descricao?: string;
  situacao?:
    "publicado" | "nao_publicado" | "nao_elegivel" | "oculto_contestacao";
  bairro?: string | null;
  categorias?: string[];
  telefone?: string;
}

/** Cria categoria ativa (ou reaproveita a de mesmo slug). */
export async function criarCategoria(slug: string, nome = slug) {
  const inserida = await db
    .insert(categoria)
    .values({ slug, nome, ativa: true })
    .onConflictDoNothing()
    .returning();

  if (inserida[0]) return inserida[0];

  const existente = await db
    .select()
    .from(categoria)
    .where(sql`${categoria.slug} = ${slug}`)
    .limit(1);

  const encontrada = existente[0];
  if (!encontrada) throw new Error(`Falha ao criar categoria ${slug}`);
  return encontrada;
}

/** Cria um negócio com localização, contato e categorias. */
export async function criarNegocio(cenario: CenarioNegocio) {
  const [novo] = await db
    .insert(negocio)
    .values({
      slug: cenario.slug,
      nome: cenario.nome,
      descricao: cenario.descricao ?? `Descrição de ${cenario.nome}`,
      situacaoPublicacao: cenario.situacao ?? "publicado",
    })
    .returning();

  if (!novo) throw new Error("Falha ao criar negócio");

  if (cenario.bairro !== undefined) {
    await db.insert(localizacao).values({
      negocioId: novo.id,
      bairro: cenario.bairro,
    });
  }

  await db.insert(contato).values({
    negocioId: novo.id,
    tipo: "telefone",
    valor: cenario.telefone ?? "54999998888",
    ordem: 0,
    valido: true,
  });

  for (const slugCategoria of cenario.categorias ?? []) {
    const cat = await criarCategoria(slugCategoria);
    await db
      .insert(negocioCategoria)
      .values({ negocioId: novo.id, categoriaId: cat.id })
      .onConflictDoNothing();
  }

  return novo;
}

export interface OpcoesSolicitacao {
  criadoEm?: Date;
  atualizadoEm?: Date;
  situacao?: string;
}

/** Cria solicitante + solicitação com jsonb de negócio proposto. */
export async function criarSolicitacaoComPii(
  opcoes: OpcoesSolicitacao | Date = {},
) {
  const config: OpcoesSolicitacao =
    opcoes instanceof Date ? { criadoEm: opcoes } : opcoes;
  const [novoSolicitante] = await db
    .insert(solicitante)
    .values({
      nome: "Maria Souza",
      email: "maria@exemplo.com",
      telefone: "54988887777",
    })
    .returning();

  if (!novoSolicitante) throw new Error("Falha ao criar solicitante");

  const [novaSolicitacao] = await db
    .insert(solicitacao)
    .values({
      solicitanteId: novoSolicitante.id,
      tipo: "inclusao",
      situacao: config.situacao ?? "recebida",
      declaracaoVinculo: "Sou proprietária do negócio",
      dadosNegocioProposto: {
        nome: "Ateliê da Maria",
        descricao: "Costura criativa e reparos",
        contatos: [{ tipo: "whatsapp", valor: "54988887777", ordem: 0 }],
        localizacao: { bairro: "Centro", endereco: "Rua Sinimbu, 100" },
        horarios: [
          { diaSemana: 1, horaAbertura: "09:00", horaFechamento: "18:00" },
        ],
        sugestaoCategoria: "Costura",
      },
      ...(config.criadoEm ? { criadoEm: config.criadoEm } : {}),
      ...(config.atualizadoEm ? { atualizadoEm: config.atualizadoEm } : {}),
    })
    .returning();

  if (!novaSolicitacao) throw new Error("Falha ao criar solicitação");

  return { solicitante: novoSolicitante, solicitacao: novaSolicitacao };
}
/** Cria um administrador ativo (necessário para FKs de auditoria/configuração). */
export async function criarAdmin(email = "admin.teste@guiabg.com.br") {
  const [novo] = await db
    .insert(administrador)
    .values({
      nome: "Admin de Teste",
      email,
      senhaHash: "hash-de-teste",
      ativo: true,
      tokenVersion: 1,
    })
    .returning();

  if (!novo) throw new Error("Falha ao criar administrador");
  return novo;
}
