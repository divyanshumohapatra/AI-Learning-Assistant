import { PDFParse } from "pdf-parse";

/**
 * Extract text from PDF Buffer
 * @param {Buffer} pdfBuffer
 * @returns {Promise<{text:string,numPages:number,info:any}>}
 */
export const extractTextFromPDF = async (pdfBuffer) => {
    try {
        const parser = new PDFParse(new Uint8Array(pdfBuffer));
        const data = await parser.getText();
        return {
            text: data.text,
            numPages: data.numPages,
            info: data.info,
        };
    } catch (error) {
        console.error("PDF parsing error:", error);
        throw new Error("Failed to extract text from PDF");
    }
};