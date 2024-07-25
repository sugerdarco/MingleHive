import {Router} from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {
    getLikedComments,
    getLikedTweets,
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/toggle/v/:videoId").post(toggleVideoLike);

router.route("/comments").get(getLikedComments);
router.route("/tweets").get(getLikedTweets);
router.route("/videos").get(getLikedVideos);

export default router;