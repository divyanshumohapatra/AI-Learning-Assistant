import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
{
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true,
    },

    title:{
        type:String,
        required:[true,"Please provide a document title"],
        trim:true,
    },

    fileName:{
        type:String,
        required:true,
    },

    fileUrl:{
        type:String,
        required:true,
    },

    publicId:{
        type:String,
        required:true,
        index:true,
    },

    fileSize:{
        type:Number,
        required:true,
    },

    extractedText:{
        type:String,
        default:"",
    },

    chunks:[
        {
            content:{
                type:String,
                required:true,
            },

            pageNumber:{
                type:Number,
                required:true,
            },

            embedding:{
                type:[Number],
                default:[],
            },
        },
    ],

    lastAccessed:{
        type:Date,
        default:Date.now,
    },

    status:{
        type:String,
        enum:["processing","ready","failed"],
        default:"ready",
    },

},
{
    timestamps:true,
}
);

documentSchema.index({
    userId:1,
    createdAt:-1,
});

documentSchema.index({
    userId:1,
    title:1,
});

const Document=mongoose.model(
    "Document",
    documentSchema
);

export default Document;