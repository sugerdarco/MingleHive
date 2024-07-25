import mongoose from "mongoose";
import {ApiError} from "../utils/apiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {isValidObjectId, validateAssetOwnership} from "../utils/validate.js";
import {Tweet} from "../models/tweet.models.js";
import {User} from "../models/user.models.js";

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const parentTweetId = req.params.tweetId;
    if (parentTweetId && !isValidObjectId(parentTweetId) && !await Tweet.findById(parentTweetId)) {
        throw new ApiError(400, "Parent-tweet Id is invalid or not exist.");
    }
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content is required to create a tweet.");
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        parentTweet: parentTweetId || undefined,
        owner: req.user._id,
    });
    if (!tweet) {
        throw new ApiError(500, "Error while creating tweet.");
    }

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet created successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "TweetId is invalid, please provide valid tweetId.");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet || !validateAssetOwnership(tweet.owner?._id,req.user._id)) {
        throw new ApiError(403, "You don't have permission to delete tweet.");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "UserId is invalid, please provide valid userId.");
    }

    const tweetOwner = await User.findById(userId).select(['fullName', 'username', 'avatar']);
    if (!tweetOwner) {
        throw new ApiError(403, "UserId is invalid or not exist.");
    }

    const tweet = await Tweet.find({owner: userId});

    return res.status(200).json(new ApiResponse(200, {tweet, tweetOwner}, "Tweets get successfully."));
});

const getTweetComments = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    const {page, limit} = req.query;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet Id is invalid, please provide valid tweetId.");
    }

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 10, 50);

    const tweetComments = await Tweet.aggregate([
        {
            $match: {
                parentTweet: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $skip: (pageNumber - 1) * pageSize
        },
        {
            $limit: pageSize
        }
    ]);

    return res.status(200).json(new ApiResponse(200, tweetComments, "Tweet comments get successfully."));
});

export {
    createTweet,
    deleteTweet,
    getUserTweets,
    getTweetComments
}