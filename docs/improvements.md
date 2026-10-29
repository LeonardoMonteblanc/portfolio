# Improvements Plan

This document outlines low‑impact, non‑intrusive improvements that can be applied to the project without disrupting the current work of the other agent.

## 1️⃣ Password‑reset token persistence

- Create `src/infrastructure/db/schema/password_reset_tokens.ts` with columns:
  - `id: uuid` primary key
  - `admin_id: uuid` (FK → `administrador.id`)
  - `hash: varchar(64)` – SHA‑256 of the token
  - `expires_at: timestamp with time zone`
- Insert a row in `solicitarRecuperacaoSenhaAction` after generating the token.
- In `redefinirSenhaAction` look up the row by `admin_id`, compare the stored hash, ensure `expires_at` is in the future, then delete the row.
- Log token creation and successful reset with `logRecuperacaoSenha` (add `tipo` values `token_created` / `reset_success`).

## 2️⃣ Record admin performing triage

- Extract `adminId` from the validated JWT payload (available via `request.cookies.get('auth_token')`).
- Pass the admin ID to `triarSugestaoAction` and store it in `logSugestaoCategoria` (`adminId` column).

## 3️⃣ Hidden‑contestation handling in `criarSolicitacaoAction`

- Add a check after duplicate detection: if the related business (`negocio`) has a status indicating hidden contention, insert a record into a new `contestation_queue` table instead of creating the solicitation directly.
- Create migration for `contestation_queue` with columns `id`, `negocio_id`, `solicitacao_data`, `created_at`.

## 4️⃣ Consistent error handling

- Wrap DB operations in `try/catch` blocks and return `{ error: string }` objects rather than throwing.
- This prevents unhandled 500 pages in server actions.

## 5️⃣ Rate‑limiting password‑reset requests

- Add a lightweight table `password_reset_requests` (`admin_id`, `requested_at`).
- Before creating a new token, count requests in the last hour; reject if > 3.

## 6️⃣ Type‑safe DB results

- Replace `as any` casts with proper inferred types, e.g.:
  ```ts
  const sugestao = (await db.query.sugestaoCategoria.findFirst({
    where: (s, { eq }) => eq(s.id, sugestaoId),
    with: { solicitacao: { with: { solicitante: true } } },
  })) as Awaited<ReturnType<typeof db.query.sugestaoCategoria.findFirst>>;
  ```

## 7️⃣ Log token version changes

- After incrementing `tokenVersion` in `solicitarRecuperacaoSenhaAction`, insert a log entry with `tipo: 'token_version_increment'`.

## 8️⃣ Secure reset‑link e‑mail

- Ensure the reset URL uses HTTPS and includes the host from `NEXT_PUBLIC_HOST` env var.
- Add security headers (`Content‑Security‑Policy`, `X‑Content‑Type‑Options`) in the Next.js API route serving the reset page.

## 9️⃣ Enforce lower‑casing on admin e‑mail uniqueness

- Add a unique index on `lower(email)` in the migration for `administrador` or enforce `email = email.toLowerCase()` on insert.

## 🔟 Align documentation

- Update the runbook to reflect the new `password_reset_tokens` table and the audit‑log entries.
- Reference this `docs/improvements.md` in the runbook's “Open issues / next steps” section.

---

_Prepared by the assistant to aid the development team.  
Co‑Authored‑By: Claude Code <noreply@anthropic.com>_
