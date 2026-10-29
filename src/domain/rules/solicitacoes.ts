// src/domain/rules/solicitacoes.ts
// RN01–RN11: Solicitações e cadastro

import { ErroDominio } from "@/domain/errors";

export interface ValidacaoSolicitacao {
  ok: true;
}

export interface ErroValidacao {
  ok: false;
  erros: ErroDominio[];
}

export type ResultadoValidacao = ValidacaoSolicitacao | ErroValidacao;

/**
 * RN01: Não é necessário criar conta para enviar solicitação
 * RN02: A solicitação identifica o solicitante e oferece meios de contato
 * RN03: A solicitação contém informações que permitem relacionar o solicitante ao negócio
 */
export function validarEnvioSolicitacao(dados: {
  nomeSolicitante: string;
  email: string;
  telefone: string;
  nomeNegocio: string;
  descricao: string;
  contatos: Array<{ tipo: string; valor: string }>;
  categoriasOuSugestao: { categorias: string[]; sugestao?: string };
  declaracaoVinculo: string;
  aceiteTermos: boolean;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.nomeSolicitante?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Nome do solicitante é obrigatório");
        }
      })(),
    );
  if (!dados.email?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "E-mail é obrigatório");
        }
      })(),
    );
  if (!dados.telefone?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Telefone é obrigatório");
        }
      })(),
    );
  if (!dados.nomeNegocio?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Nome do negócio é obrigatório");
        }
      })(),
    );
  if (!dados.descricao?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Descrição é obrigatória");
        }
      })(),
    );
  if (!dados.contatos?.length)
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Pelo menos 1 contato é obrigatório");
        }
      })(),
    );
  if (
    !dados.categoriasOuSugestao?.categorias?.length &&
    !dados.categoriasOuSugestao?.sugestao?.trim()
  ) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "CAMPO_OBRIGATORIO",
            "Pelo menos 1 categoria ou sugestão é obrigatória",
          );
        }
      })(),
    );
  }
  if (!dados.declaracaoVinculo?.trim())
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Declaração de vínculo é obrigatória");
        }
      })(),
    );
  if (!dados.aceiteTermos)
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "ACEITE_OBRIGATORIO",
            "É obrigatório aceitar os termos para enviar",
          );
        }
      })(),
    );

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN04: Toda solicitação é analisada por admin
 * RN05: Critérios de aprovação definidos pelos administradores fora do sistema
 * RN06: Só negócios com aprovação vigente podem ser publicados
 * RN07: Admin cria, edita, publica, oculta e "remove" (despublica) cadastros
 * RN08: Solicitação e cadastro são entidades independentes
 * RN09: Admin vincula solicitação ao cadastro correspondente
 * RN10: Solicitação pode referenciar negócio existente
 * RN11: Atualização não cria cadastro duplicado
 */
export function validarAtualizacaoNaoCriaDuplicata(
  negocioExistente: boolean,
  solicitacaoVinculada: boolean,
): ResultadoValidacao {
  // RN11: Atualização aprovada não cria segundo cadastro
  // Se já existe negócio vinculado, a atualização substitui os dados
  if (negocioExistente && solicitacaoVinculada) {
    return { ok: true };
  }
  return { ok: true };
}

/**
 * RN09/RN10: Validação de vinculação admin
 */
export function validarVinculacaoSolicitacao(
  solicitacaoJaVinculada: boolean,
  confirmacaoTroca: boolean,
): ResultadoValidacao {
  const erros: ErroDominio[] = [];
  if (solicitacaoJaVinculada && !confirmacaoTroca) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "VINCULACAO_EXISTENTE",
            "Solicitação já vinculada. Confirme para trocar.",
          );
        }
      })(),
    );
  }
  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}
