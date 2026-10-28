// src/app/(admin)/solicitacoes/[id]/page.tsx
import {
  buscarSolicitacaoPorIdAction,
  analisarSolicitacaoAction,
} from "@/application/solicitacoes";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Textarea } from "@/ui/components/textarea";
import { Label } from "@/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Badge } from "@/ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert";
import {
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

interface DadosNegocioProposto {
  nome?: string;
  descricao?: string;
  contatos?: Array<{ tipo: string; valor: string; ordem?: number }>;
  localizacao?: {
    endereco?: string;
    bairro?: string;
    areaAtendimento?: string;
  };
  horarios?: Array<{
    diaSemana: number;
    horaAbertura: string;
    horaFechamento: string;
    observacao?: string;
  }>;
  categoriasIds?: string[];
  sugestaoCategoria?: string;
}

const SITUACAO_LABELS: Record<string, string> = {
  recebida: "Recebida",
  em_fila_contestacao: "Em fila contestação",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
  incompleta: "Incompleta",
};

const TIPO_LABELS: Record<string, string> = {
  inclusao: "Inclusão",
  atualizacao: "Atualização",
};

function SituacaoBadge({ situacao }: { situacao: string }) {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    recebida: "default",
    em_fila_contestacao: "secondary",
    aprovada: "default",
    reprovada: "destructive",
    incompleta: "outline",
  };
  return (
    <Badge variant={variants[situacao] || "default"}>
      {SITUACAO_LABELS[situacao] || situacao}
    </Badge>
  );
}

export default async function SolicitacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const formData = new FormData();
  formData.append("id", id);
  const result = await buscarSolicitacaoPorIdAction(null, formData);

  if ("error" in result) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
        <Link
          href="/admin/solicitacoes"
          className="text-blue-600 hover:underline mt-4 inline-block"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const sol = result.solicitacao as any;
  const dados = sol.dadosNegocioProposto as DadosNegocioProposto;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/solicitacoes"
            className="text-blue-600 hover:underline text-sm mb-2 inline-block"
          >
            ← Voltar às solicitações
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {dados.nome || "Solicitação sem nome"}
          </h1>
          <p className="text-gray-600">
            {TIPO_LABELS[sol.tipo] || sol.tipo} •{" "}
            {SITUACAO_LABELS[sol.situacao] || sol.situacao}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SituacaoBadge situacao={sol.situacao} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Negócio</CardTitle>
              <CardDescription>
                Informações propostas na solicitação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <p className="text-lg font-medium">
                  {dados.nome || "Não informado"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <p className="whitespace-pre-wrap">
                  {dados.descricao || "Não informada"}
                </p>
              </div>

              {(dados.contatos as any[])?.length > 0 && (
                <div className="space-y-2">
                  <Label>Contatos</Label>
                  <div className="space-y-1">
                    {(dados.contatos as any[]).map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-medium capitalize">
                          {c.tipo}:
                        </span>
                        <span>{c.valor}</span>
                        {c.ordem !== undefined && (
                          <span className="text-gray-400">
                            (ordem: {c.ordem})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dados.localizacao && (
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <div className="space-y-1 text-sm">
                    {dados.localizacao.endereco && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{dados.localizacao.endereco}</span>
                      </div>
                    )}
                    {dados.localizacao.bairro && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Bairro: {dados.localizacao.bairro}</span>
                      </div>
                    )}
                    {dados.localizacao.areaAtendimento && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Área: {dados.localizacao.areaAtendimento}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(dados.horarios as any[])?.length > 0 && (
                <div className="space-y-2">
                  <Label>Horários de Funcionamento</Label>
                  <div className="space-y-1 text-sm">
                    {(dados.horarios as any[]).map((h: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-medium capitalize">
                          Dia {h.diaSemana}:
                        </span>
                        <span>
                          {h.horaAbertura} - {h.horaFechamento}
                        </span>
                        {h.observacao && (
                          <span className="text-gray-500">
                            ({h.observacao})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(dados.categoriasIds as string[])?.length > 0 && (
                <div className="space-y-2">
                  <Label>Categorias Selecionadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {(dados.categoriasIds as string[]).map(
                      (catId: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {catId}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              )}

              {dados.sugestaoCategoria && (
                <div className="space-y-2">
                  <Label>Sugestão de Nova Categoria</Label>
                  <p className="text-sm text-blue-600">
                    {dados.sugestaoCategoria}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solicitante</CardTitle>
              <CardDescription>
                Informações de quem fez a solicitação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <p className="text-lg font-medium">
                  {sol.solicitante?.nome || "Não informado"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{sol.solicitante?.email || "Não informado"}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{sol.solicitante?.telefone || "Não informado"}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Declaração de Vínculo</Label>
                <p className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {sol.declaracaoVinculo}
                </p>
              </div>
            </CardContent>
          </Card>

          {sol.sugestaoCategoria && sol.sugestaoCategoria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sugestão de Categoria</CardTitle>
                <CardDescription>
                  Sugestão enviada pelo solicitante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sol.sugestaoCategoria.map((sug: any, i: number) => (
                  <div key={i} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{sug.textoSugerido}</p>
                      <SituacaoBadge situacao={sug.situacao} />
                    </div>
                    {sug.categoriaCriadaId && (
                      <p className="text-sm text-green-600 mt-1">
                        Categoria criada: {sug.categoriaCriadaId}
                      </p>
                    )}
                    {sug.justificativaInterna && (
                      <p className="text-sm text-gray-600 mt-1">
                        Justificativa: {sug.justificativaInterna}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {sol.motivoIncompleta && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                Solicitação incompleta
              </AlertTitle>
              <AlertDescription>{sol.motivoIncompleta}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ação</CardTitle>
              <CardDescription>
                Analisar e decidir sobre a solicitação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const result = await analisarSolicitacaoAction(
                    null,
                    formData,
                  );
                  if (!("error" in result)) {
                    revalidatePath("/admin/solicitacoes");
                    revalidatePath(`/admin/solicitacoes/${id}`);
                  }
                }}
              >
                <input type="hidden" name="solicitacaoId" value={sol.id} />

                <div className="space-y-2">
                  <Label htmlFor="decisao">Decisão</Label>
                  <Select name="decisao" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma ação" />
                    </SelectTrigger>
                    <SelectContent>
                      {sol.situacao === "recebida" ||
                      sol.situacao === "em_fila_contestacao" ? (
                        <>
                          <SelectItem value="aprovar">Aprovar</SelectItem>
                          <SelectItem value="reprovar">Reprovar</SelectItem>
                          <SelectItem value="solicitar_correcao">
                            Solicitar Correção
                          </SelectItem>
                        </>
                      ) : (
                        <SelectItem value="" disabled>
                          Já analisada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                  />
                </div>

                <Button
                  type="submit"
                  disabled={
                    sol.situacao !== "recebida" &&
                    sol.situacao !== "em_fila_contestacao"
                  }
                >
                  Executar Ação
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Informações da solicitação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>ID</span>
                <span className="font-mono text-xs">{sol.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Criada em</span>
                <span>{new Date(sol.criadoEm).toLocaleString("pt-BR")}</span>
              </div>
              {sol.analisadaEm && (
                <div className="flex justify-between">
                  <span>Analisada em</span>
                  <span>
                    {new Date(sol.analisadaEm).toLocaleString("pt-BR")}
                  </span>
                </div>
              )}
              {sol.negocioId && (
                <div className="flex justify-between">
                  <span>Negócio criado</span>
                  <Link
                    href={`/admin/negocios/${sol.negocioId}`}
                    className="text-blue-600 hover:underline"
                  >
                    Ver negócio
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
