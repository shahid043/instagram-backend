import jwt from "jsonwebtoken";
import config from "../config/config.js";

export function auth(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Please log in",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (err) {
    return res.status(401).json({
      message: "Invalid access token",
    });
  }
}