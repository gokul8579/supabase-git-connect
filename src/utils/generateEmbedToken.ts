import jwt from "jsonwebtoken";

export function generateEmbedToken(userId: string) {
  const SECRET = import.meta.env.VITE_EMBED_SIGNING_SECRET;

  return jwt.sign(
    {
      user_id: userId,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365) // 1 year
    },
    SECRET
  );
}
