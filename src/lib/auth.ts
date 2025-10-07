import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { MongoClient } from "mongodb"
import mongoose from "mongoose"

// Create MongoDB client for Better Auth
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/goip_messages?directConnection=true")
const db = client.db()

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client // Optional: client for transactional support
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    }
  },
  account: {
    accountLinking: {
      enabled: true
    }
  },
  pages: {
    signIn: "/login",
    signUp: "/signup",
    error: "/login",
  },
})

export type Session = typeof auth.$Infer.Session
