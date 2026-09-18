import express from "express";
import cors from "cors";
import { connectDB } from "./config/connectDB.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import buildingRouter from "./routes/mapsRouter.js";
import authRouter from "./routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
connectDB();

app.use("/buildings", buildingRouter);
app.use("/auth", authRouter);

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});

export default app;
