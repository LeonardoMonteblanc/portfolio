// src/domain/errors/index.ts

export class ErroDominio extends Error {
  constructor(
    public readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroDominio";
    Object.setPrototypeOf(this, ErroDominio.prototype);
  }
}

export class ErroTransicaoInvalida extends ErroDominio {
  constructor(estado: string, evento: string) {
    super("TRANSICAO_INVALIDA", `Transição inválida: ${estado} + ${evento}`);
    this.name = "ErroTransicaoInvalida";
  }
}

export class AceiteObrigatorio extends ErroDominio {
  constructor() {
    super("ACEITE_OBRIGATORIO", "É obrigatório aceitar os termos para enviar");
    this.name = "AceiteObrigatorio";
  }
}

export class JustificativaObrigatoria extends ErroDominio {
  constructor() {
    super("JUSTIFICATIVA_OBRIGATORIA", "Justificativa é obrigatória");
    this.name = "JustificativaObrigatoria";
  }
}

export class DadosIncompletos extends ErroDominio {
  constructor(public readonly campos: string[]) {
    super(
      "DADOS_INCOMPLETOS",
      `Campos obrigatórios ausentes: ${campos.join(", ")}`,
    );
    this.name = "DadosIncompletos";
  }
}

export class AprovacaoAusente extends ErroDominio {
  constructor() {
    super(
      "APROVACAO_AUSENTE",
      "Negócio sem aprovação vigente não pode ser publicado",
    );
    this.name = "AprovacaoAusente";
  }
}

export class ContatoObrigatorio extends ErroDominio {
  constructor() {
    super("CONTATO_OBRIGATORIO", "Pelo menos 1 contato válido é obrigatório");
    this.name = "ContatoObrigatorio";
  }
}

export class CategoriaObrigatoria extends ErroDominio {
  constructor() {
    super(
      "CATEGORIA_OBRIGATORIA",
      "Pelo menos 1 categoria ativa é obrigatória",
    );
    this.name = "CategoriaObrigatoria";
  }
}

export class DecisaoImutavel extends ErroDominio {
  constructor() {
    super("DECISAO_IMUTAVEL", "Decisão de votação não pode ser recontestada");
    this.name = "DecisaoImutavel";
  }
}

export class ReaberturaNaoPermitida extends ErroDominio {
  constructor() {
    super(
      "REABERTURA_NAO_PERMITIDA",
      "Reabertura só é permitida com motivo_erro_admin",
    );
    this.name = "ReaberturaNaoPermitida";
  }
}

export class VotoDuplicado extends ErroDominio {
  constructor() {
    super("VOTO_DUPLICADO", "Admin já votou nesta votação");
    this.name = "VotoDuplicado";
  }
}

export class QuorumIncompleto extends ErroDominio {
  constructor() {
    super("QUORUM_INCOMPLETO", "Nem todos os admins ativos votaram");
    this.name = "QuorumIncompleto";
  }
}

export class FormatoInvalido extends ErroDominio {
  constructor(public readonly formato: string) {
    super("FORMATO_INVALIDO", `Formato não aceito: ${formato}`);
    this.name = "FormatoInvalido";
  }
}

export class LimiteExcedido extends ErroDominio {
  constructor(public readonly limite: string) {
    super("LIMITE_EXCEDIDO", `Limite excedido: ${limite}`);
    this.name = "LimiteExcedido";
  }
}

export class ArquivoMuitoGrande extends ErroDominio {
  constructor(public readonly tamanhoMb: number) {
    super("ARQUIVO_MUITO_GRANDE", `Arquivo excede ${tamanhoMb} MB`);
    this.name = "ArquivoMuitoGrande";
  }
}

export class MimeInvalido extends ErroDominio {
  constructor(public readonly mimeType: string) {
    super("MIME_INVALIDO", `Tipo MIME não aceito: ${mimeType}`);
    this.name = "MimeInvalido";
  }
}

export class LimiteAnexosExcedido extends ErroDominio {
  constructor() {
    super("LIMITE_ANEXOS_EXCEDIDO", "Máximo de 3 anexos por solicitação");
    this.name = "LimiteAnexosExcedido";
  }
}

export class TransicaoNaoPermitida extends ErroDominio {
  constructor(motivo: string) {
    super("TRANSICAO_NAO_PERMITIDA", motivo);
    this.name = "TransicaoNaoPermitida";
  }
}
