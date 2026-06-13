/**
 * Split text into chunks for better AI Processing
 * @param {string} text - input text to be chunked
 * @param {number} chunkSize - size of each chunk in characters
 * @param {number} overlap - number of overlapping characters between chunks
 * @returns {Array<{content: string, chunkIndex:number, pageNumber: number}}
 */

export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    if(!text || text.trim().length===0)
    {
        return [];
    }


    // Clean text while preserving paragraph structure
    const cleanedText = text
        .replace(/\r\n/g, '\n') // Normalize newlines
        .replace(/\s+/g, ' ')
        .replace(/\n /g, '\n') // Preserve paragraphs
        .replace(/ \n/g, '\n') // Preserve paragraphs
        .trim();

    //Try to split the paragraphs (single or double newlines)
    const paragraphs = cleanedText.split(/\n+/).filter(p=>p.trim().length>0);

    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for(const paragraph of paragraphs){
        const paragraphWords = paragraph.trim().split(/\s+/);
        const paragraphWordCount = paragraphWords.length;

        // If single paragrpah exceeds chunk size, split it by words
        if(paragraphWordCount > chunkSize){
            if(currentChunk.length > 0){
                chunks.push({
                    content: currentChunk.join('\n\n'),
                    chunkIndex: chunkIndex++,
                    pageNumber: 0, // Page number can be set if available from PDF metadata
                });
                currentChunk = [];
                currentWordCount = 0;
            }
        }

        // Split large paragraph into word-based chunks

        for(let i=0; i<paragraphWordCount; i+=chunkSize - overlap){
            const chunkWords = paragraphWords.slice(i, i + chunkSize);
            chunks.push({
                content: chunkWords.join(' '),
                chunkIndex: chunkIndex++,
                pageNumber: 0, // Page number can be set if available from PDF metadata
            });

            if(i+chunkSize >= paragraphWords.length)
                break;
            
        }

    }

    return chunks;
};

/** Find relevant chunks based on keyword matching 
 * @param {Array<Object>} chunks - Array of chunks
 * @param {string} query - Search query
 * @param {number} maxChunks - Maximum chunks to return
 * @returns {Array<Object>} - Relevant chunks sorted by relevance
 */

export const findRelevantChunks = (chunks, query, maxChunks=3)=>{
    if(!chunks || chunks.length==0 || !query){
        return [];
    }

    // Common stop words to exclude
    const stopWords = new Set([
        'the','is','at','which','on','a','an','and','or','but',
        'in','with','to','for','of','as','by','this','that','it'
    ]);

    // Extract and clean query words
    const queryWords = query
        .toLowerCase() 
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word)); // Filter out short and stop words

    if(queryWords.length === 0){
        //Return clean chunk objects without mongoose MetaData
        return chunks.slice(0, maxChunks).map(chunk=>({
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id:chunk._id
        }));
    }   

    const scoredChunks = chunks.map((chunk, index)=>{
        const content = chunk.content.toLowerCase();
        const contentWords = content.split(/\s+/).length;
        let score = 0;

        //Score each query word
        for(const word of queryWords){
            // Exact word match (higher score)
            const exactMatches = (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
            score += exactMatches * 3;

            // Partial match (lower score)
            const partialMatches = (content.match(new RegExp(word, 'g')) || []).length;
            score += Math.max(0, partialMatches-exactMatches) * 1.5;
        }

        // Bonus: Multiple query words found
        const uniqueWordsFound = queryWords.filter(word=>
            content.includes(word)
        ).length;
        if(uniqueWordsFound>1){
            score += uniqueWordsFound*2
        }

        // Normalize by content length
        const normalizedScore = score / Math.sqrt(contentWords);

        // Small bonus for earlier chunks (assuming they might be more relevant)
        const positionBonus = 1 - (index / chunks.length)*0.1;
        
        // Return clean object without mongoose metadata
        return {
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            _id:chunk._id,
            score: normalizedScore * positionBonus,
            rawScore: score, 
            matchedWords: uniqueWordsFound
        };
    });

    return scoredChunks
        .filter(chunk => chunk.score > 0)
        .sort((a,b)=>{
            if(b.score !== a.score){
                return b.score - a.score; // Sort by relevance score
            }

            if(b.matchedWords !== a.matchedWords){
                return b.matchedWords - a.matchedWords; // Then by number of matched words
            }

            return a.chunkIndex - b.chunkIndex; // Then by original order
        })
        .slice(0, maxChunks)
};