import mongoose from 'mongoose';
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video',
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {timestamps: true});

commentSchema.plugin(mongooseAggregatePaginate);

commentSchema.pre('validate', function (next) {
    if ((this.video && this.parentComment) || (!this.video && !this.parentComment)) {
        next(new Error('A comment must be associated with either a video or a comment, not both or neither.'));
    } else {
        next ();
    }
});

export const Comment = mongoose.model('Comment', commentSchema);