// scripts/seed-completo.ts
// Seed completo para desenvolvimento e testes
// Rodar com: pnpm tsx scripts/seed-completo.ts

import { hashSenha } from "@/infrastructure/auth/hash";
import { db } from "@/infrastructure/db/client";
import {
  administrador,
  categoria,
  negocio,
  contato,
  localizacao,
  horarioFuncionamento,
  solicitante,
  solicitacao,
  sugestaoCategoria,
  aceiteTermo,
  documentoTermo,
  forumPublicacao,
  contestacao,
  votacao,
  voto,
  imagem,
  anexo,
  negocioCategoria,
} from "@/infrastructure/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { normalizarSlug } from "@/domain/utils/normalizar-slug";
import { gerarSlugUnico } from "@/domain/utils/gerar-slug-unico";

async function seedCompleto() {
  console.log("🌱 Iniciando seed completo...\n");

  // ============================================================
  // 1. ADMINISTRADOR
  // ============================================================
  console.log("👤 Criando administrador...");
  const adminEmail = "admin@guiabg.com.br";
  const adminSenha = "Guiabg@2024!";
  const senhaHash = await hashSenha(adminSenha);

  const [admin] = await db
    .insert(administrador)
    .values({
      email: adminEmail,
      nome: "Administrador GuiaBG",
      senhaHash,
      ativo: true,
      tokenVersion: 1,
    })
    .onConflictDoNothing()
    .returning();

  if (admin) {
    console.log(`  ✅ Admin criado: ${adminEmail} / ${adminSenha}`);
  } else {
    const existing = await db.query.administrador.findFirst({
      where: eq(administrador.email, adminEmail),
    });
    console.log(`  ℹ️  Admin já existe: ${existing?.email}`);
  }

  // ============================================================
  // 2. CATEGORIAS
  // ============================================================
  console.log("\n📂 Criando categorias...");
  const categoriasNomes = [
    // Alimentação
    "Restaurantes",
    "Pizzarias",
    "Hamburguerias e lanchonetes",
    "Padarias e confeitarias",
    "Cafeterias",
    "Bares e petiscarias",
    "Açaí e sorveterias",
    "Marmitarias e comida caseira",
    // Comércio
    "Moda, roupas e calçados",
    "Casa, móveis e decoração",
    "Material de construção",
    "Farmácias e drogarias",
    "Pet shops e artigos para animais",
    "Supermercados e mercados",
    // Serviços
    "Salões de beleza",
    "Barbearias",
    "Estética e beleza",
    "Academias e esportes",
    "Oficinas mecânicas",
    "Clínicas médicas",
    "Dentistas e odontologia",
    "Escritórios de contabilidade",
    "Advogados",
    "Imobiliárias",
  ];

  const categoriasCriadas = new Map<string, string>(); // slug -> id
  for (const nome of categoriasNomes) {
    const slug = normalizarSlug(nome);
    const existente = await db.query.categoria.findFirst({
      where: (c, { eq }) => eq(c.slug, slug),
    });

    if (existente) {
      categoriasCriadas.set(slug, existente.id);
      continue;
    }

    const [cat] = await db
      .insert(categoria)
      .values({ nome, slug, ativa: true })
      .returning();
    categoriasCriadas.set(slug, cat.id);
  }
  console.log(`  ✅ ${categoriasCriadas.size} categorias prontas`);

  // ============================================================
  // 3. DOCUMENTOS DE TERMOS
  // ============================================================
  console.log("\n📄 Criando documentos de termos...");
  const termos = [
    {
      tipo: "termos_uso" as const,
      versao: "1.0",
      conteudo: `# Termos de Uso do GuiaBG\n\nAo usar este diretório, você concorda com os termos abaixo...`,
      vigente: true,
    },
    {
      tipo: "politica_privacidade" as const,
      versao: "1.0",
      conteudo: `# Política de Privacidade\n\nColetamos dados mínimos para processar solicitações...`,
      vigente: true,
    },
    {
      tipo: "tratamento_dados" as const,
      versao: "1.0",
      conteudo: `# Tratamento de Dados Pessoais\n\nSeus dados são tratados com base no legítimo interesse...`,
      vigente: true,
    },
  ];

  for (const t of termos) {
    const existe = await db.query.documentoTermo.findFirst({
      where: (d, { and }) => and(eq(d.tipo, t.tipo), eq(d.vigente, true)),
    });
    if (!existe) {
      await db.insert(documentoTermo).values(t);
    }
  }
  console.log("  ✅ Termos criados");

  // ============================================================
  // 4. NEGÓCIOS DE EXEMPLO (em diferentes estados)
  // ============================================================
  console.log("\n🏪 Criando negócios de exemplo...");

  const getCatId = (slug: string) => categoriasCriadas.get(slug)!;

  const negociosDados = [
    {
      nome: "Padaria do Zé",
      descricao:
        "Pães artesanais, bolos caseiros e café fresquinho todo dia. Tradição desde 1995 no centro de Bento Gonçalves.",
      slug: "padaria-do-ze",
      situacao: "publicado",
      categorias: ["padarias-e-confeitarias", "cafeterias"],
      contatos: [
        { tipo: "whatsapp", valor: "54999990001", ordem: 0 },
        { tipo: "telefone", valor: "5434561234", ordem: 1 },
        { tipo: "instagram", valor: "padariadoze", ordem: 2 },
      ],
      localizacao: {
        endereco: "Rua Marechal Floriano, 123 - Centro",
        bairro: "Centro",
        areaAtendimento: "Bento Gonçalves",
      },
      horarios: [
        { dia: 1, abre: "06:00", fecha: "20:00" }, // Segunda
        { dia: 2, abre: "06:00", fecha: "20:00" },
        { dia: 3, abre: "06:00", fecha: "20:00" },
        { dia: 4, abre: "06:00", fecha: "20:00" },
        { dia: 5, abre: "06:00", fecha: "20:00" },
        { dia: 6, abre: "06:00", fecha: "18:00" }, // Sábado
      ],
    },
    {
      nome: "Pizzaria Bella Napoli",
      descricao:
        "Pizzas artesanais no forno a lenha, massas frescas e ingredientes selecionados. Delivery para toda Bento.",
      slug: "pizzaria-bella-napoli",
      situacao: "publicado",
      categorias: ["pizzarias", "restaurantes"],
      contatos: [
        { tipo: "whatsapp", valor: "54999990002", ordem: 0 },
        { tipo: "telefone", valor: "5434565678", ordem: 1 },
      ],
      localizacao: {
        endereco: "Av. Planalto, 456 - Planalto",
        bairro: "Planalto",
        areaAtendimento: "Bento Gonçalves",
      },
      horarios: [
        { dia: 2, abre: "18:00", fecha: "23:00" },
        { dia: 3, abre: "18:00", fecha: "23:00" },
        { dia: 4, abre: "18:00", fecha: "23:00" },
        { dia: 5, abre: "18:00", fecha: "23:30" },
        { dia: 6, abre: "18:00", fecha: "23:30" },
        { dia: 0, abre: "18:00", fecha: "23:00" }, // Domingo
      ],
    },
    {
      nome: "Salão Beleza Total",
      descricao:
        "Cortes, coloração, hidratação, manicure e pedicure. Profissionais qualificados e ambiente acolhedor.",
      slug: "salao-beleza-total",
      situacao: "publicado",
      categorias: ["saloes-de-beleza", "estetica-e-beleza"],
      contatos: [
        { tipo: "whatsapp", valor: "54999990003", ordem: 0 },
        { tipo: "instagram", valor: "belezatotalbg", ordem: 1 },
      ],
      localizacao: {
        endereco: "Rua 13 de Maio, 789 - São Bento",
        bairro: "São Bento",
      },
      horarios: [
        { dia: 2, abre: "09:00", fecha: "19:00" },
        { dia: 3, abre: "09:00", fecha: "19:00" },
        { dia: 4, abre: "09:00", fecha: "19:00" },
        { dia: 5, abre: "09:00", fecha: "19:00" },
        { dia: 6, abre: "09:00", fecha: "17:00" },
      ],
    },
    {
      nome: "Oficina do João",
      descricao:
        "Mecânica geral, revisão, freios, suspensão e elétrica. Atendimento honesto e preço justo.",
      slug: "oficina-do-joao",
      situacao: "nao_publicado", // elegível mas não publicado
      categorias: ["oficinas-mecanicas"],
      contatos: [
        { tipo: "telefone", valor: "5434569999", ordem: 0 },
        { tipo: "whatsapp", valor: "54999990004", ordem: 1 },
      ],
      localizacao: {
        endereco: "Rua das Indústrias, 100 - Industrial",
        bairro: "Industrial",
      },
      horarios: [
        { dia: 1, abre: "08:00", fecha: "18:00" },
        { dia: 2, abre: "08:00", fecha: "18:00" },
        { dia: 3, abre: "08:00", fecha: "18:00" },
        { dia: 4, abre: "08:00", fecha: "18:00" },
        { dia: 5, abre: "08:00", fecha: "17:00" },
      ],
    },
    {
      nome: "Clínica OdontoSorriso",
      descricao:
        "Odontologia completa: clínico geral, ortodontia, implantes, clareamento e emergências.",
      slug: "clinica-odontosorriso",
      situacao: "nao_elegivel", // sem aprovação
      categorias: ["dentistas-e-odontologia"],
      contatos: [{ tipo: "whatsapp", valor: "54999990005", ordem: 0 }],
      localizacao: {
        endereco: "Rua Saldanha Marinho, 321 - Centro",
        bairro: "Centro",
      },
      horarios: [
        { dia: 1, abre: "08:00", fecha: "19:00" },
        { dia: 2, abre: "08:00", fecha: "19:00" },
        { dia: 3, abre: "08:00", fecha: "19:00" },
        { dia: 4, abre: "08:00", fecha: "19:00" },
        { dia: 5, abre: "08:00", fecha: "18:00" },
      ],
    },
    {
      nome: "Mercado São José",
      descricao:
        "Supermercado de bairro com hortifrúti fresco, açougue próprio, padaria e produtos coloniais.",
      slug: "mercado-sao-jose",
      situacao: "oculto_contestacao", // em votação
      categorias: ["supermercados-e-mercados", "hortifruti-e-fruteiras"],
      contatos: [
        { tipo: "telefone", valor: "5434567777", ordem: 0 },
        { tipo: "whatsapp", valor: "54999990006", ordem: 1 },
      ],
      localizacao: {
        endereco: "Rua São José, 555 - São José",
        bairro: "São José",
      },
      horarios: [
        { dia: 1, abre: "08:00", fecha: "21:00" },
        { dia: 2, abre: "08:00", fecha: "21:00" },
        { dia: 3, abre: "08:00", fecha: "21:00" },
        { dia: 4, abre: "08:00", fecha: "21:00" },
        { dia: 5, abre: "08:00", fecha: "21:00" },
        { dia: 6, abre: "08:00", fecha: "20:00" },
        { dia: 0, abre: "08:00", fecha: "14:00" },
      ],
    },
  ];

  for (const n of negociosDados) {
    const existe = await db.query.negocio.findFirst({
      where: eq(negocio.slug, n.slug),
    });

    if (existe) {
      console.log(`  ℹ️  Negócio já existe: ${n.nome}`);
      continue;
    }

    // Calcular slug único
    const baseSlug = n.slug;
    const existentes = new Set(
      (await db.select({ slug: negocio.slug }).from(negocio)).map(
        (x) => x.slug,
      ),
    );
    const slugUnico = gerarSlugUnico(baseSlug, existentes);

    const [novoNegocio] = await db
      .insert(negocio)
      .values({
        slug: slugUnico,
        nome: n.nome,
        descricao: n.descricao,
        situacaoPublicacao: n.situacao as any,
        fonte: "admin",
      })
      .returning();

    // Contatos
    for (const c of n.contatos) {
      await db.insert(contato).values({
        negocioId: novoNegocio.id,
        tipo: c.tipo as any,
        valor: c.valor,
        ordem: c.ordem,
        valido: true,
      });
    }

    // Localização
    if (n.localizacao) {
      await db.insert(localizacao).values({
        negocioId: novoNegocio.id,
        endereco: n.localizacao.endereco,
        bairro: n.localizacao.bairro,
        areaAtendimento: n.localizacao.areaAtendimento,
      });
    }

    // Horários
    for (const h of n.horarios) {
      await db.insert(horarioFuncionamento).values({
        negocioId: novoNegocio.id,
        diaSemana: h.dia,
        horaAbertura: h.abre,
        horaFechamento: h.fecha,
      });
    }

    // Categorias
    for (const catSlug of n.categorias) {
      const catId = getCatId(catSlug);
      if (catId) {
        await db.insert(negocioCategoria).values({
          negocioId: novoNegocio.id,
          categoriaId: catId,
        });
      }
    }

    console.log(`  ✅ ${n.nome} (${n.situacao})`);
  }

  // ============================================================
  // 5. SOLICITANTES E SOLICITAÇÕES (vários estados)
  // ============================================================
  console.log("\n📝 Criando solicitantes e solicitações...");

  const solicitacoesDados = [
    {
      // Inclusão - recebida
      solicitante: {
        nome: "Carlos Silva",
        email: "carlos@email.com",
        telefone: "54999991111",
      },
      tipo: "inclusao",
      situacao: "recebida",
      declaracaoVinculo: "Sou proprietário do estabelecimento",
      dadosNegocio: {
        nome: "Lanchonete do Carlos",
        descricao: "Lanches artesanais, sucos naturais e porções",
        contatos: [{ tipo: "whatsapp", valor: "54999991111", ordem: 0 }],
        categoriasIds: [getCatId("hamburguerias-e-lanchonetes")],
      },
    },
    {
      // Inclusão - em_analise
      solicitante: {
        nome: "Maria Santos",
        email: "maria@email.com",
        telefone: "54999992222",
      },
      tipo: "inclusao",
      situacao: "em_analise",
      declaracaoVinculo: "Sou sócia do negócio",
      dadosNegocio: {
        nome: "Flores & Arte",
        descricao: "Floricultura com arranjos para casamentos e eventos",
        contatos: [{ tipo: "whatsapp", valor: "54999992222", ordem: 0 }],
        categoriasId: [getCatId("presentes-e-artesanato")],
      },
    },
    {
      // Inclusão - aprovada (já virou negócio)
      solicitante: {
        nome: "João Pedro",
        email: "joao@email.com",
        telefone: "54999993333",
      },
      tipo: "inclusao",
      situacao: "aprovada",
      declaracaoVinculo: "Proprietário",
      dadosNegocio: {
        nome: "Auto Peças JP",
        descricao: "Peças para veículos nacionais e importados",
        contatos: [{ tipo: "telefone", valor: "5434568888", ordem: 0 }],
        categoriasIds: [getCatId("comercio-de-pecas")],
      },
    },
    {
      // Atualização - recebida
      solicitante: {
        nome: "Ana Costa",
        email: "ana@email.com",
        telefone: "54999994444",
      },
      tipo: "atualizacao",
      situacao: "recebida",
      declaracaoVinculo: "Gerente do estabelecimento",
      dadosNegocio: {
        nome: "Padaria do Zé - Atualização",
        descricao:
          "Pães artesanais, bolos caseiros e café fresquinho. NOVO: encomendas para festas!",
        contatos: [
          { tipo: "whatsapp", valor: "54999990001", ordem: 0 },
          { tipo: "telefone", valor: "5434561234", ordem: 1 },
          { tipo: "email", valor: "contato@padariadoze.com.br", ordem: 2 },
        ],
        categoriasIds: [
          getCatId("padarias-e-confeitarias"),
          getCatId("cafeterias"),
        ],
      },
    },
    {
      // Inclusão - aguardando_correcao
      solicitante: {
        nome: "Roberto Lima",
        email: "roberto@email.com",
        telefone: "54999995555",
      },
      tipo: "inclusao",
      situacao: "aguardando_correcao",
      declaracaoVinculo: "Proprietário",
      dadosNegocio: {
        nome: "Academia FitTotal",
        descricao: "Musculação, aulas coletivas, personal trainer",
        contatos: [{ tipo: "whatsapp", valor: "54999995555", ordem: 0 }],
        categoriasIds: [getCatId("academias-e-esportes")],
      },
    },
    {
      // Inclusão - rejeitada
      solicitante: {
        nome: "Fernanda Rocha",
        email: "fernanda@email.com",
        telefone: "54999996666",
      },
      tipo: "inclusao",
      situacao: "rejeitada",
      declaracaoVinculo: "Funcionária",
      dadosNegocio: {
        nome: "Loja sem categoria válida",
        descricao: "Descrição teste",
        contatos: [{ tipo: "whatsapp", valor: "54999996666", ordem: 0 }],
        categoriasIds: [],
      },
    },
    {
      // Inclusão - incompleta (prazo vencido)
      solicitante: {
        nome: "Paulo Mendes",
        email: "paulo@email.com",
        telefone: "54999997777",
      },
      tipo: "inclusao",
      situacao: "incompleta",
      declaracaoVinculo: "Proprietário",
      dadosNegocio: {
        nome: "Pet Shop Amigo Fiel",
        descricao: "Banho, tosa, rações e acessórios",
        contatos: [{ tipo: "whatsapp", valor: "54999997777", ordem: 0 }],
        categoriasIds: [getCatId("pet-shops-e-artigos-para-animais")],
      },
    },
    {
      // Inclusão - em_votacao
      solicitante: {
        nome: "Lucia Ferreira",
        email: "lucia@email.com",
        telefone: "54999998888",
      },
      tipo: "inclusao",
      situacao: "em_votacao",
      declaracaoVinculo: "Sócia",
      dadosNegocio: {
        nome: "Mercado Central BG",
        descricao: "Mercado de bairro completo",
        contatos: [{ tipo: "whatsapp", valor: "54999998888", ordem: 0 }],
        categoriasIds: [getCatId("supermercados-e-mercados")],
      },
    },
  ];

  for (const s of solicitacoesDados) {
    // Criar solicitante
    const [solr] = await db
      .insert(solicitante)
      .values({
        nome: s.solicitante.nome,
        email: s.solicitante.email,
        telefone: s.solicitante.telefone,
      })
      .onConflictDoNothing()
      .returning();

    const solicitanteId =
      solr?.id ||
      (await db.query.solicitante.findFirst({
        where: eq(solicitante.email, s.solicitante.email),
      }))!.id;

    // Verificar se solicitação já existe
    const existeSol = await db.query.solicitacao.findFirst({
      where: (s, { and }) =>
        and(eq(s.solicitanteId, solicitanteId), eq(s.tipo, s.tipo)),
    });

    if (existeSol) continue;

    // Buscar termos vigentes
    const termosVigentes = await Promise.all([
      db.query.documentoTermo.findFirst({
        where: (d, { and }) =>
          and(eq(d.tipo, "termos_uso"), eq(d.vigente, true)),
      }),
      db.query.documentoTermo.findFirst({
        where: (d, { and }) =>
          and(eq(d.tipo, "politica_privacidade"), eq(d.vigente, true)),
      }),
      db.query.documentoTermo.findFirst({
        where: (d, { and }) =>
          and(eq(d.tipo, "tratamento_dados"), eq(d.vigente, true)),
      }),
    ]);

    await db.transaction(async (tx) => {
      const [novaSol] = await tx
        .insert(solicitacao)
        .values({
          solicitanteId,
          tipo: s.tipo as any,
          situacao: s.situacao as any,
          declaracaoVinculo: s.declaracaoVinculo,
          dadosNegocioProposto: s.dadosNegocio,
          duplicataDetectada: false,
        })
        .returning();

      // Aceites de termos
      for (const doc of termosVigentes) {
        if (doc) {
          await tx.insert(aceiteTermo).values({
            solicitanteId,
            documentoTermoId: doc.id,
          });
        }
      }

      // Sugestão de categoria se houver
      if (s.dadosNegocio.categoriasIds?.length === 0 && s.tipo === "inclusao") {
        await tx.insert(sugestaoCategoria).values({
          solicitacaoId: novaSol.id,
          textoSugerido: "Categoria sugerida pelo solicitante",
          situacao: "pendente",
        });
      }
    });

    console.log(`  ✅ Solicitação: ${s.solicitante.nome} (${s.situacao})`);
  }

  // ============================================================
  // 6. FÓRUM E CONTESTAÇÃO
  // ============================================================
  console.log("\n💬 Criando fórum e contestações...");

  // Buscar uma solicitação aprovada para criar contestação
  const solAprovada = await db.query.solicitacao.findFirst({
    where: eq(solicitacao.situacao, "aprovada"),
    with: { solicitante: true },
  });

  if (solAprovada) {
    const contExiste = await db.query.contestacao.findFirst({
      where: eq(contestacao.solicitacaoOrigemId, solAprovada.id),
    });

    if (!contExiste) {
      const [novaContestacao] = await db
        .insert(contestacao)
        .values({
          negocioId: (await db.query.negocio.findFirst({
            where: eq(negocio.slug, "pizzaria-bella-napoli"),
          }))!.id,
          solicitacaoOrigemId: solAprovada.id,
          autorId: (await db.query.administrador.findFirst())!.id,
          tipo: "oficial",
          fundamentacao:
            "Discordo da aprovação. O estabelecimento não atende aos critérios de higiene.",
          situacao: "aberta",
        })
        .returning();

      // Criar votação
      const adminsAtivos = await db.query.administrador.findMany({
        where: eq(administrador.ativo, true),
        columns: { id: true },
      });

      await db.insert(votacao).values({
        contestacaoId: novaContestacao.id,
        pergunta: "A solicitação deve ser mantida como aprovada?",
        tipo: "simples",
        quorumMinimo: adminsAtivos.length,
        maioriaNecessaria: 50,
        situacao: "em_andamento",
        encerraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      });

      console.log("  ✅ Contestação e votação criadas");
    }
  }

  // ============================================================
  // 7. IMAGENS E ANEXOS
  // ============================================================
  console.log("\n🖼️  Criando imagens e anexos...");

  const padaria = await db.query.negocio.findFirst({
    where: eq(negocio.slug, "padaria-do-ze"),
  });

  if (padaria) {
    const imgExiste = await db.query.imagem.findFirst({
      where: eq(imagem.negocioId, padaria.id),
    });

    if (!imgExiste) {
      await db.insert(imagem).values([
        {
          negocioId: padaria.id,
          tipo: "logo",
          url: "https://example.com/logo-padaria.jpg",
          textoAlternativo: "Logo da Padaria do Zé - pão e trigo estilizados",
          ordem: 0,
          situacao: "aprovada",
        },
        {
          negocioId: padaria.id,
          tipo: "foto",
          url: "https://example.com/foto-padaria-1.jpg",
          textoAlternativo: "Interior da padaria com pães na vitrine",
          ordem: 1,
          situacao: "aprovada",
        },
        {
          negocioId: padaria.id,
          tipo: "foto",
          url: "https://example.com/foto-padaria-2.jpg",
          textoAlternativo: "Bolos caseiros expostos",
          ordem: 2,
          situacao: "pendente",
        },
      ]);
      console.log("  ✅ Imagens da padaria criadas");
    }
  }

  // ============================================================
  // 8. CONFIGURAÇÕES DO SISTEMA
  // ============================================================
  console.log("\n⚙️  Criando configurações...");

  // TODO: configuracao table not created yet - will be added in Phase 9
  // const configs = [
  //   { chave: "prazo_correcao_dias", valor: "7" },
  //   { chave: "rate_limit_login_por_min", valor: "10" },
  //   { chave: "rate_limit_solicitacao_por_hora", valor: "5" },
  //   { chave: "tamanho_max_upload_mb", valor: "10" },
  //   { chave: "formatos_imagem_aceitos", valor: "jpg,png,webp" },
  //   { chave: "formatos_anexo_aceitos", valor: "jpg,png,webp,pdf" },
  //   { chave: "max_anexos_por_solicitacao", valor: "3" },
  //   { chave: "email_admin_institucional", valor: "contato@guiabg.com.br" },
  //   { chave: "email_contato_dpo", valor: "dpo@guiabg.com.br" },
  //   { chave: "refresh_view_auditoria_min", valor: "5" },
  // ];
  //
  // for (const cfg of configs) {
  //   await db
  //     .insert(configuracao)
  //     .values({
  //       chave: cfg.chave,
  //       valor: cfg.valor,
  //       atualizadoPor: admin?.id || (await db.query.administrador.findFirst())!.id,
  //     })
  //     .onConflictDoNothing();
  // }
  // console.log("  ✅ Configurações criadas");

  // ============================================================
  // 9. RESUMO
  // ============================================================
  console.log("\n" + "=".repeat(50));
  console.log("🎉 SEED COMPLETO FINALIZADO!");
  console.log("=".repeat(50));
  console.log(`
📋 DADOS CRIADOS:
  • 1 Admin: admin@guiabg.com.br / Guiabg@2024!
  • ${categoriasCriadas.size} Categorias ativas
  • 3 Documentos de termos (vigentes)
  • 6 Negócios em estados variados:
    - 3 Publicados (Padaria, Pizzaria, Salão)
    - 1 Não publicado (Oficina)
    - 1 Não elegível (Clínica)
    - 1 Oculto por contestação (Mercado)
  • 7 Solicitações em todos os estados:
    - recebida, em_analise, aprovada, aguardando_correcao, rejeitada, incompleta, em_votacao
  • 1 Contestação + Votação ativa
  • Imagens (logo + fotos) para Padaria
  • 10 Configurações do sistema

🔗 URLs PARA TESTE:
  • Catálogo público: http://localhost:3000/
  • Busca: http://localhost:3000/?q=pizza
  • Negócio: http://localhost:3000/negocio/padaria-do-ze
  • Solicitar: http://localhost:3000/solicitar
  • Login admin: http://localhost:3000/login
  • Painel: http://localhost:3000/admin/solicitacoes

⚠️  IMPORTANTE: Troque a senha do admin no primeiro login!
  `);
}

seedCompleto()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  });
