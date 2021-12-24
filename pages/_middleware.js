import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import config from "@constants/config";

export async function middleware(req, ev) {
  if (req.nextUrl.pathname == "/login") {
    return NextResponse.redirect(config.discordUrl);
  }
  return NextResponse.next();
}
