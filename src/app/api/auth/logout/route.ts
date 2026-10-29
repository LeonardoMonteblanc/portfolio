// src/app/api/auth/logout/route.ts
import { logoutAction } from "@/application/auth/login";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const result = await logoutAction();

  const response = NextResponse.json({
    success: true,
    redirect: result.redirect,
  });

  // Delete auth cookie
  if (result.deleteCookie) {
    response.cookies.delete("auth_token");
  }

  return response;
}
