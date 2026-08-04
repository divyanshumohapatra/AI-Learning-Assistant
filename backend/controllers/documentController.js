import Document from '../models/Document.js'
import Flashcard from '../models/Flashcard.js'
import ChatHistory from '../models/chatHistory.js'
import Quiz from '../models/Quiz.js'
import {extractTextFromPDF} from '../utils/pdfParser.js'
import {chunkText} from '../utils/textChunker.js';
import mongoose from 'mongoose';
import cloudinary from "../config/cloudinary.js";
import { uploadFileToCloudinary } from "../utils/cloudinaryUpload.js";
// @desc   Upload PDF document
// @route  POST /api/documents/upload
// @access Private

export const uploadDocument = async (req, res, next) => {

    let uploadedFile = null;

    try {

        //--------------------------------------------------
        // Validate file
        //--------------------------------------------------

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Please upload a PDF file.",
                statusCode: 400,
            });
        }

        //--------------------------------------------------
        // Validate title
        //--------------------------------------------------

        const title = req.body.title?.trim();

        if (!title) {
            return res.status(400).json({
                success: false,
                error: "Please provide a document title.",
                statusCode: 400,
            });
        }

        //--------------------------------------------------
        // Extract PDF text
        //--------------------------------------------------

        const { text } = await extractTextFromPDF(req.file.buffer);

        //--------------------------------------------------
        // Chunk extracted text
        //--------------------------------------------------

        const chunks = chunkText(text, 500, 50);

        //--------------------------------------------------
        // Upload original PDF to Cloudinary
        //--------------------------------------------------

        uploadedFile = await uploadFileToCloudinary(
            req.file.buffer,
            {
                folder: "documents",
                resourceType: "raw",
                originalName: req.file.originalname,
            }
        );

        //--------------------------------------------------
        // Save MongoDB document
        //--------------------------------------------------

        const document = await Document.create({

            userId: req.user._id,

            title,

            fileName: req.file.originalname,

            fileUrl: uploadedFile.url,

            publicId: uploadedFile.publicId,

            fileSize: req.file.size,

            extractedText: text,

            chunks,

            status: "ready",

        });

        //--------------------------------------------------
        // Response
        //--------------------------------------------------

        return res.status(201).json({

            success: true,

            message: "Document uploaded successfully.",

            data: document,

        });

    } catch (error) {

        //--------------------------------------------------
        // Rollback Cloudinary upload
        //--------------------------------------------------

        if (uploadedFile?.publicId) {

            try {

                await cloudinary.uploader.destroy(
                    uploadedFile.publicId,
                    {
                        resource_type: "raw",
                    }
                );

            } catch (rollbackError) {

                console.error(
                    "Cloudinary rollback failed:",
                    rollbackError
                );

            }

        }

        next(error);

    }

};

// @desc.   Get all user documents
// @route.  GET /api/documents
// @access  Private

export const getDocuments = async (req, res, next) => {
    try {

        const documents = await Document.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user._id),
                },
            },

            {
                $lookup: {
                    from: "flashcards",
                    localField: "_id",
                    foreignField: "documentId",
                    as: "flashcardSets",
                },
            },

            {
                $lookup: {
                    from: "quizzes",
                    localField: "_id",
                    foreignField: "documentId",
                    as: "quizzes",
                },
            },

            {
                $addFields: {
                    flashcardCount: {
                        $size: "$flashcardSets",
                    },

                    quizCount: {
                        $size: "$quizzes",
                    },
                },
            },

            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashcardSets: 0,
                    quizzes: 0,
                },
            },

            {
                $sort: {
                    createdAt: -1,
                },
            },
        ]);

        return res.status(200).json({
            success: true,
            count: documents.length,
            data: documents,
        });

    } catch (error) {
        next(error);
    }
};


// @desc.   Get single document
// @route.  GET /api/documents/:id
// @access  Private

export const getDocument = async (req, res, next) => {
    try {

        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: "Document not found",
                statusCode: 404,
            });
        }

        const [flashCardCount, quizCount] = await Promise.all([

            Flashcard.countDocuments({
                documentId: document._id,
                userId: req.user._id,
            }),

            Quiz.countDocuments({
                documentId: document._id,
                userId: req.user._id,
            }),

        ]);

        document.lastAccessed = new Date();

        await document.save();

        const documentData = document.toObject();

        documentData.flashCardCount = flashCardCount;
        documentData.quizCount = quizCount;

        return res.status(200).json({
            success: true,
            data: documentData,
        });

    } catch (error) {
        next(error);
    }
};

// @desc.   Delete Document
// @route.  DELETE /api/documents/:id
// @access  Private

export const deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!document) {
            return res.status(404).json({
                success: false,
                error: "Document not found",
                statusCode: 404,
            });
        }

        await Promise.all([
            cloudinary.uploader.destroy(document.publicId, {
                resource_type: "raw",
            }),
            Flashcard.deleteMany({
                documentId: document._id,
            }),
            Quiz.deleteMany({
                documentId: document._id,
            }),
            ChatHistory.deleteMany({
                documentId: document._id,
            }),
        ]);
        await document.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Document deleted successfully.",
        });
    } catch (error) {
        next(error);
    }

};

// @desc.   Update Document title
// @route.  PUT /api/documents/:id
// @access  Private

// export const updateDocument = async(req, res, next) =>{
// try {
        
//     } catch (error) {
//         next(error);
//     }
// };