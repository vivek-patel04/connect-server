import express from "express";
import { register, login, logout, generateTokens } from "../controllers/index.js";
import { loginInputValidator, registerInputValidator } from "../middlewares/inputValidators.js";

export const authRoutes = express.Router();

authRoutes.post("/register", registerInputValidator, register);
authRoutes.post("/login", loginInputValidator, login);
authRoutes.post("/logout", logout);
authRoutes.get("/refresh", generateTokens);
