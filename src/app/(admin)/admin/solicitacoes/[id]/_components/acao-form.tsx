"use client";

import { useActionState } from "react";
import { Button } from "@/ui/components/button";
import { Label } from "@/ui/components/label";
import { NativeSelect } from "@/ui/components/native-select";
import { Textarea } from "@/ui/components/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { analisarSolicitacaoAction } from "@/application/solicitacoes/analise";

const DECISAO_OPTIONS = [
  { value: "aprovar", label: "Aprovar" },
  { value: "reprovar", label: "Reprovar" },
  { value: "solicitar_correcao", label: "Solicitar Correção" },
] as const;

interface AcaoFormProps {
  solicitacaoId: string;
  situacao: string;
}

interface AcaoState {
  success: boolean;
  error: string | null | undefined;
  situacao?: string;
  negocioId?: string;
}

// Wrapper action para useActionState (espera (state, formData) => Promise<result>)
async function analisarSolicitacaoActionWrapper(
  prevState: AcaoState,
  formData: FormData,
): Promise<AcaoState> {
  const result = await analisarSolicitacaoAction(null, formData);
  if ("error" in result) {
    return { success: false, error: result.error };
  }
  return {
    success: true,
    error: null,
    situacao: result.situacao,
    negocioId: result.negocioId,
  };
}

export function AcaoForm({ solicitacaoId, situacao }: AcaoFormProps) {
  const [state, formAction, isPending] = useActionState(
    analisarSolicitacaoActionWrapper,
    { success: false, error: null },
  );

  const canAct = situacao === "recebida" || situacao === "em_fila_contestacao";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="solicitacaoId" value={solicitacaoId} />

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Sucesso</AlertTitle>
          <AlertDescription>
            <div>
              Solicitação {state.situacao} com sucesso!
              {state.negocioId && (
                <>
                  <br />
                  Negócio criado: {state.negocioId}
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="decisao">Decisão</Label>
        <NativeSelect
          name="decisao"
          id="decisao"
          required
          disabled={!canAct || isPending}
        >
          <option value="">Selecione uma ação</option>
          {canAct ? (
            DECISAO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          ) : (
            <option value="" disabled>
              Já analisada
            </option>
          )}
        </NativeSelect>
      </div>

      <div className="space-y-2">
        <Label htmlFor="justificativa">
          Justificativa (obrigatória para reprovar/solicitar correção)
        </Label>
        <Textarea
          name="justificativa"
          id="justificativa"
          rows={3}
          placeholder="Explique o motivo da decisão..."
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoesInternas">
          Observações Internas (opcional)
        </Label>
        <Textarea
          name="observacoesInternas"
          id="observacoesInternas"
          rows={2}
          placeholder="Notas internas para a equipe..."
          disabled={isPending}
        />
      </div>

      <Button type="submit" disabled={!canAct || isPending}>
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          "Executar Ação"
        )}
      </Button>
    </form>
  );
}
