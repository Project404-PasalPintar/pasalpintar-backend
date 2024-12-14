import {Request, Response, NextFunction} from "express";
import * as jwt from "jsonwebtoken";

export const verifyAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "fail",
      message: "Unauthorized. Please provide an access token in headers.",
    });
  }

  const token = authHeader.split(" ")[1];
  const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
  const refreshTokenSecret = process.env.JWT_REFRESH_TOKEN_SECRET;

  if (!accessTokenSecret || !refreshTokenSecret) {
    return res.status(500).json({
      status: "fail",
      message: "Token secrets are not defined in the environment variables.",
    });
  }

  // Function to verify both access and refresh tokens
  const verifyToken = (
    token: string,
    secret: string,
    tokenType: string,
    callback: (
      err: jwt.VerifyErrors | null,
      decoded: jwt.JwtPayload | undefined
    ) => void
  ) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        if (err instanceof jwt.TokenExpiredError && tokenType === "access") {
          return callback(null, undefined); // Handle access token expiry and proceed with refresh token check
        }
        return callback(err, undefined); // Handle other JWT errors
      }
      if (typeof decoded === "object") {
        callback(null, decoded as jwt.JwtPayload); // Ensure decoded is JwtPayload
      } else {
        callback(null, undefined); // If it's not an object, return undefined
      }
    });
  };

  // Verify access token first
  verifyToken(token, accessTokenSecret, "access", (err, decodedAccess) => {
    // if (err && !(err instanceof jwt.TokenExpiredError)) {
    //   // Jika terjadi kesalahan pada token akses yang bukan kadaluarsa
    //   return res.status(403).json({
    //     status: "fail",
    //     message: "Invalid access token.",
    //   });
    // }

    if (decodedAccess) {
      // Check if the role is valid (either 'user' or 'lawyer')
      if (decodedAccess.role !== "lawyer") {
        return res.status(403).json({
          status: "fail",
          message:
            "Insufficient permissions. Only lawyers can access this route.",
        });
      }

      req.user = decodedAccess; // Access token is valid and role is valid
      return next();
    }

    // If access token is expired, check the refresh token
    verifyToken(
      token,
      refreshTokenSecret,
      "refresh",
      (errRefresh, decodedRefresh) => {
        if (errRefresh) {
          return res.status(403).json({
            status: "fail",
            message: "Invalid or expired refresh token.",
          });
        }

        if (decodedRefresh) {
          // Check if the role is valid (either 'user' or 'lawyer')
          if (decodedRefresh.role !== "lawyer") {
            return res.status(403).json({
              status: "fail",
              message:
                "Insufficient permissions. Only lawyers can access this route.",
            });
          }

          req.user = decodedRefresh; // Refresh token is valid and role is valid
          return next();
        }

        return res.status(403).json({
          status: "fail",
          message: "Invalid token.",
        });
      }
    );
  });

  return;
};
