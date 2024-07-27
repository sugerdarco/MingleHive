import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {
    addVideoInPlaylist,
    createPlaylist,
    deletePlaylist,
    getAllUserPlaylists,
    getPlaylist,
    removeVideoFromPlaylist,
    updatePlaylistDetails
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);
router.route("/get-all").get(getAllUserPlaylists);
router.route("/:playlistId").get(getPlaylist);
router.route("/:playlistId").patch(updatePlaylistDetails);
router.route("/:playlistId").delete(deletePlaylist);
router.route("/:playlistId/video").patch(addVideoInPlaylist);
router.route("/:playlistId/video").delete(removeVideoFromPlaylist);


export default router;