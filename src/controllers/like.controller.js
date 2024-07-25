import {asyncHandler} from "../utils/asyncHandler.js";
import {isValidObjectId} from "../utils/validate.js";
import {ApiError} from "../utils/apiError.js";
import {Comment} from "../models/comment.models.js";
import {Like} from "../models/like.models.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {Video} from "../models/video.models.js";


const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId provided");
    }

    try {
        const liked = await Like.findOneAndDelete({video: videoId, likedBy: req.user._id});
        if (liked) {
            return res.status(200).json(new ApiResponse(200, {}, "Unliked successfully."));
        }

        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Video or Video ID is invalid or missing.");
        }

        const like = await Like.create({
            video: videoId,
            likedBy: req.user._id,
        });
        return res.status(200).json(new ApiResponse(200, like, "Liked successfully."));

    } catch (err) {
        throw new ApiError(400, `Error while toggle video like ${err}.`);
    }

});
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId provided");
    }

    try {
        const liked = await Like.findOneAndDelete({comment: commentId, likedBy: req.user._id});
        if (liked) {
            return res.status(200).json(new ApiResponse(200, {}, "Unliked successfully."));
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw new ApiError(404, "Comment or Comment ID is invalid or missing.");
        }

        const like = await Like.create({
            comment: commentId,
            likedBy: req.user._id,
        });
        return res.status(200).json(new ApiResponse(200, like, "Liked successfully."));

    } catch (err) {
        throw new ApiError(400, `Error while toggle comment like ${err}.`);
    }

});
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId provided");
    }

    try {
        const liked = await Like.findOneAndDelete({tweet: tweetId, likedBy: req.user._id});
        if (liked) {
            return res.status(200).json(new ApiResponse(200, {}, "Unliked successfully."));
        }

        const tweet = await Comment.findById(tweetId);
        if (!tweet) {
            throw new ApiError(404, "Tweet or Tweet ID is invalid or missing.");
        }

        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id,
        });
        return res.status(200).json(new ApiResponse(200, like, "Liked successfully."));

    } catch (err) {
        throw new ApiError(400, `Error while toggle tweet like ${err}.`);
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const {page, limit} = req.body;

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.max(parseInt(limit, 10), 50) || 20;

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: req.user._id,
                video: {$ne: null},
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
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
                                $first: "$owner",
                            }
                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            views: 1,
                            duration: 1,
                            owner: 1
                        }
                    },
                ]
            }
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
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

    return res.status(200).json(new ApiResponse(200, likedVideos, "liked videos fetched successfully"))
});
const getLikedComments = asyncHandler(async (req, res) => {
    const {page, limit} = req.body;

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.max(parseInt(limit, 10), 50) || 20;

    const likedComments = await Like.aggregate([
        {
            $match: {
                likedBy: req.user._id,
                comment: {$ne: null},
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "comment",
                foreignField: "_id",
                as: "comment",
                pipeline: [
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
                            owner: {$first: "$owner"}
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                comment: {
                    $first: "$comment"
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

    return res.status(200).json(new ApiResponse(200, likedComments, "Liked comments fetched successfully"))
});
const getLikedTweets = asyncHandler(async (req, res) => {
    const {page, limit} = req.body;

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.max(parseInt(limit, 10), 50) || 20;

    const likedTweets = await Like.aggregate([
        {
            $match: {
                likedBy: req.user._id,
                tweet: {$ne: null},
            }
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweet",
                pipeline: [
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
                    }
                ]
            }
        },
        {
            $addFields: {
                tweet: {
                    $first: "$tweet"
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

    return res.status(200).json(new ApiResponse(200, likedTweets, "Liked Tweets fetched successfully."));
});

export {
    getLikedComments,
    getLikedVideos,
    getLikedTweets,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
}