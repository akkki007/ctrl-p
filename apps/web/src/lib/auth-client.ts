import { createAuthClient } from "better-auth/react";

/** Client for the better-auth instance mounted on the API at /api/auth. */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
});

export const { signIn, signUp, signOut, useSession } = authClient;
