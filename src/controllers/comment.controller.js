import mongoose from "mongoose";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import {Comment} from "../models/comment.models.js";
import {deleteNestedComment} from "../utils/deleteNestedItems.js";
import {isValidObjectId, validateAssetOwnership} from "../utils/validate.js";
import {Like} from "../models/like.models.js";
import {Video} from "../models/video.models.js";


const getComments = asyncHandler(async (req, res) => {
    const {videoOrCommentId} = req.params;
    const {page, limit} = req.query;
    if (!isValidObjectId(videoOrCommentId)) {
        throw new ApiError(400, "Video or Comment ID is invalid or missing.");
    }

    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = Math.min(parseInt(limit, 10) || 10, 100);

    const videoOrComment = await Comment.findById(videoOrCommentId);
    if (!videoOrComment) {
        throw new ApiError(404, "Video or Comment ID does not available.");
    }

    const comments = await Comment.aggregate([
        {
            $match: {$or: [
                    {video: new mongoose.Types.ObjectId(videoOrCommentId)},
                    {parentComment: new mongoose.Types.ObjectId(videoOrCommentId)},
                ]
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
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $skip: (pageNumber - 1) * pageSize
        },
        {
            $limit: pageSize
        }
    ]);

    return res.status(200).json(new ApiResponse(200, comments, "Comments fetched successfully."));
});

const addComment = asyncHandler(async (req, res) => {
    const {videoOrCommentId} = req.params;
    const {content} = req.body;
    if (!isValidObjectId(videoOrCommentId) || !content.trim()) {
        throw new ApiError(400, "Video or Comment ID and content is Invalid or empty.");
    }

    const commentOnVideo = await Video.findById(videoOrCommentId);
    const commentOnComment = await Comment.findById(videoOrCommentId);

    const comment = await Comment.create({
        content: content.trim(),
        video: commentOnVideo?._id,
        parentComment: commentOnComment?._id,
        owner: req.user._id,
    });

    return res.status(200).json(new ApiResponse(200, comment, "Comment successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;
    if (!isValidObjectId(commentId) || !content.trim()) {
        throw new ApiError(400, "Video or Comment ID and content is Invalid or empty.");
    }

    const comment = await Comment.findById(commentId);
    if (!validateAssetOwnership(comment.owner._id, req.user._id)) {
        throw new ApiError(403, "You don't have permission to update comment.");
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {content: content.trim()}, {new: true, upsert: false});
    if (!updatedComment) {
        return new ApiError(501,"Error while updating comment.");
    }

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully."));
});

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Video or Comment ID is missing or Invalid.");
    }

    const comment = await Comment.findById(commentId);
    if (!validateAssetOwnership(comment.owner._id, req.user._id)) {
        throw new ApiError(403, "You don't have permission to delete comment.");
    }

    try {
        //delete nested comment and like
        await deleteNestedComment(commentId);
        await Comment.findByIdAndDelete(commentId);
        await Like.deleteMany({comment: commentId});

        return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully."));
    } catch (err) {
        throw new ApiError(500, "Error while deleting comment.");
    }
});

export {getComments, addComment, updateComment, deleteComment};