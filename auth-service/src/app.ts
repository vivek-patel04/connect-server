import express from "express";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";

export const app = express();

//MIDDLEWARES
app.use(express.json());
app.use(cookieParser());

//ROUTES
app.use("/", authRoutes);

//ERROR HANDLER FOR INVALID PATH
app.use("/", (req, res) => {
    return res.status(404).json({ success: false, message: "Invalid path" });
});

//GLOBAL ERROR HANDLER
app.use(errorHandler);
