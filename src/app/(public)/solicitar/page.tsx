// src/app/(public)/solicitar/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { Textarea } from "@/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Checkbox } from "@/ui/components/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Alert, AlertDescription, AlertTitle } from "@/ui/components/alert";
import { ImageUpload, FileUpload } from "@/ui/components/image-upload";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

const TIPOS_CONTATO = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "E-mail" },
  { value: "outro", label: "Outro" },
] as const;

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

function SuccessMessage() {
  const searchParams = useSearchParams();
  if (searchParams.get("sucesso") !== "1") return null;

  return (
    <div className="text-center py-12">
      <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Solicitação enviada!
      </h2>
      <p className="text-gray-600 mb-6">
        Sua solicitação foi recebida e será analisada pela administração. Você
        receberá atualizações por e-mail.
      </p>
      <Link href="/" className="inline-block text-blue-600 hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}

export default function SolicitarPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [duplicata, setDuplicata] = useState<any[]>([]);
  const [showDuplicata, setShowDuplicata] = useState(false);

  const [nomeSolicitante, setNomeSolicitante] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [nomeNegocio, setNomeNegocio] = useState("");
  const [descricao, setDescricao] = useState("");
  const [contatos, setContatos] = useState<
    Array<{ tipo: string; valor: string; ordem: number }>
  >([{ tipo: "whatsapp", valor: "", ordem: 0 }]);
  const [localizacao, setLocalizacao] = useState({
    endereco: "",
    bairro: "",
    areaAtendimento: "",
  });
  const [horarios, setHorarios] = useState<
    Array<{
      diaSemana: number;
      horaAbertura: string;
      horaFechamento: string;
      observacao: string;
    }>
  >([]);
  const [categoriasIds, setCategoriasIds] = useState<string[]>([]);
  const [sugestaoCategoria, setSugestaoCategoria] = useState("");
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<
    Array<{ id: string; nome: string; slug: string }>
  >([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);

  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [termos, setTermos] = useState<
    Array<{ tipo: string; versao: string; conteudo: string }>
  >([]);

  // Imagens e anexos
  const [imagens, setImagens] = useState<
    Array<{
      key: string;
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      preview?: string;
      tipo: "logo" | "foto";
    }>
  >([]);
  const [anexos, setAnexos] = useState<
    Array<{
      key: string;
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      nomeOriginal: string;
    }>
  >([]);

  async function carregarCategorias() {
    setCarregandoCategorias(true);
    try {
      const res = await fetch("/api/categorias");
      if (res.ok) {
        const data = await res.json();
        setCategoriasDisponiveis(data.categorias || []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    } finally {
      setCarregandoCategorias(false);
    }
  }

  async function carregarTermos() {
    try {
      const res = await fetch("/api/termos");
      if (res.ok) {
        const data = await res.json();
        setTermos(data.termos || []);
      }
    } catch (error) {
      console.error("Erro ao carregar termos:", error);
    }
  }

  async function verificarDuplicata() {
    if (!nomeNegocio.trim()) return;
    try {
      const res = await fetch("/api/duplicata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeNegocio,
          contatos: contatos.map((c) => c.valor),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.duplicatas && data.duplicatas.length > 0) {
          setDuplicata(data.duplicatas);
          setShowDuplicata(true);
        } else {
          setShowDuplicata(false);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar duplicata:", error);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aceiteTermos) {
      setError("É obrigatório aceitar os termos");
      return;
    }
    if (contatos.some((c) => !c.valor.trim())) {
      setError("Todos os contatos devem ter valor preenchido");
      return;
    }
    if (categoriasIds.length === 0 && !sugestaoCategoria.trim()) {
      setError("Selecione pelo menos uma categoria ou sugira uma nova");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("nomeSolicitante", nomeSolicitante);
    formData.append("email", email);
    formData.append("telefone", telefone);
    formData.append("nomeNegocio", nomeNegocio);
    formData.append("descricao", descricao);
    formData.append("contatos", JSON.stringify(contatos));
    if (categoriasIds.length > 0) {
      categoriasIds.forEach((id) => formData.append("categoriasIds", id));
    }
    if (sugestaoCategoria)
      formData.append("sugestaoCategoria", sugestaoCategoria);
    if (localizacao.endereco)
      formData.append("localizacao", JSON.stringify(localizacao));
    if (horarios.length > 0)
      formData.append("horarios", JSON.stringify(horarios));
    formData.append("declaracaoVinculo", "Declaro ter vínculo com o negócio");
    formData.append("aceiteTermos", "true");
    if (imagens.length > 0) {
      formData.append("imagens", JSON.stringify(imagens));
    }
    if (anexos.length > 0) {
      formData.append("anexos", JSON.stringify(anexos));
    }

    fetch("/api/solicitacoes", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        if (data.error) {
          setError(data.error);
        } else if (data.duplicataDetectada) {
          setDuplicata([{ nome: "Possível duplicata detectada" }]);
          setShowDuplicata(true);
        } else {
          router.push("/solicitar?sucesso=1");
        }
      })
      .catch(() => {
        setLoading(false);
        setError("Erro ao enviar solicitação");
      });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Solicitar Inclusão no Diretório
          </h1>
          <p className="text-gray-600 mt-2">
            Preencha o formulário abaixo para solicitar a inclusão do seu
            negócio no Diretório Comunitário.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step >= stepNum
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step >= stepNum + 1 ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {duplicata.length > 0 && showDuplicata && (
          <Alert
            variant="default"
            className="mb-6 border-amber-200 bg-amber-50"
          >
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">
              Possível duplicata detectada
            </AlertTitle>
            <AlertDescription>
              Encontramos negócios semelhantes. Verifique se já não existe
              cadastro:
              <ul className="mt-2 list-disc list-inside text-sm">
                {duplicata.map((d, i) => (
                  <li key={i}>{d.nome || `Negócio similar ${i + 1}`}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDuplicata(false)}
                >
                  Continuar mesmo assim
                </Button>
                <Button
                  onClick={() => {
                    setShowDuplicata(false);
                    setStep(1);
                  }}
                >
                  Corrigir dados
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(2);
            }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    1
                  </span>
                  Dados do Solicitante
                </CardTitle>
                <CardDescription>
                  Informações de quem está fazendo a solicitação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nomeSolicitante">Nome completo *</Label>
                    <Input
                      id="nomeSolicitante"
                      value={nomeSolicitante}
                      onChange={(e) => setNomeSolicitante(e.target.value)}
                      placeholder="João da Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joao@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) =>
                        setTelefone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="(54) 99999-9999"
                      required
                      maxLength={15}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">Próximo →</Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(3);
            }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    2
                  </span>
                  Dados do Negócio
                </CardTitle>
                <CardDescription>
                  Informações do negócio a ser cadastrado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeNegocio">Nome do negócio *</Label>
                    <Input
                      id="nomeNegocio"
                      value={nomeNegocio}
                      onChange={(e) => {
                        setNomeNegocio(e.target.value);
                        verificarDuplicata();
                      }}
                      placeholder="Padaria do João"
                      required
                      onBlur={verificarDuplicata}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva os produtos/serviços oferecidos..."
                      rows={4}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Contatos *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setContatos([
                          ...contatos,
                          {
                            tipo: "whatsapp",
                            valor: "",
                            ordem: contatos.length,
                          },
                        ])
                      }
                    >
                      + Adicionar contato
                    </Button>
                  </div>
                  {contatos.map((contato, index) => (
                    <div
                      key={index}
                      className="grid gap-2 md:grid-cols-[1fr_2fr_1fr_auto] items-end"
                    >
                      <Select
                        value={contato.tipo}
                        onValueChange={(v) =>
                          setContatos((c) =>
                            c.map((c, i) =>
                              i === index ? { ...c, tipo: v } : c,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_CONTATO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={contato.valor}
                        onChange={(e) =>
                          setContatos((c) =>
                            c.map((c, i) =>
                              i === index ? { ...c, valor: e.target.value } : c,
                            ),
                          )
                        }
                        placeholder={
                          contato.tipo === "whatsapp" ||
                          contato.tipo === "telefone"
                            ? "(54) 99999-9999"
                            : contato.tipo === "email"
                              ? "email@exemplo.com"
                              : "Valor"
                        }
                        required
                      />
                      <Select
                        value={String(contato.ordem)}
                        onValueChange={(v) =>
                          setContatos((c) =>
                            c.map((c, i) =>
                              i === index ? { ...c, ordem: Number(v) } : c,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Ordem" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map((o) => (
                            <SelectItem key={o} value={String(o)}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setContatos((c) => c.filter((_, i) => i !== index))
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="sr-only">Remover</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <Label>Localização (opcional)</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={localizacao.endereco}
                        onChange={(e) =>
                          setLocalizacao((l) => ({
                            ...l,
                            endereco: e.target.value,
                          }))
                        }
                        placeholder="Rua das Flores, 123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={localizacao.bairro}
                        onChange={(e) =>
                          setLocalizacao((l) => ({
                            ...l,
                            bairro: e.target.value,
                          }))
                        }
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="areaAtendimento">
                        Área de atendimento
                      </Label>
                      <Input
                        id="areaAtendimento"
                        value={localizacao.areaAtendimento}
                        onChange={(e) =>
                          setLocalizacao((l) => ({
                            ...l,
                            areaAtendimento: e.target.value,
                          }))
                        }
                        placeholder="Centro, Bairro São José"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Horários de funcionamento (opcional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHorarios([
                          ...horarios,
                          {
                            diaSemana: 1,
                            horaAbertura: "08:00",
                            horaFechamento: "18:00",
                            observacao: "",
                          },
                        ])
                      }
                    >
                      + Adicionar horário
                    </Button>
                  </div>
                  {horarios.map((horario, index) => (
                    <div
                      key={index}
                      className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end"
                    >
                      <Select
                        value={String(horario.diaSemana)}
                        onValueChange={(v) =>
                          setHorarios((h) =>
                            h.map((h, i) =>
                              i === index ? { ...h, diaSemana: Number(v) } : h,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Dia" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIAS_SEMANA.map((d) => (
                            <SelectItem key={d.value} value={String(d.value)}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={horario.horaAbertura}
                        onChange={(e) =>
                          setHorarios((h) =>
                            h.map((h, i) =>
                              i === index
                                ? { ...h, horaAbertura: e.target.value }
                                : h,
                            ),
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={horario.horaFechamento}
                        onChange={(e) =>
                          setHorarios((h) =>
                            h.map((h, i) =>
                              i === index
                                ? { ...h, horaFechamento: e.target.value }
                                : h,
                            ),
                          )
                        }
                      />
                      <Input
                        value={horario.observacao}
                        onChange={(e) =>
                          setHorarios((h) =>
                            h.map((h, i) =>
                              i === index
                                ? { ...h, observacao: e.target.value }
                                : h,
                            ),
                          )
                        }
                        placeholder="Obs."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setHorarios((h) => h.filter((_, i) => i !== index))
                        }
                        className="text-red-500"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Imagens do negócio */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Imagens do negócio (opcional)</Label>
                    <span className="text-sm text-gray-500">
                      Máx 5 imagens (logo + fotos)
                    </span>
                  </div>
                  <ImageUpload
                    tipo="foto"
                    maxFiles={5}
                    solicitacaoId=""
                    onUploadComplete={setImagens}
                  />
                </div>

                {/* Anexos (documentos) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Anexos / Documentos (opcional)</Label>
                    <span className="text-sm text-gray-500">
                      PDF, DOC, DOCX - máx 10MB cada
                    </span>
                  </div>
                  <FileUpload solicitacaoId="" onUploadComplete={setAnexos} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Categorias *</Label>
                    <span className="text-sm text-gray-500">
                      Selecione ou sugira nova
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {carregandoCategorias ? (
                      <span className="text-sm text-gray-500">
                        Carregando...
                      </span>
                    ) : (
                      categoriasDisponiveis.map((cat) => (
                        <label
                          key={cat.id}
                          className="inline-flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={categoriasIds.includes(cat.id)}
                            onChange={(e) =>
                              setCategoriasIds((c) =>
                                e.target.checked
                                  ? [...c, cat.id]
                                  : c.filter((id) => id !== cat.id),
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{cat.nome}</span>
                        </label>
                      ))
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="sugestaoCategoria">
                        Sugerir nova categoria
                      </Label>
                      <Input
                        id="sugestaoCategoria"
                        value={sugestaoCategoria}
                        onChange={(e) => setSugestaoCategoria(e.target.value)}
                        placeholder="Ex: Cafeteria artesanal, Pet shop, etc."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  ← Voltar
                </Button>
                <Button type="submit">Próximo →</Button>
              </CardFooter>
            </Card>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                    3
                  </span>
                  Termos e Envio
                </CardTitle>
                <CardDescription>
                  Leia e aceite os termos para enviar sua solicitação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {termos.map((termo, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <h4 className="font-medium mb-2">
                        {termo.tipo.replace("_", " ").toUpperCase()} v
                        {termo.versao}
                      </h4>
                      <div className="max-h-48 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap">
                        {termo.conteudo}
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        id="aceiteTermos"
                        checked={aceiteTermos}
                        onCheckedChange={(v) => setAceiteTermos(v === true)}
                        required
                      />
                      <div className="text-sm text-gray-700">
                        Li e aceito os <strong>Termos de Uso</strong>,{" "}
                        <strong>Política de Privacidade</strong> e{" "}
                        <strong>Tratamento de Dados</strong>.
                        <br />
                        Declaro que as informações fornecidas são verdadeiras e
                        estou ciente de que dados falsos podem implicar na
                        remoção do cadastro.
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  ← Voltar
                </Button>
                <Button type="submit" disabled={!aceiteTermos || loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}

        <Suspense fallback={<div>Carregando...</div>}>
          <SuccessMessage />
        </Suspense>
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Solicitação enviada!
          </h2>
          <p className="text-gray-600 mb-6">
            Sua solicitação foi recebida e será analisada pela administração.
            Você receberá atualizações por e-mail.
          </p>
          <Link href="/" className="inline-block text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
