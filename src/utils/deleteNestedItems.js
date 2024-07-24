import {Comment} from "../models/comment.models.js";
import {Tweet} from "../models/tweet.models.js";
import {Like} from "../models/like.models.js";

const deleteNestedComment = async (parentId) => {
    const nestedItems = await Comment.find({parentComment: parentId});
    for (const nestedItem of nestedItems) {
        await deleteNestedComment(nestedItem._id);
        await Comment.findByIdAndDelete(nestedItem._id);
        await Like.deleteMany({comment: nestedItem._id});
    }
}

const deleteNestedVideoComment = async (parentId) => {
    const nestedItems = await Comment.find({video: parentId});
    for (const nestedItem of nestedItems) {
        await deleteNestedComment(nestedItem._id);
        await Comment.findByIdAndDelete(nestedItem._id);
        await Like.deleteMany({video: nestedItem._id});
    }
    await Like.deleteMany({video: parentId});
}

export {deleteNestedComment, deleteNestedVideoComment};