import express from "express";

const app = express();

app.get("/api", (req, res) => {
  return res
    .status(200)
    .json({ success: true, message: "Hello from auth service" });
});

export default app;
