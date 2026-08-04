export function authcookie(req, res, next) {
  const token = req.cookies.refreshToken; // or accessToken if that's your cookie name

  if (!token) {
    return res.status(401).json({
      message: "Please log in",
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }
}