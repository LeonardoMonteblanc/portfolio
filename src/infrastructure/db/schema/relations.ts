// src/infrastructure/db/schema/relations.ts
import { relations } from "drizzle-orm";
import {
  negocio,
  contato,
  localizacao,
  horarioFuncionamento,
  categoria,
  negocioCategoria,
  solicitacao,
  solicitante,
  sugestaoCategoria,
  imagem,
  anexo,
  documentoTermo,
  aceiteTermo,
  forumPublicacao,
  contestacao,
  votacao,
  voto,
  administrador,
  logLogin,
  logLogout,
  logFalhaLogin,
  logRateLimit,
  logSolicitacaoRecebida,
  logSolicitacaoAnalisada,
  logSugestaoCategoria,
  logCategoria,
  logContestacao,
  logForum,
  logImagem,
  logAnexo,
  logNegocio,
  logComunicacao,
  logSuspensaoAdmin,
  logVinculacaoSolicitacao,
  logVotacao,
} from ".";

// Negocio relations
export const negocioRelations = relations(negocio, ({ many, one }) => ({
  contatos: many(contato),
  localizacao: one(localizacao),
  horarios: many(horarioFuncionamento),
  categorias: many(negocioCategoria),
  imagens: many(imagem),
  anexos: many(anexo),
  solicitacaoOrigem: one(solicitacao, {
    fields: [negocio.solicitacaoOrigemId],
    references: [solicitacao.id],
  }),
}));

// Contato relations
export const contatoRelations = relations(contato, ({ one }) => ({
  negocio: one(negocio, {
    fields: [contato.negocioId],
    references: [negocio.id],
  }),
}));

// Localizacao relations
export const localizacaoRelations = relations(localizacao, ({ one }) => ({
  negocio: one(negocio, {
    fields: [localizacao.negocioId],
    references: [negocio.id],
  }),
}));

// HorarioFuncionamento relations
export const horarioFuncionamentoRelations = relations(
  horarioFuncionamento,
  ({ one }) => ({
    negocio: one(negocio, {
      fields: [horarioFuncionamento.negocioId],
      references: [negocio.id],
    }),
  }),
);

// Categoria relations
export const categoriaRelations = relations(categoria, ({ many }) => ({
  negocios: many(negocioCategoria),
}));

// NegocioCategoria relations
export const negocioCategoriaRelations = relations(
  negocioCategoria,
  ({ one }) => ({
    negocio: one(negocio, {
      fields: [negocioCategoria.negocioId],
      references: [negocio.id],
    }),
    categoria: one(categoria, {
      fields: [negocioCategoria.categoriaId],
      references: [categoria.id],
    }),
  }),
);

// Solicitacao relations
export const solicitacaoRelations = relations(solicitacao, ({ one, many }) => ({
  solicitante: one(solicitante, {
    fields: [solicitacao.solicitanteId],
    references: [solicitante.id],
  }),
  categoriasSugeridas: many(sugestaoCategoria),
  imagens: many(imagem),
  anexos: many(anexo),
  negocioCriado: one(negocio, {
    fields: [solicitacao.id],
    references: [negocio.solicitacaoOrigemId],
  }),
}));

// Solicitante relations
export const solicitanteRelations = relations(solicitante, ({ many }) => ({
  solicitacoes: many(solicitacao),
}));

// SugestaoCategoria relations
export const sugestaoCategoriaRelations = relations(
  sugestaoCategoria,
  ({ one }) => ({
    solicitacao: one(solicitacao, {
      fields: [sugestaoCategoria.solicitacaoId],
      references: [solicitacao.id],
    }),
  }),
);

// Imagem relations
export const imagemRelations = relations(imagem, ({ one }) => ({
  negocio: one(negocio, {
    fields: [imagem.negocioId],
    references: [negocio.id],
  }),
  solicitacao: one(solicitacao, {
    fields: [imagem.solicitacaoId],
    references: [solicitacao.id],
  }),
  anexoOrigem: one(anexo, {
    fields: [imagem.anexoOrigemId],
    references: [anexo.id],
  }),
}));

// Anexo relations
export const anexoRelations = relations(anexo, ({ one, many }) => ({
  negocio: one(negocio, {
    fields: [anexo.negocioId],
    references: [negocio.id],
  }),
  solicitacao: one(solicitacao, {
    fields: [anexo.solicitacaoId],
    references: [solicitacao.id],
  }),
  imagens: many(imagem),
}));

// DocumentoTermo relations
export const documentoTermoRelations = relations(
  documentoTermo,
  ({ many }) => ({
    aceites: many(aceiteTermo),
  }),
);

// AceiteTermo relations
export const aceiteTermoRelations = relations(aceiteTermo, ({ one }) => ({
  documentoTermo: one(documentoTermo, {
    fields: [aceiteTermo.documentoTermoId],
    references: [documentoTermo.id],
  }),
  solicitante: one(solicitante, {
    fields: [aceiteTermo.solicitanteId],
    references: [solicitante.id],
  }),
}));

// ForumPublicacao relations
export const forumPublicacaoRelations = relations(
  forumPublicacao,
  ({ one, many }) => ({
    autor: one(administrador, {
      fields: [forumPublicacao.autorId],
      references: [administrador.id],
    }),
    votacao: one(votacao, {
      fields: [forumPublicacao.votacaoId],
      references: [votacao.id],
    }),
    contestacoes: many(contestacao),
  }),
);

// Contestacao relations
export const contestacaoRelations = relations(contestacao, ({ one }) => ({
  forumPublicacao: one(forumPublicacao, {
    fields: [contestacao.forumPublicacaoId],
    references: [forumPublicacao.id],
  }),
  autor: one(administrador, {
    fields: [contestacao.autorId],
    references: [administrador.id],
  }),
}));

// Votacao relations
export const votacaoRelations = relations(votacao, ({ one, many }) => ({
  forumPublicacao: one(forumPublicacao, {
    fields: [votacao.forumPublicacaoId],
    references: [forumPublicacao.id],
  }),
  votos: many(voto),
}));

// Voto relations
export const votoRelations = relations(voto, ({ one }) => ({
  votacao: one(votacao, {
    fields: [voto.votacaoId],
    references: [votacao.id],
  }),
  autor: one(administrador, {
    fields: [voto.autorId],
    references: [administrador.id],
  }),
}));

// Administrador relations
export const administradorRelations = relations(administrador, ({ many }) => ({
  forumPublicacoes: many(forumPublicacao),
  contestacoes: many(contestacao),
  votos: many(voto),
}));

// Log relations
export const logLoginRelations = relations(logLogin, ({ one }) => ({
  administrador: one(administrador, {
    fields: [logLogin.atorId],
    references: [administrador.id],
  }),
}));

export const logLogoutRelations = relations(logLogout, ({ one }) => ({
  administrador: one(administrador, {
    fields: [logLogout.atorId],
    references: [administrador.id],
  }),
}));

export const logFalhaLoginRelations = relations(logFalhaLogin, ({ one }) => ({
  administrador: one(administrador, {
    fields: [logFalhaLogin.atorId],
    references: [administrador.id],
  }),
}));

export const logRateLimitRelations = relations(logRateLimit, ({ one }) => ({
  administrador: one(administrador, {
    fields: [logRateLimit.atorId],
    references: [administrador.id],
  }),
}));

export const logSolicitacaoRecebidaRelations = relations(
  logSolicitacaoRecebida,
  ({ one }) => ({
    solicitacao: one(solicitacao, {
      fields: [logSolicitacaoRecebida.solicitacaoId],
      references: [solicitacao.id],
    }),
  }),
);

export const logSolicitacaoAnalisadaRelations = relations(
  logSolicitacaoAnalisada,
  ({ one }) => ({
    solicitacao: one(solicitacao, {
      fields: [logSolicitacaoAnalisada.solicitacaoId],
      references: [solicitacao.id],
    }),
  }),
);

export const logSugestaoCategoriaRelations = relations(
  logSugestaoCategoria,
  ({ one }) => ({
    sugestaoCategoria: one(sugestaoCategoria, {
      fields: [logSugestaoCategoria.sugestaoCategoriaId],
      references: [sugestaoCategoria.id],
    }),
  }),
);

export const logCategoriaRelations = relations(logCategoria, ({ one }) => ({
  categoria: one(categoria, {
    fields: [logCategoria.categoriaId],
    references: [categoria.id],
  }),
}));

export const logContestacaoRelations = relations(logContestacao, ({ one }) => ({
  contestacao: one(contestacao, {
    fields: [logContestacao.contestacaoId],
    references: [contestacao.id],
  }),
}));

export const logForumRelations = relations(logForum, ({ one }) => ({
  forumPublicacao: one(forumPublicacao, {
    fields: [logForum.forumPublicacaoId],
    references: [forumPublicacao.id],
  }),
}));

export const logImagemRelations = relations(logImagem, ({ one }) => ({
  imagem: one(imagem, {
    fields: [logImagem.imagemId],
    references: [imagem.id],
  }),
}));

export const logAnexoRelations = relations(logAnexo, ({ one }) => ({
  anexo: one(anexo, {
    fields: [logAnexo.anexoId],
    references: [anexo.id],
  }),
}));

export const logNegocioRelations = relations(logNegocio, ({ one }) => ({
  negocio: one(negocio, {
    fields: [logNegocio.negocioId],
    references: [negocio.id],
  }),
}));

export const logComunicacaoRelations = relations(logComunicacao, ({ one }) => ({
  administrador: one(administrador, {
    fields: [logComunicacao.atorId],
    references: [administrador.id],
  }),
}));

export const logSuspensaoAdminRelations = relations(
  logSuspensaoAdmin,
  ({ one }) => ({
    administrador: one(administrador, {
      fields: [logSuspensaoAdmin.administradorId],
      references: [administrador.id],
    }),
  }),
);

export const logVinculacaoSolicitacaoRelations = relations(
  logVinculacaoSolicitacao,
  ({ one }) => ({
    solicitacao: one(solicitacao, {
      fields: [logVinculacaoSolicitacao.solicitacaoId],
      references: [solicitacao.id],
    }),
  }),
);

export const logVotacaoRelations = relations(logVotacao, ({ one }) => ({
  votacao: one(votacao, {
    fields: [logVotacao.votacaoId],
    references: [votacao.id],
  }),
}));

// Export all relations
export const allRelations = {
  negocio: negocioRelations,
  contato: contatoRelations,
  localizacao: localizacaoRelations,
  horarioFuncionamento: horarioFuncionamentoRelations,
  categoria: categoriaRelations,
  negocioCategoria: negocioCategoriaRelations,
  solicitacao: solicitacaoRelations,
  solicitante: solicitanteRelations,
  sugestaoCategoria: sugestaoCategoriaRelations,
  imagem: imagemRelations,
  anexo: anexoRelations,
  documentoTermo: documentoTermoRelations,
  aceiteTermo: aceiteTermoRelations,
  forumPublicacao: forumPublicacaoRelations,
  contestacao: contestacaoRelations,
  votacao: votacaoRelations,
  voto: votoRelations,
  administrador: administradorRelations,
  logLogin: logLoginRelations,
  logLogout: logLogoutRelations,
  logFalhaLogin: logFalhaLoginRelations,
  logRateLimit: logRateLimitRelations,
  logSolicitacaoRecebida: logSolicitacaoRecebidaRelations,
  logSolicitacaoAnalisada: logSolicitacaoAnalisadaRelations,
  logSugestaoCategoria: logSugestaoCategoriaRelations,
  logCategoria: logCategoriaRelations,
  logContestacao: logContestacaoRelations,
  logForum: logForumRelations,
  logImagem: logImagemRelations,
  logAnexo: logAnexoRelations,
  logNegocio: logNegocioRelations,
  logComunicacao: logComunicacaoRelations,
  logSuspensaoAdmin: logSuspensaoAdminRelations,
  logVinculacaoSolicitacao: logVinculacaoSolicitacaoRelations,
  logVotacao: logVotacaoRelations,
};
