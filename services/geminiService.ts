import {
    GoogleGenAI,
    Modality,
    GenerateContentResponse,
} from "@google/genai";
import { FilterType } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to create a more detailed error message from API response
const createErrorMessage = (response: GenerateContentResponse, defaultMessage: string): string => {
    let message = defaultMessage;
    
    if (response.promptFeedback?.blockReason) {
        message = `Prompt was blocked. Reason: ${response.promptFeedback.blockReason}.`;
        const safetyDetails = response.promptFeedback.safetyRatings?.map(rating => 
            `${rating.category.replace('HARM_CATEGORY_', '')}: ${rating.probability}`
        ).join(', ');
        if (safetyDetails) {
            message += ` Details: ${safetyDetails}`;
        }
    } else if (response.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== 'STOP') {
        message = `Generation stopped unexpectedly. Reason: ${response.candidates[0].finishReason}.`;
         const safetyDetails = response.candidates[0].safetyRatings?.map(rating => 
            `${rating.category.replace('HARM_CATEGORY_', '')}: ${rating.probability}`
        ).join(', ');
        if (safetyDetails) {
            message += ` Details: ${safetyDetails}`;
        }
    }
    
    return message;
};

export const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

export const generatePromptFromMusic = async (audioBase64: string, mimeType: string, context?: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        const contextText = context ? `\n\nHere is some additional context from the user: "${context}"` : '';
        const textPart = {
            text: `Listen to this song or instrumental music. Based on its lyrics(if any), mood, tempo, and instrumentation, create a vivid and descriptive text prompt for an AI image generator.${contextText}
            The prompt should capture the essence of the lyrics(if any), soundscape, evoking a specific scene, emotion, activity, fantasy or abstract concept.
            The prompt should also be able to capture any cultural folklore or association with any epic (if understood or found), for example:- consistent and a specific raga of a rudraveena may indicate the theme of Ravana playing Rudraveena with devotion to please Lord shiva. 
            Meanwhile an ordinary pop song with lyrics may indicate hero-heroine activity with theme and elements captured from lyrics. Dense, deep, dark grin music may indicate dystopian setting, while electric guitar tones might represent scifi or abstract theme merged with malevolent or villainous elements.
            Be creative and detailed.
            Return ONLY the generated image prompt itself, without any introductory phrases like "Here is a prompt:".`,
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        if (!response.text) {
             throw new Error(createErrorMessage(response, "Model failed to return a valid prompt from the audio."));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating prompt from music:", error);
        throw new Error(error.message || "Failed to analyze music. Please try another file.");
    }
};

export const transcribeAudioToPrompt = async (audioBase64: string, mimeType: string, context?: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        const contextText = context ? `\n\nHere is some additional context from the user: "${context}"` : '';
        const textPart = {
            text: `This is a voice recording. First, transcribe the speech into text. Then, based on the transcription, create a vivid and highly descriptive text prompt suitable for an AI image generator.${contextText} The prompt should expand on the user's words, creating a rich visual scene. Return ONLY the generated image prompt, not the transcription.`,
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });
        
        if (!response.text) {
             throw new Error(createErrorMessage(response, "Model failed to understand the recording."));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error("Error transcribing audio:", error);
        throw new Error(error.message || "Failed to understand audio. Please try recording again.");
    }
};

// FIX: Implement generateLivePrompt to create image prompts from ambient audio and user context.
export const generateLivePrompt = async (audioBase64: string, mimeType: string, context: any): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        const contextString = `
- Location: ${context.location || 'Not specified'}
- Area Type: ${context.areaType || 'Not specified'}
- Time of Day: ${context.timeOfDay || 'Not specified'}
- Current Activity: ${context.activity || 'Not specified'}
- User's Gender: ${context.gender || 'Not specified'}
- User's Age: ${context.age || 'Not specified'}`;

        const textPart = {
            text: `Listen to this short audio clip of ambient sound. Based on the sounds you hear (e.g., voices, background noise, music) and the provided context, create a vivid and descriptive text prompt for an AI image generator. The prompt should evoke a specific scene and mood that captures the essence of this moment in time.
            The final image will be in a "Raphaelite Digital Art" style, a beautiful blend of Pre-Raphaelite Brotherhood oil painting and vibrant Japanese Anime, with rich colors, high detail, clean line art, and romantic themes. Your prompt should be written to achieve this artistic style.
            
            Context: ${contextString}

            Return ONLY the generated image prompt itself, without any introductory phrases. The prompt should be a single, detailed paragraph.`,
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        if (!response.text) {
             throw new Error(createErrorMessage(response, "Model failed to generate a live prompt from the audio."));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating live prompt:", error);
        throw new Error(error.message || "Failed to analyze live audio. Please try again.");
    }
};

// FIX: Implement generateSummaryMarkdown to create a narrative summary from a series of prompts.
export const generateSummaryMarkdown = async (prompts: string[], context: any): Promise<string> => {
    try {
        const contextString = `
- Location: ${context.location || 'Not specified'}
- Area Type: ${context.areaType || 'Not specified'}
- Time of Day: ${context.timeOfDay || 'Not specified'}
- Current Activity: ${context.activity || 'Not specified'}
- User's Gender: ${context.gender || 'Not specified'}
- User's Age: ${context.age || 'Not specified'}`;
        
        const promptsString = prompts.map((p, i) => `${i + 1}. "${p}"`).join('\n');

        const textPart = {
            text: `You are a creative writer. I will provide you with a sequence of image generation prompts that were created from audio captured over a period of time. I will also provide the initial context for the recording session. Your task is to weave these prompts into a short, cohesive, and evocative story or journal entry in Markdown format.

The story should flow logically, connecting the scenes described in the prompts. Imagine you are describing a journey or a sequence of events. Use the context to frame the narrative.

Initial Context:
${contextString}

Sequence of Prompts:
${promptsString}

Create a compelling narrative that connects these moments. Use Markdown for formatting (e.g., # Title, **bold**, *italics*). The tone should be reflective and artistic. Start with a suitable title.`,
        };
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
        });

        if (!response.text) {
             throw new Error(createErrorMessage(response, "Model failed to generate a summary."));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating summary:", error);
        throw new Error(error.message || "Failed to generate summary. Please try again.");
    }
};

const formatPromptWithFilter = (prompt: string, filter: FilterType): string => {
    if (filter === 'unspecified') return prompt;
    
    // Special handling for more descriptive filters
    const filterStyles: Record<FilterType, string> = {
        'unspecified': '',
        'photorealistic': 'ultra photorealistic style, hyper-detailed, hyper ultra realistic, real vision, realistic texture, 8k',
        'Anime': 'vibrant anime style, clean line art, cel shaded',
        'cartoon': 'charming cartoon style, bold outlines, simple shapes',
        'ink sketch': 'black and white ink sketch style, cross-hatching, expressive lines',
        'black & white': 'monochromatic black and white, dramatic lighting, high contrast',
        'color pop': 'mostly black and white with a single subject in vibrant color, selective color',
        'water color': 'soft watercolor painting style, blended colors, wet-on-wet technique',
        'raphaelite oil painting': 'Pre-Raphaelite Brotherhood oil painting style, rich colors, high detail, romantic themes',
        'raphaelite-digital-art': 'A beautiful blend of Pre-Raphaelite Brotherhood oil painting and vibrant Japanese Anime, creating a unique "Raphaelite Digital Art" look with rich colors, high detail, clean line art, and romantic themes.',
        'dark fantasy': 'dark fantasy digital art, epic scale, moody lighting, style of ArtStation and DeviantArt',
        'game art': 'AAA game art style, Unreal Engine rendering, detailed character model, dynamic pose',
        'comic cover': 'dynamic comic book cover art, bold inks, graphic style, vibrant colors',
    };

    return `${prompt.trim()}. Style: ${filterStyles[filter]}.`;
};

export const generateImage = async (prompt: string, filter: FilterType): Promise<string> => {
    try {
        const finalPrompt = formatPromptWithFilter(prompt, filter);
        const textPart = { text: finalPrompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates || response.candidates.length === 0) {
             throw new Error(createErrorMessage(response, "No image was generated. The prompt may have been rejected."));
        }

        const candidate = response.candidates[0];

        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }
        
        throw new Error(createErrorMessage(response, "The model generated a response, but it did not contain image data."));
    } catch (error: any) {
        console.error("Error generating image:", error);
        throw new Error(error.message || "Failed to generate image due to an unknown error.");
    }
};

export const editImage = async (
    imageBase64: string, 
    imageMimeType: string, 
    prompt: string,
    filter: FilterType,
    remixImage?: { base64: string; mimeType: string }
): Promise<string> => {
    try {
        const finalPrompt = formatPromptWithFilter(prompt, filter);
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: imageMimeType,
            },
        };
        const textPart = { text: finalPrompt };
        
        const parts: any[] = [imagePart, textPart];

        if (remixImage) {
            parts.push({
                inlineData: {
                    data: remixImage.base64,
                    mimeType: remixImage.mimeType,
                },
            });
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates || response.candidates.length === 0) {
             throw new Error(createErrorMessage(response, "No image was generated from the edit."));
        }

        const candidate = response.candidates[0];

        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }

        throw new Error(createErrorMessage(response, "Edit did not produce an image."));
    } catch (error: any) {
        console.error("Error editing image:", error);
        throw new Error(error.message || "Failed to edit image. Please try a different edit prompt.");
    }
};


export const generatePromptFromAudioSegment = async (audioBase64: string, mimeType: string, segmentNumber: number, totalSegments: number): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: `This is audio segment ${segmentNumber} of ${totalSegments} from a longer audio story. Listen carefully to this segment.
            Based on the dialogue, sound effects, and music, create a vivid and descriptive text prompt for an AI image generator.
            The prompt should capture the key scene, characters, emotions, and actions happening in THIS specific part of the story.
            Focus only on what you hear in this segment.
            Return ONLY the generated image prompt itself, without any introductory phrases.`,
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        if (!response.text) {
             throw new Error(createErrorMessage(response, `Model failed to generate a prompt for segment ${segmentNumber}.`));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error(`Error generating prompt for segment ${segmentNumber}:`, error);
        throw new Error(error.message || `Failed to analyze segment ${segmentNumber}.`);
    }
};

export const generateStorySummaryFromAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    try {
        const audioPart = {
            inlineData: {
                data: audioBase64,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: `Listen to this entire audio recording, which is an audio story.
            Your task is to create a compelling, short summary of the story.
            Capture the main plot points, characters, and the overall theme or moral of the story.
            Format the output as a Markdown document. Start with a suitable title for the story using a markdown heading.`,
        };
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
        });

        if (!response.text) {
             throw new Error(createErrorMessage(response, "Model failed to generate a summary for the story."));
        }
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating story summary:", error);
        throw new Error(error.message || "Failed to generate story summary.");
    }
};