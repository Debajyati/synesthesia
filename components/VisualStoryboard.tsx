import React, { useState, useRef } from 'react';
import * as geminiService from '../services/geminiService';
import { ImageData } from '../types';
import Loader from './Loader';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '../constants';

// Expose JSZip to TypeScript
declare const JSZip: any;

type StoryboardState = 'IDLE' | 'PROCESSING' | 'FINISHED' | 'ERROR';
const MIN_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

interface StoryboardImage extends ImageData {
    fileName: string;
}

const VisualStoryboard: React.FC = () => {
    const [storyboardState, setStoryboardState] = useState<StoryboardState>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [images, setImages] = useState<StoryboardImage[]>([]);
    const [summary, setSummary] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStoryboardState('IDLE');
        setError(null);
        setProgressMessage('');
        setImages([]);
        setSummary('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getAudioDuration = (file: File): Promise<number> => {
        return new Promise((resolve, reject) => {
            const audio = document.createElement('audio');
            const objectUrl = URL.createObjectURL(file);
            audio.src = objectUrl;
            audio.addEventListener('loadedmetadata', () => {
                URL.revokeObjectURL(objectUrl);
                resolve(audio.duration);
            });
            audio.addEventListener('error', (e) => {
                 URL.revokeObjectURL(objectUrl);
                reject('Could not read audio file metadata.');
            });
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = async (file: File) => {
        resetState();

        if (file.size < MIN_FILE_SIZE) {
            setError(`File is too small. Minimum size is 1MB.`);
            setStoryboardState('ERROR');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            setStoryboardState('ERROR');
            return;
        }

        setStoryboardState('PROCESSING');
        setProgressMessage('Analyzing audio duration...');

        try {
            const duration = await getAudioDuration(file);
            
            let numSegments;
            if (duration >= 30 * 60) numSegments = 7;
            else if (duration > 5 * 60) numSegments = 5;
            else if (duration > 2 * 60) numSegments = 4;
            else numSegments = 3;

            const segments: Blob[] = [];
            const segmentSize = Math.floor(file.size / numSegments);
            for (let i = 0; i < numSegments; i++) {
                const start = i * segmentSize;
                const end = (i === numSegments - 1) ? file.size : start + segmentSize;
                segments.push(file.slice(start, end, file.type));
            }

            const generatedImages: StoryboardImage[] = [];
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const segmentNumber = i + 1;

                setProgressMessage(`[${segmentNumber}/${numSegments}] Analyzing audio segment...`);
                const audioBase64 = await geminiService.fileToBase64(segment);
                const prompt = await geminiService.generatePromptFromAudioSegment(audioBase64, file.type, segmentNumber, numSegments);

                setProgressMessage(`[${segmentNumber}/${numSegments}] Generating image...`);
                const imageBase64 = await geminiService.generateImage(prompt, 'raphaelite-digital-art');

                const newImage: StoryboardImage = {
                    id: Date.now() + i,
                    base64: imageBase64,
                    prompt,
                    fileName: `scene_${String(segmentNumber).padStart(2, '0')}.jpg`
                };
                generatedImages.push(newImage);
                setImages([...generatedImages]);
            }

            setProgressMessage('Generating story summary...');
            const fullAudioBase64 = await geminiService.fileToBase64(file);
            const storySummary = await geminiService.generateStorySummaryFromAudio(fullAudioBase64, file.type);
            setSummary(storySummary);
            
            setProgressMessage('');
            setStoryboardState('FINISHED');
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during processing.');
            setStoryboardState('ERROR');
        }
    };

    const handleDownload = async () => {
        setProgressMessage('Preparing your download...');
        try {
            const zip = new JSZip();
            zip.file("story_summary.md", summary);
            const imgFolder = zip.folder("storyboard_images");

            for (const image of images) {
                 imgFolder!.file(image.fileName, image.base64, { base64: true });
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = "visual_storyboard.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(err: any) {
            setError("Failed to create ZIP file. " + err.message);
        } finally {
            setProgressMessage('');
        }
    };
    
    if (storyboardState === 'IDLE' || storyboardState === 'ERROR') {
        return (
            <div className="w-full max-w-2xl text-center">
                <div className="card w-full bg-base-200 shadow-xl p-6 md:p-8 space-y-4">
                    <h2 className="text-xl font-bold">Create a Visual Storyboard</h2>
                    <p className="text-sm text-neutral-content/70">Upload an audio story, and AI will generate a sequence of images to visualize the narrative.</p>
                    {error && (
                         <div role="alert" className="alert alert-error">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                            <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Close</button>
                        </div>
                    )}
                    <div className="form-control items-center">
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="audio/*"
                            className="hidden"
                        />
                        <button className="btn btn-primary btn-wide" onClick={() => fileInputRef.current?.click()}>
                            <UploadIcon />
                            Upload Audio Story
                        </button>
                        <p className="text-xs text-neutral-content/50 mt-2">Accepted formats: MP3, WAV, WEBM, etc. (1MB - {MAX_FILE_SIZE_MB}MB)</p>
                    </div>
                </div>
            </div>
        )
    }

    if (storyboardState === 'PROCESSING') {
        return (
            <div className="w-full max-w-4xl flex flex-col items-center">
                <Loader message={progressMessage} />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4 w-full">
                    {images.map(img => (
                        <img 
                            key={img.id} 
                            src={`data:image/jpeg;base64,${img.base64}`}
                            alt={img.prompt}
                            className="rounded-lg shadow-lg aspect-square object-cover animate-fade-in"
                        />
                    ))}
                </div>
            </div>
        )
    }

    if (storyboardState === 'FINISHED') {
        return (
            <div className="w-full max-w-5xl flex flex-col items-center animate-fade-in">
                <h2 className="text-3xl font-bold font-orbitron mb-2">Your Storyboard is Ready</h2>
                
                <div className="w-full my-4 p-4 bg-base-200 rounded-box">
                    <h3 className="text-lg font-bold mb-2">Story Summary</h3>
                    <div className="prose prose-sm max-w-none max-h-48 overflow-y-auto bg-base-100 p-3 rounded-md whitespace-pre-wrap">{summary}</div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                    {images.map(img => (
                        <div key={img.id} className="card bg-base-200 shadow-lg group relative">
                            <img src={`data:image/jpeg;base64,${img.base64}`} alt={img.prompt} className="w-full h-auto object-cover rounded-lg aspect-square"/>
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 rounded-lg">
                                <p className="text-xs text-base-content-secondary text-white text-center line-clamp-6">{img.prompt}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                {progressMessage && <p className="animate-pulse my-4">{progressMessage}</p>}
                {error && <p className="text-error my-4">{error}</p>}
                
                <div className="flex gap-4 mt-8">
                    <button className="btn btn-ghost" onClick={resetState}>Start New Storyboard</button>
                    <button className="btn btn-primary" onClick={handleDownload} disabled={!!progressMessage}>
                        <DownloadIcon /> Download as .zip
                    </button>
                </div>
            </div>
        )
    }

    return null;
};

export default VisualStoryboard;