import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET ?? "dev_jwt_secret_change_me";

const token = jwt.sign(
  {
    sub: "dev-user",
    role: "admin",
  },
  jwtSecret,
  {
    expiresIn: "1h",
  }
);

console.log(token);
