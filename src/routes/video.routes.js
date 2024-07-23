import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {upload} from "../middlewares/multer.middleware.js";
import {
        deleteVideo,
        getAllVideos,
        getVideoById,
        publishVideo,
        togglePublishStatus,
        updateVideoDetails
} from "../controllers/video.controller.js";

const router = Router();
router.use(verifyJWT);

router.route("/").get(getAllVideos);

router.route("/upload").post(
    upload.fields([
        {name: "videoFile", maxCount: 1},
        {name: "thumbnail", maxCount: 1},
]), publishVideo);

router.route("/:videoId").get(getVideoById);
router.route("/:videoId").patch(upload.single("thumbnail"), updateVideoDetails);
router.route("/:videoId").delete(deleteVideo);
router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;