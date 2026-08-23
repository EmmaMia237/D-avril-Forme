import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_jwt_secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? "7d";

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
