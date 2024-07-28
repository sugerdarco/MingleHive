import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose, {mquery} from "mongoose";
import {User} from "../models/user.models.js";
import {ApiError} from "../utils/apiError.js";
import {Subscription} from "../models/subscription.models.js";
import {Video} from "../models/video.models.js";
import {Tweet} from "../models/tweet.models.js";
import {Like} from "../models/like.models.js";
import {ApiResponse} from "../utils/apiResponse.js";

const getChannelState = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId).select(["fullName", "username", "avatar"]);
    if (!user) {
        throw new ApiError(500, "Error while getting user details.");
    }

    const totalSubscribers = await Subscription.countDocuments({channel: new mongoose.Types.ObjectId(userId)});
    const totalSubscriptions = await Subscription.countDocuments({subscriber: new mongoose.Types.ObjectId(userId)});

    const totalVideos = await Video.countDocuments({owner: new mongoose.Types.ObjectId(userId)});
    const totalTweets = await Tweet.countDocuments({owner: new mongoose.Types.ObjectId(userId)});

    const totalLikesOnVideos = await Like.countDocuments({video: new mongoose.Types.ObjectId(userId)});
    const totalLikesOnTweets = await Like.countDocuments({tweet: new mongoose.Types.ObjectId(userId)});

    const totalViews = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
                isPublish: true
            }
        },
        {
            $count: "totalViews"
        }
    ]);
    if (!totalViews) {
        throw new ApiError(500, "Error while getting total views.");
    }

    return res.status(200).json(new ApiResponse(200, {
        user,
        totalSubscribers,
        totalSubscriptions,
        totalTweets,
        totalVideos,
        totalLikesOnVideos,
        totalLikesOnTweets,
        totalViews: totalViews[0].totalViews,
    }, "channel state got successfully."));

});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const videos = await Video.find({owner: new mongoose.Types.ObjectId(userId)});
    if (!videos || videos.length === 0) {
        return res.status(200).json(new ApiError(200, "No videos found."));
    }

    return res.status(200).json(new ApiResponse(200, videos, "videos fetched successfully."));
});

export {getChannelState, getChannelVideos}