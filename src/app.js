import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
const app = express();


app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));


//import routes
import userRouter from "./routes/user.routes.js";
import videosRouter from "./routes/video.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videosRouter);


export {app};