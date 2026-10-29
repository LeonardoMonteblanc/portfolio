// src/app/(admin)/solicitacoes/[id]/page.tsx
import { buscarSolicitacaoPorIdAction } from "@/application/solicitacoes";
import {
  criarForumPublicacaoAction,
  listarForumPublicacoesAction,
} from "@/application/governanca/forum";
import {
  abrirContestacaoAction,
  listarContestacoesAction,
} from "@/application/governanca/contestacao";
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
import { NativeSelect } from "@/ui/components/native-select";
import { Badge } from "@/ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import {
  AlertCircle,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
  FileText,
  MessageSquare,
  Gavel,
  Vote,
  Users,
  Plus,
  Send,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AcaoForm } from "./_components/acao-form";

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

const DECISAO_OPTIONS = [
  { value: "aprovar", label: "Aprovar" },
  { value: "reprovar", label: "Reprovar" },
  { value: "solicitar_correcao", label: "Solicitar Correção" },
] as const;

const FORUM_TIPO_OPTIONS = [
  { value: "comentario", label: "Comentário" },
  { value: "concordancia", label: "Concordância" },
  { value: "discordancia", label: "Discordância" },
] as const;

const CONTESTACAO_TIPO_OPTIONS = [
  { value: "oficial", label: "Contestação Oficial (abre votação)" },
  { value: "manifesta", label: "Manifestação (apenas registro)" },
] as const;

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
            <CardContent>
              <AcaoForm solicitacaoId={sol.id} situacao={sol.situacao} />
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

          {sol.negocioId && (
            <Tabs defaultValue="forum" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="forum">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Fórum
                </TabsTrigger>
                <TabsTrigger value="contestacao">
                  <Gavel className="h-4 w-4 mr-2" />
                  Contestação
                </TabsTrigger>
              </TabsList>

              <TabsContent value="forum">
                <ForumTab solicitacaoId={sol.id} negocioId={sol.negocioId} />
              </TabsContent>

              <TabsContent value="contestacao">
                <ContestacaoTab
                  solicitacaoId={sol.id}
                  negocioId={sol.negocioId}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

// Forum Tab Component
async function ForumTab({
  solicitacaoId,
  negocioId,
}: {
  solicitacaoId: string;
  negocioId: string;
}) {
  const formData = new FormData();
  formData.append("negocioId", negocioId);
  const result = await listarForumPublicacoesAction(null, formData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussão do Fórum
            </CardTitle>
            <CardDescription>
              Comentários, concordâncias e discordâncias
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário para nova publicação */}
          <form
            action={async (formData: FormData) => {
              "use server";
              formData.append("negocioId", negocioId);
              const result = await criarForumPublicacaoAction(null, formData);
              if (!("error" in result)) {
                revalidatePath(`/admin/solicitacoes/${solicitacaoId}`);
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="forum-conteudo">Nova publicação</Label>
              <Textarea
                name="conteudo"
                id="forum-conteudo"
                rows={3}
                placeholder="Digite seu comentário, concordância ou discordância..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forum-tipo">Tipo</Label>
              <NativeSelect name="tipo" id="forum-tipo" value="" required>
                <option value="">Selecione o tipo</option>
                {FORUM_TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit">
              <Send className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </form>

          {/* Lista de publicações */}
          <div className="space-y-3">
            {"success" in result &&
            result.success &&
            result.publicacoes &&
            result.publicacoes.length > 0 ? (
              result.publicacoes.map((pub: any) => (
                <div key={pub.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {pub.autor?.nome || "Admin"}
                        </span>
                        <Badge
                          variant={
                            pub.tipo === "concordancia"
                              ? "default"
                              : pub.tipo === "discordancia"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {pub.tipo}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(pub.criadaEm).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{pub.conteudo}</p>
                      {pub.comentarioPaiId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Resposta a comentário
                        </p>
                      )}
                    </div>
                    {pub.editada && (
                      <span className="text-xs text-gray-400">(editada)</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhuma publicação no fórum ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Contestacao Tab Component
async function ContestacaoTab({
  solicitacaoId,
  negocioId,
}: {
  solicitacaoId: string;
  negocioId: string;
}) {
  const formData = new FormData();
  formData.append("negocioId", negocioId);
  const result = await listarContestacoesAction(null, formData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Contestações
            </CardTitle>
            <CardDescription>
              Contestações formais que podem iniciar votação
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulário para nova contestação */}
          <form
            action={async (formData: FormData) => {
              "use server";
              formData.append("negocioId", negocioId);
              formData.append("solicitacaoId", solicitacaoId);
              const result = await abrirContestacaoAction(null, formData);
              if (!("error" in result)) {
                revalidatePath(`/admin/solicitacoes/${solicitacaoId}`);
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-2">
              <Label htmlFor="contestacao-fundamentacao">Fundamentação</Label>
              <Textarea
                name="fundamentacao"
                id="contestacao-fundamentacao"
                rows={4}
                placeholder="Explique os motivos da contestação..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contestacao-tipo">Tipo</Label>
              <NativeSelect name="tipo" id="contestacao-tipo" value="" required>
                <option value="">Selecione o tipo</option>
                {CONTESTACAO_TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Contestação
            </Button>
          </form>

          {/* Lista de contestações */}
          <div className="space-y-3">
            {"success" in result &&
            result.success &&
            result.contestacoes &&
            result.contestacoes.length > 0 ? (
              result.contestacoes.map((cont: any) => (
                <div key={cont.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {cont.autor?.nome || "Admin"}
                        </span>
                        <Badge
                          variant={
                            cont.tipo === "oficial"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {cont.tipo === "oficial" ? "Oficial" : "Manifestação"}
                        </Badge>
                        <Badge
                          variant={getSituacaoContestacaoVariant(cont.situacao)}
                        >
                          {getSituacaoContestacaoLabel(cont.situacao)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(cont.criadaEm).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">
                        {cont.fundamentacao}
                      </p>
                      {cont.votacao && (
                        <div className="mt-2 p-2 bg-blue-50 rounded">
                          <p className="text-sm text-blue-800">
                            <Vote className="h-4 w-4 inline mr-1" />
                            Votação:{" "}
                            <span className="font-medium">
                              {getSituacaoVotacaoLabel(cont.votacao.situacao)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nenhuma contestação registrada.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function getSituacaoContestacaoLabel(situacao: string): string {
  const labels: Record<string, string> = {
    aberta: "Aberta",
    em_votacao: "Em Votação",
    encerrada: "Encerrada",
  };
  return labels[situacao] || situacao;
}

function getSituacaoContestacaoVariant(
  situacao: string,
): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    aberta: "default",
    em_votacao: "secondary",
    encerrada: "outline",
  };
  return variants[situacao] || "default";
}

function getSituacaoVotacaoLabel(situacao: string): string {
  const labels: Record<string, string> = {
    aberta: "Aberta",
    encerrada: "Encerrada",
    cancelada: "Cancelada",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    sem_aprovacao: "Sem Aprovação (Empate)",
  };
  return labels[situacao] || situacao;
}
