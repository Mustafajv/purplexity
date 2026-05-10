import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

const client = createSupabaseClient()

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization
    // Support both "Bearer <token>" and raw token
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

    if (!token) {
      res.status(401).json({ message: "No authorization token provided" });
      return;
    }

    const data = await client.auth.getUser(token)
    const userId = data.data.user?.id

    if(userId){
      // Upsert user — create if new, skip if already exists
      await prisma.user.upsert({
        where: { email: data.data.user!.email! },
        update: {},
        create: {
          id: data.data.user!.id,
          supabaseId: data.data.user!.id,
          email: data.data.user?.email!,
          provider: data.data.user?.app_metadata.provider === "google" ? "Google" : "Github",
          name: data.data.user?.user_metadata.full_name ?? data.data.user?.email ?? "Unknown",
        }
      });

    req.userId = userId
      next()
    } else {
      res.status(403).json({
          message: "Invalid or expired token"
      })
    }

}