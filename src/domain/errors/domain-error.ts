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

// Erros adicionais que aparecerão nas máquinas de estado (MEs).
// Mantenha o padrão: código em SNAKE_UPPER_CASE e mensagem em português.

export class DadosIncompletos extends ErroDominio {
  constructor(campo: string) {
    super("DADOS_INCOMPLETOS", `Dados incompletos: ${campo}`);
    this.name = "DadosIncompletos";
  }
}

export class TransicaoNaoPermitida extends ErroDominio {
  constructor(motivo: string) {
    super("TRANSICAO_NAO_PERMITIDA", motivo);
    this.name = "TransicaoNaoPermitida";
  }
}
