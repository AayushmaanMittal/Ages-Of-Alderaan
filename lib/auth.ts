import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface User {
  id: string
  username: string
  email: string
  role: "admin" | "analyst" | "viewer"
}

export interface AuthToken {
  userId: string
  username: string
  role: string
  exp: number
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  )
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthToken
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Mock user database (replace with actual database)
export const users: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@network-monitor.com",
    role: "admin",
  },
  {
    id: "2",
    username: "analyst",
    email: "analyst@network-monitor.com",
    role: "analyst",
  },
]
