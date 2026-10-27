// src/app/api/auth/recuperar-senha/redefinir/route.ts
import { redefinirSenhaAction } from "@/application/auth/recuperar-senha";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await redefinirSenhaAction(null, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    redirect: result.redirect,
  });
}
