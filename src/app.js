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
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRoutes from "./routes/like.routes.js";
import tweetRoutes from "./routes/tweet.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import healthcheckRoutes from "./routes/healthcheck.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRoutes);
app.use("/api/v1/tweets", tweetRoutes);
app.use("/api/v1/playlists", playlistRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/healthcheck", healthcheckRoutes);


export {app};