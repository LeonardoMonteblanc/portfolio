import postgres from "postgres";
import fs from "fs";

async function run() {
  const sql = fs.readFileSync("scripts/create-vw-auditoria.sql", "utf8");
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    await client.unsafe(sql);
    console.log("✅ View criada com sucesso via SQL direto");
    process.exit(0);
  } catch (e: any) {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
