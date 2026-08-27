import Document from '../models/Document.js'
import Flashcard from '../models/Flashcard.js'
import ChatHistory from '../models/chatHistory.js'
import Quiz from '../models/Quiz.js'
import {extractTextFromPDF} from '../utils/pdfParser.js'
import {chunkText} from '../utils/textChunker.js';
import {generateEmbeddings} from '../utils/ai/aiProvider.js';
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
        // Save MongoDB document (status: processing)
        //--------------------------------------------------

        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.originalname,
            fileUrl: uploadedFile.url,
            publicId: uploadedFile.publicId,
            fileSize: req.file.size,
            status: "processing",
        });

        //--------------------------------------------------
        // Trigger background processing asynchronously
        //--------------------------------------------------
        processDocumentInBackground(document._id, req.file.buffer).catch(err => {
            console.error(`Initial trigger for background processing of ${document._id} failed:`, err);
        });

        //--------------------------------------------------
        // Response (202 Accepted)
        //--------------------------------------------------

        return res.status(202).json({
            success: true,
            message: "Document uploaded successfully and is being processed in the background.",
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

// Helper function to process PDF text extraction and embeddings in the background
const processDocumentInBackground = async (documentId, fileBuffer) => {
    try {
        console.log(`Starting background processing for document: ${documentId}`);

        // 1. Extract PDF text
        const { text } = await extractTextFromPDF(fileBuffer);

        if (!text || text.trim().length === 0) {
            throw new Error("Extracted text is empty");
        }

        // 2. Chunk extracted text
        const rawChunks = chunkText(text, 500, 50);

        // 3. Generate vector embeddings for chunks
        const chunkTexts = rawChunks.map(c => c.content);
        const embeddings = await generateEmbeddings(chunkTexts);

        // 4. Map embeddings to their respective chunks
        const chunks = rawChunks.map((chunk, idx) => ({
            ...chunk,
            embedding: embeddings[idx] || []
        }));

        // 5. Update MongoDB document status to ready
        await Document.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks,
            status: "ready",
        });

        console.log(`Background processing completed successfully for document: ${documentId}`);
    } catch (error) {
        console.error(`Background processing failed for document: ${documentId}:`, error);

        // Update MongoDB document status to failed
        await Document.findByIdAndUpdate(documentId, {
            status: "failed",
        });
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