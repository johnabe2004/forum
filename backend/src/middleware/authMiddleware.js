import { verifyToken } from "../utils/jwt.js";

const authenticate = (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      const error = new Error("Authentication token is required.");
      error.statusCode = 401;
      return next(error);
    }
    const parts = authorizationHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      const error = new Error("Invalid authentication token format.");
      error.statusCode = 401;
      return next(error);
    }
    const token = parts[1];
    const decodedToken = verifyToken(token);
    req.user = {
      userId: decodedToken.userId,
    };

    next();
  } catch (error) {
    const authenticationError = new Error(
      "Invalid or expired authentication token.",
    );

    authenticationError.statusCode = 401;
    next(authenticationError);
  }
};
export default authenticate;
