// src/domain/rules/categorias.ts
// RN35–RN38: Categorias

import { ErroDominio } from "@/domain/errors";

type ValidacaoOk = { ok: true };
type ValidacaoErro = { ok: false; erros: ErroDominio[] };
export type ResultadoValidacao = ValidacaoOk | ValidacaoErro;

/**
 * RN35: Só admin cria/gerencia categorias
 * RN36: Negócio pode ter várias categorias
 */
export function validarCriacaoCategoria(dados: {
  adminId: string;
  nome: string;
  descricao?: string;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.adminId) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "ADMIN_OBRIGATORIO",
            "Apenas administradores podem criar categorias",
          );
        }
      })(),
    );
  }
  if (!dados.nome?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Nome da categoria é obrigatório");
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN35: Desativação bloqueada se houver negócios associados
 * Exige mesclagem prévia com outra categoria
 */
export function validarDesativacaoCategoria(
  negociosAssociados: number,
): ResultadoValidacao {
  if (negociosAssociados > 0) {
    return {
      ok: false,
      erros: [
        new (class extends ErroDominio {
          constructor() {
            super(
              "CATEGORIA_EM_USO",
              `Categoria em uso por ${negociosAssociados} negócios. Mescle antes de desativar.`,
            );
          }
        })(),
      ],
    };
  }
  return { ok: true };
}

/**
 * RN37: Formulário permite "Outros"
 * RN38: Sugestões não viram oficiais automaticamente
 */
export function validarSugestaoCategoria(dados: {
  textoSugerido: string;
  solicitacaoId: string;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.textoSugerido?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Texto da sugestão é obrigatório");
        }
      })(),
    );
  }
  if (!dados.solicitacaoId) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "SOLICITACAO_OBRIGATORIA",
            "Sugestão deve estar vinculada a uma solicitação",
          );
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN38: Triagem individual - aceitar cria categoria, rejeitar registra justificativa interna
 */
export function validarTriagemSugestao(dados: {
  acao: "aceitar" | "rejeitar";
  justificativaInterna?: string;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (dados.acao === "rejeitar" && !dados.justificativaInterna?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "JUSTIFICATIVA_OBRIGATORIA",
            "Justificativa interna é obrigatória ao rejeitar",
          );
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN35: Mesclar categorias - negócios migrados, origem desativada (não excluída)
 */
export function validarMesclagemCategorias(dados: {
  categoriaOrigemId: string;
  categoriaDestinoId: string;
  negociosMigrados: number;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (dados.categoriaOrigemId === dados.categoriaDestinoId) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CATEGORIAS_IGUAIS", "Origem e destino devem ser diferentes");
        }
      })(),
    );
  }
  if (dados.negociosMigrados < 0) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("VALOR_INVALIDO", "Número de negócios migrados inválido");
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}
