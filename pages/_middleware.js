import { NextResponse, NextRequest } from 'next/server'
import config from "@constants/config";

export async function middleware(req, ev) {
    const { pathname } = req.nextUrl
    if (pathname == '/login') {
        return NextResponse.redirect(config.discordUrl)
    }
    return NextResponse.next()
}