import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { ImageData } from '../types';
import StopIcon from './icons/StopIcon';
import PlayIcon from './icons/PlayIcon';
import DownloadIcon from './icons/DownloadIcon';
import Loader from './Loader';

// Expose JSZip to TypeScript
declare const JSZip: any;

type LiveState = 'CONFIG' | 'RECORDING' | 'GENERATING' | 'FINISHED' | 'ERROR';
type GenerationMode = 'count' | 'duration';

interface LiveImageData extends ImageData {
    fileName: string;
}

const LiveSynesthesia: React.FC = () => {
    const [liveState, setLiveState] = useState<LiveState>('CONFIG');
    const [error, setError] = useState<string | null>(null);

    // Config State
    const [context, setContext] = useState({
        location: '', areaType: 'Urban', timeOfDay: 'Afternoon',
        activity: '', gender: 'Prefer not to say', age: ''
    });
    const [generationMode, setGenerationMode] = useState<GenerationMode>('count');
    const [imageCount, setImageCount] = useState<number>(5);
    const [duration, setDuration] = useState<number>(1); // in minutes
    const [interval, setIntervalValue] = useState<number>(15); // in seconds

    // Recording State
    const [generatedImages, setGeneratedImages] = useState<LiveImageData[]>([]);
    const [currentStatus, setCurrentStatus] = useState('');
    const [countdown, setCountdown] = useState(interval);
    
    // FIX: Replace NodeJS.Timeout with ReturnType<typeof setInterval> for browser compatibility.
    // The NodeJS.Timeout type is not available in browser environments, which causes a TypeScript error.
    // ReturnType<typeof setInterval> correctly infers the return type of setInterval (which is `number` in browsers).
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const isProcessingRef = useRef(false);

    const totalImagesToGenerate = generationMode === 'count' ? imageCount : Math.floor((duration * 60) / interval);

    const startLiveRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.start(1000); // Collect data in chunks
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone. Please ensure permissions are granted and refresh the page.");
            setLiveState('ERROR');
        }
    }, []);

    const stopLiveRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        intervalRef.current = null;
        countdownRef.current = null;
    }, []);


    const processAudioChunk = async () => {
        if (isProcessingRef.current || audioChunksRef.current.length === 0) return;
        
        isProcessingRef.current = true;
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = []; // Clear chunks for the next interval

        if (audioBlob.size < 1024) { // 1KB minimum to avoid sending empty/header-only files
            console.log(`Skipping audio chunk due to small size: ${audioBlob.size} bytes`);
            isProcessingRef.current = false;
            return;
        }

        const imageIndex = generatedImages.length + 1;
        setCurrentStatus(`Analyzing sound for image ${imageIndex} of ${totalImagesToGenerate}...`);
        
        try {
            const audioBase64 = await geminiService.fileToBase64(audioBlob);
            const prompt = await geminiService.generateLivePrompt(audioBase64, audioBlob.type, context);
            
            setCurrentStatus(`Generating image ${imageIndex} of ${totalImagesToGenerate}...`);
            const imageBase64 = await geminiService.generateImage(prompt, 'raphaelite-digital-art');

            const newImage: LiveImageData = {
                id: Date.now(),
                base64: imageBase64,
                prompt: prompt,
                fileName: `image_${imageIndex}.jpeg`
            };
            setGeneratedImages(prev => [...prev, newImage]);
        } catch (err: any) {
            console.error("Error in generation loop:", err);
            // Show a transient error but don't stop the flow
        } finally {
            isProcessingRef.current = false;
        }
    };
    
    const startFlow = () => {
        setError(null);
        setGeneratedImages([]);
        setLiveState('RECORDING');
        startLiveRecording();
    };

    useEffect(() => {
        if (liveState === 'RECORDING') {
            setCountdown(interval);

            // Start the master interval for processing
            intervalRef.current = setInterval(processAudioChunk, interval * 1000);

            // Start the countdown timer for UI
            countdownRef.current = setInterval(() => {
                setCountdown(prev => (prev > 1 ? prev - 1 : interval));
            }, 1000);

            return () => {
                stopLiveRecording();
            };
        }
    }, [liveState, interval]);

     useEffect(() => {
        if (liveState === 'RECORDING' && generatedImages.length >= totalImagesToGenerate) {
            stopLiveRecording();
            setLiveState('GENERATING'); // Intermediate state for summary
        }
    }, [generatedImages, totalImagesToGenerate, liveState, stopLiveRecording]);

    const handleStop = () => {
        stopLiveRecording();
        if(generatedImages.length > 0) {
            setLiveState('GENERATING');
        } else {
            setLiveState('CONFIG');
        }
    };
    
    const handleDownload = async () => {
        if (liveState !== 'FINISHED' || !summaryRef.current) return;
        
        setCurrentStatus('Preparing your download...');
        try {
            const zip = new JSZip();
            zip.file("summary.md", summaryRef.current);
            const imgFolder = zip.folder("images");

            for (const image of generatedImages) {
                 imgFolder!.file(image.fileName, image.base64, { base64: true });
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipBlob);
            link.download = "flow_of_life.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(err: any) {
            setError("Failed to create ZIP file. " + err.message);
        }
        setCurrentStatus('');
    };
    
    const summaryRef = useRef<string | null>(null);

    const generateSummary = useCallback(async () => {
        if (generatedImages.length === 0) {
            setLiveState('FINISHED');
            return;
        }
        setCurrentStatus('Creating your story summary...');
        try {
            const prompts = generatedImages.map(img => img.prompt);
            const summary = await geminiService.generateSummaryMarkdown(prompts, context);
            summaryRef.current = summary;
        } catch (err: any) {
            setError('Could not generate summary. You can still download the images.');
            summaryRef.current = 'Summary generation failed.';
        } finally {
            setLiveState('FINISHED');
            setCurrentStatus('');
        }
    }, [generatedImages, context]);


    useEffect(() => {
        if (liveState === 'GENERATING') {
            generateSummary();
        }
    }, [liveState, generateSummary]);

    const resetFlow = () => {
        setLiveState('CONFIG');
        setGeneratedImages([]);
        setError(null);
        setCurrentStatus('');
        summaryRef.current = null;
    }


    if (liveState === 'CONFIG' || liveState === 'ERROR') {
        return (
             <div className="card w-full bg-base-200 shadow-xl p-6 md:p-8 space-y-4 animate-fade-in">
                 <h2 className="text-xl font-bold text-center">Flow of Life Setup</h2>
                 <p className="text-sm text-center text-neutral-content/70">Capture the visual essence of your surroundings. Provide some context, and let the AI paint your world in real-time.</p>
                {error && (
                    <div role="alert" className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span>{error}</span>
                    </div>
                )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Context Inputs */}
                    <input type="text" placeholder="Where are you currently?" className="input input-bordered w-full" value={context.location} onChange={e => setContext({...context, location: e.target.value})} />
                    <select className="select select-bordered w-full" value={context.areaType} onChange={e => setContext({...context, areaType: e.target.value})}>
                        <option>Urban</option>
                        <option>Suburban</option>
                        <option>Rural</option>
                    </select>
                     <input type="text" placeholder="What time of day is it?" className="input input-bordered w-full" value={context.timeOfDay} onChange={e => setContext({...context, timeOfDay: e.target.value})} />
                     <input type="text" placeholder="What are you doing?" className="input input-bordered w-full" value={context.activity} onChange={e => setContext({...context, activity: e.target.value})} />
                     <select className="select select-bordered w-full" value={context.gender} onChange={e => setContext({...context, gender: e.target.value})}>
                        <option>Prefer not to say</option>
                        <option>Female</option>
                        <option>Male</option>
                    </select>
                    <input type="number" placeholder="Your Age" className="input input-bordered w-full" value={context.age} onChange={e => setContext({...context, age: e.target.value})} />
                 </div>
                 <div className="divider">Generation Settings</div>
                 <div className="flex items-center gap-4">
                     <div className="form-control flex-grow">
                         <label className="label cursor-pointer">
                             <span className="label-text">Number of Images</span> 
                             <input type="radio" name="radio-10" className="radio checked:bg-primary" checked={generationMode === 'count'} onChange={() => setGenerationMode('count')} />
                         </label>
                     </div>
                      <input type="number" className="input input-bordered w-24" value={imageCount} onChange={e => setImageCount(parseInt(e.target.value))} disabled={generationMode !== 'count'} />
                 </div>
                  <div className="flex items-center gap-4">
                     <div className="form-control flex-grow">
                         <label className="label cursor-pointer">
                             <span className="label-text">Total Duration (minutes)</span> 
                             <input type="radio" name="radio-10" className="radio checked:bg-primary" checked={generationMode === 'duration'} onChange={() => setGenerationMode('duration')} />
                         </label>
                     </div>
                      <input type="number" className="input input-bordered w-24" value={duration} onChange={e => setDuration(parseInt(e.target.value))} disabled={generationMode !== 'duration'} />
                 </div>
                 <div className="form-control">
                    <label className="label"><span className="label-text">Image Generation Interval (seconds)</span></label>
                    <select className="select select-bordered w-full" value={interval} onChange={e => setIntervalValue(parseInt(e.target.value))}>
                        <option>10</option><option>15</option><option>20</option><option>25</option><option>30</option>
                    </select>
                </div>
                 <button className="btn btn-primary w-full" onClick={startFlow} disabled={!context.location || !context.activity || !context.age}>
                    <PlayIcon /> Start the Flow
                 </button>
             </div>
        )
    }

    if (liveState === 'RECORDING') {
        const lastImage = generatedImages.length > 0 ? generatedImages[generatedImages.length-1] : null;
        return (
             <div className="w-full flex flex-col items-center animate-fade-in">
                 <div className="stats shadow bg-base-200 mb-4">
                    <div className="stat">
                        <div className="stat-title">Images Generated</div>
                        <div className="stat-value text-secondary">{generatedImages.length} / {totalImagesToGenerate}</div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Next Image In</div>
                        <div className="stat-value">{countdown}s</div>
                         <div className="stat-desc"><progress className="progress progress-primary w-24" value={interval - countdown} max={interval}></progress></div>
                    </div>
                </div>

                <div className="card w-full bg-base-300 shadow-xl mb-6 min-h-64 flex items-center justify-center">
                    {lastImage ? (
                         <img src={`data:image/jpeg;base64,${lastImage.base64}`} alt="Latest generated art" className="rounded-xl object-contain max-h-[40vh]"/>
                    ) : (
                        <div className="text-center p-4">
                            <p className="text-lg text-neutral-content animate-pulse">Waiting for the first image...</p>
                            <span className="loading loading-dots loading-md text-primary mt-2"></span>
                        </div>
                    )}
                </div>

                 <p className="text-center my-2 text-neutral-content/80 animate-pulse">{currentStatus}</p>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 w-full bg-base-200/50 p-2 rounded-box">
                    {generatedImages.map(img => (
                        <img key={img.id} src={`data:image/jpeg;base64,${img.base64}`} alt={img.prompt} className="w-full h-auto object-cover rounded-md aspect-square"/>
                    ))}
                </div>

                 <button className="btn btn-error mt-6" onClick={handleStop}><StopIcon /> Stop Flow</button>
             </div>
        )
    }
    
    if (liveState === 'GENERATING') {
        return <Loader message={currentStatus || "Finalizing your Flow of Life..."} />;
    }

    if (liveState === 'FINISHED') {
         return (
             <div className="w-full flex flex-col items-center animate-fade-in">
                 <h2 className="text-3xl font-bold font-orbitron mb-4">Your Flow of Life is Complete</h2>
                 <p className="text-center mb-6">{generatedImages.length} moments captured.</p>

                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full p-2 rounded-box">
                    {generatedImages.map(img => (
                        <div key={img.id} className="card bg-base-200 shadow-lg">
                             <img src={`data:image/jpeg;base64,${img.base64}`} alt={img.prompt} className="w-full h-auto object-cover rounded-t-lg aspect-square"/>
                             <p className="text-xs text-center p-1 font-semibold">{img.fileName}</p>
                        </div>
                    ))}
                </div>
                
                 {error && <p className="text-error my-4">{error}</p>}
                 {currentStatus && <p className="animate-pulse my-4">{currentStatus}</p>}

                <div className="flex gap-4 mt-8">
                    <button className="btn btn-ghost" onClick={resetFlow}>Start New Flow</button>
                    <button className="btn btn-primary" onClick={handleDownload} disabled={!!currentStatus}>
                        <DownloadIcon /> Download as .zip
                    </button>
                </div>
             </div>
         )
    }

    return null;
};

export default LiveSynesthesia;