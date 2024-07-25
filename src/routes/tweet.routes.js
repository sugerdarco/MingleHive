import {Router} from 'express';
import {verifyJWT} from "../middlewares/auth.middleware.js";
import {createTweet, deleteTweet, getTweetComments, getUserTweets} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

//here create new tweet and comment on tweet handle in same function
router.route('/').post(createTweet);
router.route('/:tweetId').post(createTweet);
router.route('/:tweetId').delete(deleteTweet);
router.route('/:userId').get(getUserTweets);
router.route('/c/:tweetId').get(getTweetComments);


export default router;