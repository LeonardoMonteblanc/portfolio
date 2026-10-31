// src/app/(admin)/admin/imagens/page.tsx
import { db } from "@/infrastructure/db/client";
import { imagem, negocio } from "@/infrastructure/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Toaster } from "@/ui/components/sonner";
import { ImageOff } from "lucide-react";
import {
  ImagemFilaModeracao,
  type ImagemFilaItem,
} from "./_components/fila-moderacao";

async function contarPorSituacao(situacao: string): Promise<number> {
  const linhas = await db
    .select({ total: sql<number>`count(*)` })
    .from(imagem)
    .where(eq(imagem.situacao, situacao));

  const linha = linhas[0];
  return linha ? Number(linha.total ?? 0) : 0;
}

export default async function ImagensPage() {
  const [pendentes, aprovadas, rejeitadas] = await Promise.all([
    contarPorSituacao("pendente"),
    contarPorSituacao("aprovada"),
    contarPorSituacao("rejeitada"),
  ]);

  const fila = await db
    .select({
      id: imagem.id,
      url: imagem.url,
      tipo: imagem.tipo,
      negocioNome: negocio.nome,
      criadoEm: imagem.criadoEm,
    })
    .from(imagem)
    .leftJoin(negocio, eq(imagem.negocioId, negocio.id))
    .where(eq(imagem.situacao, "pendente"))
    .orderBy(desc(imagem.criadoEm))
    .limit(50);

  const imagensPendentes: ImagemFilaItem[] = fila.map(
    ({ id, url, tipo, negocioNome, criadoEm }) => ({
      id,
      url,
      tipo,
      negocioNome,
      criadoEm,
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Imagens</h1>
          <p className="text-muted-foreground">
            Moderar imagens enviadas por solicitantes
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{aprovadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rejeitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{rejeitadas}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Fila de Moderação</h2>
        {imagensPendentes.length > 0 ? (
          <ImagemFilaModeracao imagens={imagensPendentes} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">
                Nenhuma imagem pendente de moderação
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Quando solicitantes enviarem imagens para moderação, elas vão
                aparecer nesta fila para aprovação ou rejeição.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
