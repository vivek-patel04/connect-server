import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { userRoutes } from "./routes/userRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

//MIDDLEWARES
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

//ROUTES
app.use("/api/user", userRoutes);

//ERROR HANDLER FOR INVALID PATH
app.use("/", (req, res) => {
    return res.status(404).json({ success: false, message: "Invalid path" });
});

//GLOBAL ERROR HANDLER
app.use(errorHandler);
