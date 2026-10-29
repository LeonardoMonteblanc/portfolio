// src/domain/enums/index.ts

export type TipoSolicitacao = "inclusao" | "atualizacao";

export type SituacaoSolicitacao =
  | "recebida"
  | "em_analise"
  | "aguardando_correcao"
  | "incompleta"
  | "em_fila_contestacao"
  | "cancelada_por_contestacao"
  | "aprovada"
  | "rejeitada"
  | "em_votacao"
  | "votacao_aprovada"
  | "votacao_rejeitada"
  | "votacao_sem_aprovacao";

export type SituacaoPublicacao =
  "nao_elegivel" | "nao_publicado" | "publicado" | "oculto_contestacao";

export type MotivoNaoElegivel =
  | "aprovacao_ausente"
  | "dados_incompletos"
  | "categoria_removida"
  | "contato_invalido";

export type TipoContato =
  "whatsapp" | "telefone" | "instagram" | "email" | "outro";

export type ResultadoDecisao = "aprovacao" | "rejeicao";

export type OrigemDecisao = "individual" | "votacao";

export type TipoForumPublicacao =
  "comentario" | "concordancia" | "discordancia";

export type SituacaoVotacao =
  "em_andamento" | "aprovada" | "rejeitada" | "sem_aprovacao";

export type EscolhaVoto = "aprovacao" | "rejeicao";

export type EstadoVoto = "ativo" | "inativo" | "substituido";

export type SituacaoCorrecao =
  "aguardando_resposta" | "recebida" | "incompleta";

export type TipoImagem = "logo" | "foto";

export type SituacaoImagem = "pendente" | "aprovada" | "rejeitada";

export type SituacaoAnexo =
  "recebido" | "em_verificacao" | "disponivel" | "rejeitado";

export type SituacaoSugestao = "pendente" | "aceita" | "rejeitada";

export type TipoDocumentoTermo =
  "termos_uso" | "politica_privacidade" | "tratamento_dados";

export type AtorTipo = "admin" | "solicitante" | "sistema" | "desenvolvedor";
