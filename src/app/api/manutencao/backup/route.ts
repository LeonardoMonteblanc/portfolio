// src/app/api/manutencao/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { autorizadoPorCron } from "@/lib/cron-auth";
import { executarBackup } from "@/application/backup/backup.service";
import { dispararAlerta } from "@/infrastructure/alertas/alerta.service";
import { env } from "@/shared/env";
import {
  destinoDiretorio,
  destinoR2,
  ErroDestinoBackup,
  type DestinoBackup,
} from "@/infrastructure/backup/destino";

/**
 * Backup diário (Vercel Cron → `30 3 * * *`, RF-068 / RNF-025).
 *
 * O plano Hobby aceita no máximo 2 crons, por isso esta rotina tem rota própria
 * em vez de entrar na manutenção diária: assim um backup lento não atrasa o
 * expurgo LGPD e vice-versa, e cada um reporta falha separadamente.
 *
 * Sem destino configurado a rota responde 503 e NÃO finge sucesso — backup
 * "ok" que não gravou nada é pior que backup ausente.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function escolherDestino(): { destino: DestinoBackup } | { erro: string } {
  try {
    const destino = env.R2_BACKUP_BUCKET
      ? destinoR2()
      : env.BACKUP_DIRETORIO
        ? destinoDiretorio(env.BACKUP_DIRETORIO)
        : null;

    if (!destino) {
      return {
        erro: "Nenhum destino de backup configurado. Defina R2_BACKUP_BUCKET (bucket privado) ou BACKUP_DIRETORIO.",
      };
    }

    return { destino };
  } catch (erro) {
    if (erro instanceof ErroDestinoBackup) return { erro: erro.message };
    throw erro;
  }
}

export async function GET(request: NextRequest) {
  const porCron = autorizadoPorCron(request);

  if (!porCron) {
    const admin = await getAdmin();
    if (!admin?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const escolha = escolherDestino();
  if ("erro" in escolha) {
    return NextResponse.json({ error: escolha.erro }, { status: 503 });
  }

  const inicio = Date.now();

  try {
    const resultado = await executarBackup({
      destino: escolha.destino,
      aoProgresso: (mensagem) => console.log(`[Backup] ${mensagem}`),
    });

    return NextResponse.json({
      success: true,
      data: resultado.data,
      destino: resultado.destino,
      tabelas: resultado.tabelas,
      linhas: resultado.linhas,
      bytes: resultado.bytes,
      removidos: resultado.removidos.length,
      duracaoMs: Date.now() - inicio,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "erro desconhecido";
    console.error("[Backup] Falhou:", erro);

    const alerta = await dispararAlerta({
      tipo: "backup_falhou",
      severidade: "critico",
      mensagem,
      contexto: {
        destino: escolha.destino.descricao,
        origem: porCron ? "cron" : "admin",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: mensagem,
        alerta: {
          entregue: alerta.entregue,
          canais: alerta.canais.map((canal) => ({
            canal: canal.canal,
            sucesso: canal.sucesso,
            pulado: canal.pulado,
            erro: canal.erro,
          })),
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
