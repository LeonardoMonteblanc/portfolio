# 06 — Banco e migrations

## Mapa do schema (`src/infrastructure/db/schema/`)

| Domínio     | Tabelas                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Acesso      | `administrador`, `password_reset_token`                                                        |
| Catálogo    | `categoria`, `negocio`, `negocio_categoria`, `contato`, `localizacao`, `horario_funcionamento` |
| Solicitação | `solicitante`, `solicitacao`, `sugestao_categoria`, `documento_termo`, `aceite_termo`          |
| Decisão     | `contestacao`, `votacao`, `voto`, `forum_publicacao` (+ `aprovacao_vigente_id` em `negocio`)   |
| Mídia       | `imagem`, `anexo`, `job`                                                                       |
| Operação    | `configuracao`                                                                                 |
| Auditoria   | `logs/*`: 24 tabelas append-only + `log_auditoria` (índice transversal)                        |

> A decisão individual não tem tabela própria: ela é registrada em
> `negocio.aprovacao_vigente_id` + `log_solicitacao_analisada`. Consulte o modelo
> de dados em `docs-projeto` antes de alterar esse ponto.

## Regras de migration (obrigatórias)

1. **Toda mudança de schema passa por `pnpm db:generate`** — nunca altere o
   banco "na mão" e deixe o código para depois.
2. **O SQL gerado deve ser idempotente** antes de ser aplicado:
   - `CREATE TABLE IF NOT EXISTS`;
   - `ADD COLUMN IF NOT EXISTS`;
   - `CREATE INDEX IF NOT EXISTS`;
   - constraints/FKs em bloco `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ...) THEN ... END IF; END $$;`
3. **Nunca inclua `DROP TABLE`/`DROP COLUMN` gerados automaticamente** sem
   revisar: o drizzle compara snapshots e às vezes propõe remoções que não têm
   relação com a sua mudança.
4. **Teste do zero antes de aplicar em produção**: `pnpm test:integration`
   recria o banco a partir das migrations.
5. **Migrations já aplicadas não se editam.** Crie a próxima.

## Por que a idempotência importa aqui (histórico real)

Em 2026-10-31 o banco de produção tinha 10 migrations registradas em
`drizzle.__drizzle_migrations`, enquanto o journal local tinha 12. As migrations
`0010_left_wither` e `0011_broken_guardian` **nunca** rodaram em produção, mas
continham `CREATE TABLE` (não idempotente) e até `DROP TABLE "health_check" CASCADE`
gerado automaticamente. Rodar `pnpm db:migrate` quebraria o deploy.

O que foi feito:

- reescritas como idempotentes e sem comandos destrutivos;
- `0012` criou de fato `job`, `log_anonimizacao` e `log_configuracao`;
- `0013` alinhou `voto` ao domínio (o banco tinha `valor NOT NULL` e nenhuma
  coluna `escolha`, então **nenhum voto podia ser gravado**);
- `0014` criou `configuracao`;
- `0015` criou a view materializada `vw_auditoria_consolidada` e — descoberta no
  caminho — regularizou três tabelas que existiam **só** em produção, criadas por
  script ad-hoc e sem schema Drizzle: `log_correcao`, `log_reabertura` e
  `log_cancelamento_fila`. Sem elas, um banco novo não conseguia construir a view.

Resultado: o banco tem hoje 15 migrations aplicadas e a suíte de integração sobe
o schema inteiro do zero.

## Como diagnosticar drift

Rode contra o banco alvo (com cautela — confirme o host):

```sql
-- colunas reais de uma tabela
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'voto'
order by ordinal_position;

-- tabelas que existem no banco
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

-- migrations registradas pelo drizzle
select id, hash, created_at from drizzle.__drizzle_migrations order by id;
```

Compare com `src/infrastructure/db/schema/*.ts` e com
`src/infrastructure/db/migrations/meta/_journal.json`. Divergência entre os três
é drift: corrija com uma migration nova, nunca removendo campos do código.

> Observação: `.gitignore` tinha `logs/`, que capturava
> `src/infrastructure/db/schema/logs/` e deixava os últimos schemas fora do
> build. A regra agora é `/logs/` (só a raiz).

## Aplicar

```bash
# local (recomendado para desenvolvimento)
$env:DATABASE_URL='postgresql://dev:dev@localhost:5432/diretorio_dev'
pnpm db:migrate

# produção (Neon) — só depois de rodar pnpm test:integration
pnpm db:migrate
```

## Rollback

Não há rollback automático. O caminho seguro é:

1. criar uma migration nova que desfaça a mudança;
2. restaurar o backup do Neon (branch/point-in-time) se houver perda de dados.

Por isso: mudanças destrutivas exigem backup antes e revisão de quem revisa.

### 0015 — view de auditoria e tabelas órfãs

`0015_vw_auditoria_consolidada.sql` cria a view materializada com
`UNION ALL` sobre as 24 tabelas de log. Ao testá-la em um banco novo apareceu
um problema que só existia em produção: **três tabelas de log não tinham schema
nem migration** — `log_correcao`, `log_reabertura` e `log_cancelamento_fila`
haviam sido criadas por script ad-hoc. A migration passou a criá-las
(`IF NOT EXISTS`) e os schemas Drizzle foram adicionados em
`src/infrastructure/db/schema/logs/`.

Lição: se um objeto existe em produção mas não nas migrations, o projeto **não é
reprodutível**. A suíte de integração (que sobe o banco do zero) é o detector
desse tipo de drift.
