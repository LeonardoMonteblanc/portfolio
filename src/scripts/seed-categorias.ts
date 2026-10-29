// src/scripts/seed-categorias.ts
import { db } from "@/infrastructure/db/client";
import { categoria } from "@/infrastructure/db/schema/categoria";
import { eq } from "drizzle-orm";
import { normalizarSlug } from "@/domain/utils/normalizar-slug";

const categoriasParaCadastrar = [
  // Alimentação e Gastronomia
  "Açaí e sorveterias",
  "Açougues",
  "Bares e petiscarias",
  "Cafeterias",
  "Churrascarias",
  "Distribuidoras de bebidas",
  "Hamburguerias e lanchonetes",
  "Hortifrúti e fruteiras",
  "Marmitarias e comida caseira",
  "Padarias e confeitarias",
  "Pastelarias",
  "Pizzarias",
  "Restaurantes",
  "Supermercados e mercados",
  "Sushi e comida japonesa",
  // Comércio — Varejo e Atacado
  "Comércio atacadista",
  "Lojas de departamento",
  "Moda, roupas e calçados",
  "Casa, móveis e decoração",
  "Material de construção",
  "Presentes e artesanato",
  "Papelaria e livros",
  "Óticas e joalherias",
  "Artigos esportivos",
  "Brinquedos e jogos",
  "Pet shops e artigos para animais",
  "Farmácias e drogarias",
  "Supermercados",
  "Lojas em geral",
  "Shopping e centros comerciais",
  // Serviços automotivos
  "Oficinas",
  "Autoescolas",
  "Locação de veículos",
  "Comércio de peças",
  "Mecânicas",
  "Veículos",
  // Serviços de saúde
  "Clínicas médicas",
  "Dentistas e odontologia",
  "Laboratórios",
  "Farmácias",
  // Beleza, estética e bem-estar
  "Estética e beleza",
  "Salões de beleza",
  "Barbearias",
  "Academias e esportes",
  // Serviços profissionais e administrativos
  "Contabilidade",
  "Consultoria",
  "Serviços jurídicos",
  "Serviços administrativos",
  "Recursos humanos",
  "Emprego e vagas",
  // Serviços financeiros
  "Bancos",
  "Instituições financeiras",
  // Tecnologia e comunicação
  "Tecnologia da informação",
  "Informática",
  "Telecomunicações",
  "Serviços de impressão",
  // Manutenção, reparos e instalações
  "Manutenção e reparos",
  "Limpeza e conservação",
  "Segurança privada",
  "Chaveiros",
  "Instalação e manutenção",
  "Locação de bens",
  // Transporte, turismo e hospedagem
  "Transporte de cargas e passageiros",
  "Viagens e turismo",
  "Hospedagem",
  "Hotéis e pousadas",
  "Turismo",
  // Eventos, educação e cultura
  "Eventos e festas",
  "Educação e cultura",
  "Escolas e cursos",
  "Entretenimento e jogos",
  // Outros serviços
  "Serviços funerários",
  "Imóveis e imobiliárias",
  "Associações e entidades",
  "Agropecuária e serviços rurais",
  // Categorias Adicionais Incorporadas do AquiAchei
  "Vinícolas",
  "Hospedagens",
  "Onde Comer",
  "Onde Ir",
  "Onde Ficar",
  "Compras",
  "Serviços",
  "Automotivo",
  "Beleza e Estética",
  "Bebidas",
  "Casa e Construção",
  "Construção",
  "Educação",
  "Emprego",
  "Esporte e Lazer",
  "Farmácia",
  "Festas e Eventos",
  "Imóveis",
  "Informática",
  "Moda",
  "Pet Shop",
  "Saúde",
  "Supermercados",
  "Turismo",
  "Veículos",
];

async function seedCategorias() {
  let created = 0;
  let skipped = 0;

  for (const nome of categoriasParaCadastrar) {
    const slug = normalizarSlug(nome);

    // Verificar se já existe
    const existente = await db.query.categoria.findFirst({
      where: (c, { eq }) => eq(c.slug, slug),
    });

    if (existente) {
      console.log(`⏭️  Já existe: ${nome} (${slug})`);
      skipped++;
      continue;
    }

    await db.insert(categoria).values({
      nome,
      slug,
      ativa: true,
    });

    console.log(`✅ Criada: ${nome} (${slug})`);
    created++;
  }

  console.log(`\n📊 Resumo: ${created} criadas, ${skipped} puladas`);
}

seedCategorias()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  });
