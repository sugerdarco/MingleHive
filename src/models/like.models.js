import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    },
    tweet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet',
    },
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {timestamps: true});

likeSchema.pre('validate', function (next) {
    const fields = [this.comment, this.tweet, this.video]
        .filter((field) => field !== undefined && field !== null && field !== '');

    if (fields.length !== 1) {
        next(new Error('The following fields must be associated with either comment, like or video.'));
    }
    next();
});

export const Like = mongoose.model('Like', likeSchema);