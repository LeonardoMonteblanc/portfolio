/**
 * Executado antes de cada arquivo de teste de integração.
 * Precisa vir ANTES de qualquer import de `@/infrastructure` (o client lê
 * DATABASE_URL no carregamento do módulo e `src/shared/env.ts` valida o resto).
 */
import { urlBancoDeTeste } from "./global-setup";

process.env.DATABASE_URL = urlBancoDeTeste();

// Valores fictícios: os testes não falam com Resend/R2/Sentry.
process.env.JWT_SECRET ??= "segredo-de-teste-com-32-caracteres-ok";
process.env.RESEND_API_KEY ??= "re_test_key";
process.env.RESEND_FROM_EMAIL ??= "teste@exemplo.local";
process.env.R2_ACCOUNT_ID ??= "teste";
process.env.R2_ACCESS_KEY_ID ??= "teste";
process.env.R2_SECRET_ACCESS_KEY ??= "teste";
process.env.R2_BUCKET_NAME ??= "teste";
process.env.UPASTASH_REDIS_URL ??= "";
process.env.UPSTASH_REDIS_TOKEN ??= "";
