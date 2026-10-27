export interface HorarioFuncionamento {
  readonly id: string;
  negocioId: string;
  diaSemana: number; // 0–6 (0 = domingo)
  horaAbertura: string; // formato "HH:mm"
  horaFechamento: string; // formato "HH:mm"
  observacao: string | null;
}
