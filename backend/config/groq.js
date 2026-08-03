import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not found. Groq fallback disabled.");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export default groq;