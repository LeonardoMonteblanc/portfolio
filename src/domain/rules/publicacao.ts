// src/domain/rules/publicacao.ts
// RN26–RN34: Publicação, correção e atualização

import { ErroDominio } from "@/domain/errors";

type ValidacaoOk = { ok: true };
type ValidacaoErro = { ok: false; erros: ErroDominio[] };
export type ResultadoValidacao = ValidacaoOk | ValidacaoErro;

/**
 * RN26: Publicação exige nome, descrição, contato, categoria
 * RN27: Endereço físico não é obrigatório universalmente
 * RN28: CNPJ não é obrigatório universalmente
 */
export function validarElegibilidadePublicacao(dados: {
  temAprovacaoVigente: boolean;
  nome: string;
  descricao: string;
  contatosValidos: number;
  categoriasAtivas: number;
  temEndereco?: boolean;
  temCnpj?: boolean;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.temAprovacaoVigente) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "APROVACAO_AUSENTE",
            "Negócio sem aprovação vigente não pode ser publicado",
          );
        }
      })(),
    );
  }
  if (!dados.nome?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Nome é obrigatório");
        }
      })(),
    );
  }
  if (!dados.descricao?.trim()) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("CAMPO_OBRIGATORIO", "Descrição é obrigatória");
        }
      })(),
    );
  }
  if (dados.contatosValidos < 1) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "CONTATO_OBRIGATORIO",
            "Pelo menos 1 contato válido é obrigatório",
          );
        }
      })(),
    );
  }
  if (dados.categoriasAtivas < 1) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "CATEGORIA_OBRIGATORIA",
            "Pelo menos 1 categoria ativa é obrigatória",
          );
        }
      })(),
    );
  }
  // RN27: Endereço físico NÃO é obrigatório
  // RN28: CNPJ NÃO é obrigatório

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN29: Dados incorretos/incompletos corrigidos antes de publicar
 * RN30: Admin contata anunciante para correção
 * RN31: Prazo de 7 dias corridos
 */
export function validarCorrecaoDados(dados: {
  camposSolicitados: string[];
  prazoDias: number;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.camposSolicitados?.length) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "CAMPOS_OBRIGATORIOS",
            "Campos a corrigir devem ser especificados",
          );
        }
      })(),
    );
  }
  if (dados.prazoDias <= 0) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super("PRAZO_INVALIDO", "Prazo deve ser maior que zero");
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}

/**
 * RN32: Sem resposta no prazo → incompleta, sem exclusão
 */
export function processarExpiracaoCorrecao(respostaRecebida: boolean): {
  incompleta: boolean;
  excluir: false;
} {
  return {
    incompleta: !respostaRecebida,
    excluir: false, // RN32: NÃO exclui nem rejeita automaticamente
  };
}

/**
 * RN33: Atualização aprovada substitui imediatamente
 * RN34: Atualização não cria segundo cadastro
 */
export function validarAtualizacaoAprovada(dados: {
  solicitacaoVinculada: boolean;
  dadosValidados: boolean;
}): ResultadoValidacao {
  const erros: ErroDominio[] = [];

  if (!dados.solicitacaoVinculada) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "VINCULACAO_NECESSARIA",
            "Solicitação deve estar vinculada a um negócio",
          );
        }
      })(),
    );
  }
  if (!dados.dadosValidados) {
    erros.push(
      new (class extends ErroDominio {
        constructor() {
          super(
            "DADOS_NAO_VALIDADOS",
            "Dados devem ser validados antes de aplicar atualização",
          );
        }
      })(),
    );
  }

  return erros.length === 0 ? { ok: true } : { ok: false, erros };
}
