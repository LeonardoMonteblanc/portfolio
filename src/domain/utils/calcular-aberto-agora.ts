export function calcularAbertoAgora(
  horarios: Array<{
    diaSemana: number;
    horaAbertura: string; // "08:00"
    horaFechamento: string; // "18:00"
  }>,
  agora: Date,
  timezone = "America/Sao_Paulo",
): "aberto" | "fechado" {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const partes = fmt.formatToParts(agora);

  // Correção 1: remove o ponto final (ex: "seg." -> "seg")
  const diaStr = partes
    .find((p) => p.type === "weekday")!
    .value.replace(".", "");
  const mapa: Record<string, number> = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6,
  };

  const diaSemana = mapa[diaStr] ?? -1;
  const hora = partes.find((p) => p.type === "hour")!.value;
  const minuto = partes.find((p) => p.type === "minute")!.value;
  const horaAtual = `${hora}:${minuto}`;

  return horarios.some((h) => {
    if (h.diaSemana !== diaSemana) return false;

    // Correção 2: Suporte para horários que cruzam a meia-noite
    if (h.horaAbertura <= h.horaFechamento) {
      return horaAtual >= h.horaAbertura && horaAtual < h.horaFechamento;
    } else {
      // Ex: 22:00 às 02:00
      return horaAtual >= h.horaAbertura || horaAtual < h.horaFechamento;
    }
  })
    ? "aberto"
    : "fechado";
}
