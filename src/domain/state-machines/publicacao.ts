// src/domain/state-machines/publicacao.ts
import type { SituacaoPublicacao, MotivoNaoElegivel } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  AprovacaoAusente,
  ContatoObrigatorio,
  CategoriaObrigatoria,
  DadosIncompletos,
} from "@/domain/errors";

export type EventoPublicacao =
  | "CRIAR_NEGOCIO"
  | "TORNAR_ELEGIVEL"
  | "PUBLICAR"
  | "DESPUBLICAR"
  | "OCULTAR_POR_CONTESTACAO"
  | "VOTACAO_APROVADA"
  | "VOTACAO_NAO_APROVADA"
  | "INVALIDAR";

export interface ContextoPublicacao {
  temAprovacaoVigente: boolean;
  temContatoValido: boolean;
  temCategoriaAtiva: boolean;
  temNome: boolean;
  temDescricao: boolean;
  motivoInvalidez?: MotivoNaoElegivel;
}

/**
 * ME-02 — Publicação do negócio
 *
 * Estados: nao_elegivel, nao_publicado, publicado, oculto_contestacao
 * Transições: 9
 *
 * Guarda de elegibilidade (TORNAR_ELEGIVEL e PUBLICAR):
 * - temAprovacaoVigente && temContatoValido && temCategoriaAtiva && temNome && temDescricao
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-02
 */
export function transicionarPublicacao(
  estadoAtual: SituacaoPublicacao | null,
  evento: EventoPublicacao,
  contexto: ContextoPublicacao,
): SituacaoPublicacao {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:CRIAR_NEGOCIO":
      return "nao_elegivel";

    case "nao_elegivel:TORNAR_ELEGIVEL": {
      if (!validarElegibilidade(contexto)) {
        throw new ErroTransicaoInvalida(
          "nao_elegivel",
          "TORNAR_ELEGIVEL (guarda de elegibilidade falhou)",
        );
      }
      return "nao_publicado";
    }

    case "nao_publicado:PUBLICAR": {
      if (!validarElegibilidade(contexto)) {
        throw new ErroTransicaoInvalida(
          "nao_publicado",
          "PUBLICAR (guarda de elegibilidade falhou)",
        );
      }
      return "publicado";
    }

    case "publicado:DESPUBLICAR":
      return "nao_publicado";

    case "publicado:OCULTAR_POR_CONTESTACAO":
      return "oculto_contestacao";

    case "oculto_contestacao:VOTACAO_APROVADA":
      return "publicado";

    case "oculto_contestacao:VOTACAO_NAO_APROVADA":
      return "nao_publicado";

    case "publicado:INVALIDAR": {
      if (!contexto.motivoInvalidez) {
        throw new ErroTransicaoInvalida("publicado", "INVALIDAR (sem motivo)");
      }
      return "nao_elegivel";
    }

    case "nao_publicado:INVALIDAR": {
      if (!contexto.motivoInvalidez) {
        throw new ErroTransicaoInvalida(
          "nao_publicado",
          "INVALIDAR (sem motivo)",
        );
      }
      return "nao_elegivel";
    }

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}

/**
 * Valida se o negócio atende aos critérios de elegibilidade para publicação
 * RN26: Publicação exige nome, descrição, contato, categoria
 * RN27: Endereço físico não é obrigatório universalmente
 */
export function validarElegibilidade(contexto: ContextoPublicacao): boolean {
  return (
    contexto.temAprovacaoVigente &&
    contexto.temContatoValido &&
    contexto.temCategoriaAtiva &&
    contexto.temNome &&
    contexto.temDescricao
  );
}

/**
 * Retorna lista de motivos pelos quais o negócio não é elegível
 */
export function obterMotivosInelegibilidade(
  contexto: ContextoPublicacao,
): MotivoNaoElegivel[] {
  const motivos: MotivoNaoElegivel[] = [];

  if (!contexto.temAprovacaoVigente) motivos.push("aprovacao_ausente");
  if (!contexto.temContatoValido) motivos.push("contato_invalido");
  if (!contexto.temCategoriaAtiva) motivos.push("categoria_removida");
  if (!contexto.temNome || !contexto.temDescricao)
    motivos.push("dados_incompletos");

  return motivos;
}

/**
 * Lança erro específico baseado no primeiro motivo de inelegibilidade encontrado
 */
export function lancarErroInelegibilidade(contexto: ContextoPublicacao): never {
  if (!contexto.temAprovacaoVigente) throw new AprovacaoAusente();
  if (!contexto.temContatoValido) throw new ContatoObrigatorio();
  if (!contexto.temCategoriaAtiva) throw new CategoriaObrigatoria();
  if (!contexto.temNome || !contexto.temDescricao)
    throw new DadosIncompletos([
      ...(!contexto.temNome ? ["nome"] : []),
      ...(!contexto.temDescricao ? ["descricao"] : []),
    ]);
  throw new ErroTransicaoInvalida(
    "nao_elegivel",
    "Negócio não elegível por motivo desconhecido",
  );
}
