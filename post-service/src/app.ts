import express from "express";
import cookieParser from "cookie-parser";
import { postRoutes } from "./routes/postRoutes.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

//MIDDLEWARES
app.use(express.json());
app.use(cookieParser());

//ROUTES
app.use("/", postRoutes);

//ERROR HANDLER FOR INVALID PATH
app.use("/", (req, res) => {
    return res.status(404).json({ success: false, message: "Invalid path" });
});

//GLOBAL ERROR HANDLER
app.use(errorHandler);
