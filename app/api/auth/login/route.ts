import { type NextRequest, NextResponse } from "next/server"
import { users, generateToken } from "@/lib/auth"

// Mock password hashes (in production, these would be properly hashed)
const mockPasswords: Record<string, string> = {
  admin: "admin123",
  analyst: "analyst123",
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const user = users.find((u) => u.username === username)

    if (!user || mockPasswords[username] !== password) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const token = generateToken(user)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 })
  }
}
