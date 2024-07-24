import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {addComment, deleteComment, getComments, updateComment} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/:videoOrCommentId").get(getComments);
router.route("/:videoOrCommentId").post(addComment);
router.route("/:commentId").patch(updateComment);
router.route("/:commentId").delete(deleteComment);

export default router;
