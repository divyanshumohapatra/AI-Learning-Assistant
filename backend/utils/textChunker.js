/**
 * Split text into chunks for better AI processing.
 *
 * Chunks are created based on WORD COUNT (not characters).
 *
 * @param {string} text - Input text
 * @param {number} chunkSize - Maximum words per chunk
 * @param {number} overlap - Number of overlapping words
 * @returns {Array<{content:string, chunkIndex:number, pageNumber:number}>}
 */

export const chunkText = (
    text,
    chunkSize = 500,
    overlap = 50
) => {
    if (!text || !text.trim()) {
        return [];
    }

    // Normalize text
    const cleanedText = text
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const paragraphs = cleanedText
        .split(/\n+/)
        .map(p => p.trim())
        .filter(Boolean);

    const chunks = [];

    let currentWords = [];
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {

        const words = paragraph.split(/\s+/);

        // Large paragraph
        if (words.length > chunkSize) {

            // Flush current chunk first
            if (currentWords.length) {
                chunks.push({
                    content: currentWords.join(" "),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });

                currentWords = [];
            }

            // Split large paragraph
            for (let i = 0;i < words.length;i += chunkSize - overlap) {

                chunks.push({
                    content: words
                        .slice(i, i + chunkSize)
                        .join(" "),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0
                });
                if (i + chunkSize >= words.length)
                    break;
            }

            continue;
        }

        // If paragraph fits in current chunk
        if (currentWords.length + words.length <= chunkSize) {
            currentWords.push(...words);
        }
        else {

            // Save previous chunk
            chunks.push({
                content: currentWords.join(" "),
                chunkIndex: chunkIndex++,
                pageNumber: 0
            });

            // Create overlap
            const overlapWords =
                overlap > 0
                    ? currentWords.slice(-overlap)
                    : [];

            currentWords = [...overlapWords, ...words];
        }
    }

    // Remaining chunk
    if (currentWords.length) {
        chunks.push({
            content: currentWords.join(" "),
            chunkIndex: chunkIndex++,
            pageNumber: 0
        });
    }

    return chunks;
};


/**
 * Escape regex special characters
 */
const escapeRegex = (text) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


/**
 * Find relevant chunks using keyword matching.
 *
 * @param {Array<Object>} chunks
 * @param {string} query
 * @param {number} maxChunks
 * @returns {Array<Object>}
 */

export const findRelevantChunks = (
    chunks,
    query,
    maxChunks = 3
) => {

    if (!chunks?.length || !query?.trim()) {
        return [];
    }

    const stopWords = new Set([
        "the","is","at","which","on","a","an","and","or","but",
        "in","with","to","for","of","as","by","this","that","it",
        "are","was","were","be","has","have","had","from"
    ]);

    const queryWords = query
        .toLowerCase()
        .split(/\s+/)
        .map(w => w.replace(/[^\w]/g, ""))
        .filter(
            w =>
                w.length > 2 &&
                !stopWords.has(w)
        );

    if (!queryWords.length) {
        return chunks.slice(0, maxChunks);
    }

    const scoredChunks = chunks.map((chunk, index) => {

    // Convert Mongoose subdocument to plain object
    const plainChunk =
        typeof chunk.toObject === "function"
            ? chunk.toObject()
            : chunk;
        
        const content = plainChunk.content.toLowerCase();
        const wordCount = content.split(/\s+/).length;
        let score = 0;
        let matchedWords = 0;

        for (const word of queryWords) {
            const escaped = escapeRegex(word);
            const exact =
                (
                    content.match(
                        new RegExp(`\\b${escaped}\\b`, "g")
                    ) || []
                ).length;
            const partial =
                (
                    content.match(
                        new RegExp(escaped, "g")
                    ) || []
                ).length;
            if (exact || partial)
                matchedWords++;

            score += exact * 3;
            score += Math.max(0, partial - exact) * 1.5;
        }

        if (matchedWords > 1) {
            score += matchedWords * 2;
        }

        score /= Math.sqrt(wordCount);
        score *= (1 - index * 0.001);
        return {
            ...plainChunk,
            score,
            matchedWords
        };
    });

    return scoredChunks
        .filter(c => c.score > 0)
        .sort((a, b) => {

            if (b.score !== a.score)
                return b.score - a.score;

            if (b.matchedWords !== a.matchedWords)
                return b.matchedWords - a.matchedWords;

            return a.chunkIndex - b.chunkIndex;
        })
        .slice(0, maxChunks);
};


/**
 * Compute cosine similarity between two vectors.
 *
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number}
 */
export const cosineSimilarity = (vecA, vecB) => {
    if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) {
        return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};


/**
 * Retrieve semantically relevant chunks.
 *
 * @param {Array<Object>} chunks
 * @param {Array<number>} queryEmbedding
 * @param {number} maxChunks
 * @returns {Array<Object>}
 */
export const findSemanticChunks = (chunks, queryEmbedding, maxChunks = 3) => {
    if (!chunks?.length || !queryEmbedding?.length) {
        return [];
    }

    const scoredChunks = chunks.map((chunk) => {
        const plainChunk = typeof chunk.toObject === 'function' ? chunk.toObject() : chunk;
        const score = cosineSimilarity(plainChunk.embedding, queryEmbedding);
        return {
            ...plainChunk,
            score
        };
    });

    return scoredChunks
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.chunkIndex - b.chunkIndex;
        })
        .slice(0, maxChunks);
};