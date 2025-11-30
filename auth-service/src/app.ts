import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";

export const app = express();

//MIDDLEWARES
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

//ROUTES
app.use("/api/auth", authRoutes);

//HANDLE WRONG PATH
app.use("/", (req, res) => {
    return res.status(404).json({ success: false, message: "Page not found" });
});

//GLOBAL ERROR HANDLER
app.use(errorHandler);
