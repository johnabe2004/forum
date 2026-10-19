import jwt from "jsonwebtoken";
import env from "../config/env.js";

const JWT_EXPIRES_IN = "1d";

const generateToken = (userId) => {
    const token = jwt.sign(
        {
            userId,
        },
        env.jwtSecret,
        {
            expiresIn: JWT_EXPIRES_IN,
        },
    );
    return token;
};


// NEW: Dedicated function for short-lived Password Reset Tokens (15 Minutes)
const generateResetToken = (userId) => {
  const token = jwt.sign(
    {
      userId,
      purpose: "password_reset", // Safety flag to prevent mixing up with login tokens
    },
    env.jwtSecret,
    {
      expiresIn: "15m", // Explodes dynamically after 15 minutes
    },
  );
  return token;
};

const verifyToken = (token) => {
    return jwt.verify(token, env.jwtSecret);
};

export { generateToken, generateResetToken, verifyToken };
