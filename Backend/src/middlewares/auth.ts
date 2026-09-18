import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthedRequest extends Request {
  userId?: string;
}

export const verifyToken = (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      res.status(401).json({ status: 401, success: false, message: "Authentication token is missing" });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    req.userId = payload.id;
    next();
  } catch (error) {
    res.status(401).json({ status: 401, success: false, message: "Invalid or expired token" });
  }
};

export default verifyToken;
