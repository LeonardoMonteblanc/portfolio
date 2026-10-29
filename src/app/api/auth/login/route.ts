// src/app/api/auth/login/route.ts
import { loginAction } from "@/application/auth/login";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const result = await loginAction(null, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    redirect: result.redirect,
  });

  // Set auth cookie
  if (result.token) {
    response.cookies.set("auth_token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
  }

  return response;
}
