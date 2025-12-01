import express from "express";
import cookieParser from "cookie-parser";

export const app = express();

//MIDDLEWARES
app.use(express.json());
app.use(cookieParser());

//ROUTES

//INVALID PATH

//GLOBAL ERROR HANDLER
