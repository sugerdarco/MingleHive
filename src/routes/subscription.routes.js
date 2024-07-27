import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {getSubscribedChannels, getSubscribers, toggleSubscription} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/c/:channelId").post(toggleSubscription);
router.route("/subscribers").get(getSubscribers);
router.route("/channels").get(getSubscribedChannels);

export default router;