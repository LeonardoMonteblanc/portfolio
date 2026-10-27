// src/app/api/auth/recuperar-senha/solicitar/route.ts
import { solicitarRecuperacaoSenhaAction } from "@/application/auth/recuperar-senha";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await solicitarRecuperacaoSenhaAction(null, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: result.message });
}
