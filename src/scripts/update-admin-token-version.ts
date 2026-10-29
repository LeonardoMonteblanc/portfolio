// src/scripts/update-admin-token-version.ts
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function updateAdminTokenVersion() {
  console.log("Updating admin token_version...");

  try {
    const result = await sql`
      UPDATE public.administrador 
      SET token_version = 1, ativo = true 
      WHERE email = 'admin@guiabg.com.br'
      RETURNING id, email, token_version, ativo
    `;

    console.log("Updated admin:", JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.log("No admin found with email admin@guiabg.com.br");
    } else {
      console.log("Successfully updated admin token_version to 1");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

updateAdminTokenVersion()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });
