import { gemini } from "../../config/gemini.js";
import groq from "../../config/groq.js";
import { retry } from "./retry.js";
import { PROVIDERS } from "./providerConfig.js";

async function callGemini(prompt, model) {
    const response = await retry(() =>
        gemini.models.generateContent({
            model,
            contents: prompt,
        })
    );
    return response.text;
}

async function callGroq(prompt, model) {
    const response = await retry(() =>
        groq.chat.completions.create({
            model,
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        })
    );
    return response.choices[0].message.content;
}


const providerCallers = {
    Gemini: callGemini,
    Groq: callGroq,
};


export async function generateText(prompt) {
    let lastError;
    for (const provider of PROVIDERS) {
        const caller = providerCallers[provider.name];
        if (!caller)
            continue;
        console.log(
            `\n========== ${provider.name} ==========\n`
        );

        for (const model of provider.models) {
            try {
                console.log(
                    `Trying ${provider.name} (${model})`
                );
                const result = await caller(prompt, model);
                console.log(
                    `${provider.name} (${model}) succeeded`
                );
                return result;
            } catch (error) {
                console.log(
                    `${provider.name} (${model}) failed`
                );
                lastError = error;
            }
        }
    }

    throw lastError;
}

export async function generateEmbeddings(texts) {
    if (!texts || (Array.isArray(texts) && texts.length === 0)) return [];

    const isArrayInput = Array.isArray(texts);
    const inputArray = isArrayInput ? texts : [texts];

    const batchSize = 50;
    const results = [];

    for (let i = 0; i < inputArray.length; i += batchSize) {
        const batch = inputArray.slice(i, i + batchSize);
        const response = await retry(() =>
            gemini.models.embedContent({
                model: 'gemini-embedding-001',
                contents: batch,
            })
        );

        if (response.embedding) {
            results.push(response.embedding.values);
        } else if (response.embeddings) {
            results.push(...response.embeddings.map(e => e.values));
        }
    }

    return isArrayInput ? results : results[0];
}