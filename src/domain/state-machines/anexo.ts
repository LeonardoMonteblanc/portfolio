// src/domain/state-machines/anexo.ts
import type { SituacaoAnexo } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  MimeInvalido,
  ArquivoMuitoGrande,
  LimiteAnexosExcedido,
} from "@/domain/errors";

export type EventoAnexo =
  | "ENVIAR_ANEXO"
  | "INICIAR_VERIFICACAO"
  | "DISPONIBILIZAR"
  | "REJEITAR"
  | "PROMOVER_A_IMAGEM";

export interface ContextoAnexo {
  mimeType: string;
  tamanhoBytes: number;
  quantidadeAtual: number;
  formatosAceitos: string[];
  tamanhoMaximoBytes: number;
  maxAnexos: number;
}

/**
 * ME-06 — Anexo
 *
 * Estados: recebido, em_verificacao, disponivel, rejeitado
 * Transições: 5
 *
 * Regras:
 * - Máximo 3 anexos por solicitação
 * - Tamanho máximo: 10 MB por arquivo
 * - Formatos aceitos: JPG, PNG, WebP, PDF
 * - Promoção a imagem NÃO altera estado do anexo
 * - Sem antivírus no MVP (validação de MIME real)
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-06
 */
export function transicionarAnexo(
  estadoAtual: SituacaoAnexo | null,
  evento: EventoAnexo,
  contexto: ContextoAnexo,
): SituacaoAnexo {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:ENVIAR_ANEXO": {
      if (!contexto.formatosAceitos.includes(contexto.mimeType)) {
        throw new MimeInvalido(contexto.mimeType);
      }
      if (contexto.tamanhoBytes > contexto.tamanhoMaximoBytes) {
        throw new ArquivoMuitoGrande(contexto.tamanhoMaximoBytes / 1024 / 1024);
      }
      if (contexto.quantidadeAtual >= contexto.maxAnexos) {
        throw new LimiteAnexosExcedido();
      }
      return "recebido";
    }

    case "recebido:INICIAR_VERIFICACAO":
      return "em_verificacao";

    case "em_verificacao:DISPONIBILIZAR":
      return "disponivel";

    case "em_verificacao:REJEITAR":
      return "rejeitado";

    case "disponivel:PROMOVER_A_IMAGEM":
      // Promoção não altera estado do anexo (retorna disponivel novamente)
      return "disponivel";

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}
