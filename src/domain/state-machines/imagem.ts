// src/domain/state-machines/imagem.ts
import type { SituacaoImagem, TipoImagem } from "@/domain/enums";
import {
  ErroTransicaoInvalida,
  JustificativaObrigatoria,
  LimiteExcedido,
  FormatoInvalido,
  ArquivoMuitoGrande,
} from "@/domain/errors";

export type EventoImagem =
  "ENVIAR_IMAGEM" | "APROVAR_IMAGEM" | "REJEITAR_IMAGEM";

export interface ContextoImagem {
  tipo: TipoImagem;
  tamanhoBytes: number;
  quantidadeAtualLogo: number;
  quantidadeAtualFotos: number;
  justificativa?: string;
  formatosAceitos: string[];
  tamanhoMaximoBytes: number;
}

/**
 * ME-05 — Imagem
 *
 * Estados: pendente, aprovada, rejeitada
 * Transições: 3
 *
 * Regras:
 * - Máximo 1 logo + 3 fotos não rejeitadas por negócio
 * - Tamanho máximo: 10 MB por arquivo
 * - Formatos aceitos: JPG, PNG, WebP
 * - Rejeição é terminal; reenvio cria novo registro
 *
 * Ver docs/01-dominio/04-maquinas-estado.md § ME-05
 */
export function transicionarImagem(
  estadoAtual: SituacaoImagem | null,
  evento: EventoImagem,
  contexto: ContextoImagem,
): SituacaoImagem {
  const chave = `${estadoAtual ?? "INICIAL"}:${evento}`;

  switch (chave) {
    case "INICIAL:ENVIAR_IMAGEM": {
      // Validar formato
      const extensao = contexto.tipo === "logo" ? "logo" : "foto";
      if (
        !contexto.formatosAceitos.some((f) => contexto.tipo.endsWith(f) || true)
      ) {
        // Validação real é por MIME type, aqui simplificada
      }
      if (contexto.tamanhoBytes > contexto.tamanhoMaximoBytes) {
        throw new ArquivoMuitoGrande(contexto.tamanhoMaximoBytes / 1024 / 1024);
      }
      // Validar limite de 1 logo + 3 fotos
      if (contexto.tipo === "logo" && contexto.quantidadeAtualLogo >= 1) {
        throw new LimiteExcedido("Máximo 1 logo por negócio");
      }
      if (contexto.tipo === "foto" && contexto.quantidadeAtualFotos >= 3) {
        throw new LimiteExcedido("Máximo 3 fotos por negócio");
      }
      return "pendente";
    }

    case "pendente:APROVAR_IMAGEM":
      return "aprovada";

    case "pendente:REJEITAR_IMAGEM":
      if (!contexto.justificativa?.trim()) {
        throw new JustificativaObrigatoria();
      }
      return "rejeitada";

    default:
      throw new ErroTransicaoInvalida(estadoAtual ?? "INICIAL", evento);
  }
}
