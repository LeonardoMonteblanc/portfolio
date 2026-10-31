import { db } from "@/infrastructure/db/client";

async function check() {
  try {
    const result = await db.execute(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('imagem', 'anexo', 'log_imagem', 'log_anexo', 'password_reset_token')
    `);
    console.log("Tabelas encontradas:", result);
  } catch (e: any) {
    console.error("Erro:", e.message);
  }
  process.exit(0);
}

check();
