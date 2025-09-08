import React, { useState, useCallback, useRef } from 'react';
import AudioInput from './AudioInput';
import ImageDisplay from './ImageDisplay';
import Loader from './Loader';
import ImageHistory from './ImageHistory';
import Modal from './Modal';
import CopyIcon from './icons/CopyIcon';
import { AppState, ImageData, FilterType } from '../types';
import { FILTERS } from '../constants';
import * as geminiService from '../services/geminiService';

const CreatorStudio: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.IDLE);
    const [error, setError] = useState<string | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioContext, setAudioContext] = useState<string>('');
    const [textPrompt, setTextPrompt] = useState<string>('');
    const [generationFilter, setGenerationFilter] = useState<FilterType>('unspecified');
    const [imageHistory, setImageHistory] = useState<ImageData[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [modalConfirmAction, setModalConfirmAction] = useState<() => void>(() => () => {});
    const [copySuccess, setCopySuccess] = useState('');

    const textPromptRef = useRef<HTMLTextAreaElement>(null);

    const activeImage = activeImageIndex !== null ? imageHistory[activeImageIndex] : null;
    const isProcessing = appState !== AppState.IDLE && appState !== AppState.ERROR;

    const resetCreatorState = () => {
        setAppState(AppState.IDLE);
        setError(null);
        setAudioFile(null);
        setTextPrompt('');
        setAudioContext('');
        setGenerationFilter('unspecified');
        setImageHistory([]);
        setActiveImageIndex(null);
    };

    const handleActionWithPromptWarning = (action: () => void) => {
        if (textPrompt.trim()) {
            setModalConfirmAction(() => () => {
                setTextPrompt('');
                action();
            });
            setShowWarningModal(true);
        } else {
            action();
        }
    };

    const handleRecordingComplete = async (file: File) => {
        handleActionWithPromptWarning(() => {
            setError(null);
            setAudioFile(null); // Recording takes precedence over uploaded file
            setAppState(AppState.ANALYZING);
            processRecording(file);
        });
    };
    
    const processRecording = async (file: File) => {
        try {
            const audioBase64 = await geminiService.fileToBase64(file);
            const promptFromSpeech = await geminiService.transcribeAudioToPrompt(audioBase64, file.type, audioContext);
            setTextPrompt(promptFromSpeech);
            setAudioContext('');
            setAudioFile(null);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during audio transcription.');
            setAppState(AppState.ERROR);
        } finally {
            setAppState(AppState.IDLE);
        }
    };

    const handleAudioFileSelected = (file: File) => {
        handleActionWithPromptWarning(() => {
            setError(null);
            setAudioFile(file);
        });
    };
    
    const handleCopyPrompt = () => {
        if (textPromptRef.current) {
            navigator.clipboard.writeText(textPromptRef.current.value).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Failed to copy');
                 setTimeout(() => setCopySuccess(''), 2000);
            });
        }
    };

    const handleGeneration = async () => {
        setError(null);
        let finalPrompt = textPrompt;

        if (audioFile) {
            try {
                setAppState(AppState.ANALYZING);
                const audioBase64 = await geminiService.fileToBase64(audioFile);
                finalPrompt = await geminiService.generatePromptFromMusic(audioBase64, audioFile.type, audioContext);
                setTextPrompt(finalPrompt);
            } catch (err: any) {
                setError(err.message || 'An unknown error occurred during audio analysis.');
                setAppState(AppState.ERROR);
                return;
            }
        }

        if (!finalPrompt.trim()) {
            setError('A prompt is required to generate an image. Please type one or provide an audio file.');
            setAppState(AppState.IDLE);
            return;
        }

        try {
            setAppState(AppState.GENERATING);
            const imageBase64 = await geminiService.generateImage(finalPrompt, generationFilter);
            const newImage: ImageData = { 
                id: Date.now(), 
                base64: imageBase64, 
                prompt: finalPrompt 
            };
            setImageHistory([newImage]);
            setActiveImageIndex(0);
            setAppState(AppState.IDLE);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during image generation.');
            setAppState(AppState.ERROR);
        }
    };
    
    const handleEdit = useCallback(async (editPrompt: string, filter: FilterType, remixImageFile?: File) => {
        if (!activeImage) return;

        setError(null);
        setAppState(AppState.EDITING);
        try {
            let remixImage;
            if (remixImageFile) {
                const base64 = await geminiService.fileToBase64(remixImageFile);
                remixImage = { base64, mimeType: remixImageFile.type };
            }

            const newImageBase64 = await geminiService.editImage(
                activeImage.base64, 
                'image/jpeg', 
                editPrompt,
                filter,
                remixImage
            );
            
            let newPrompt = `${activeImage.prompt}\n\n---`;
            if (filter !== 'unspecified') newPrompt += `\nFilter: ${filter}`;
            if (editPrompt) newPrompt += `\nEdit: ${editPrompt}`;

            const newImage: ImageData = {
                id: Date.now(),
                base64: newImageBase64,
                prompt: newPrompt
            };
            
            const newHistory = [...imageHistory, newImage];
            setImageHistory(newHistory);
            setActiveImageIndex(newHistory.length - 1);

        } catch (err: any)
 {
            setError(err.message || 'An unknown error occurred during image editing.');
            setAppState(AppState.ERROR);
        } finally {
            setAppState(AppState.IDLE);
        }
    }, [activeImage, imageHistory]);

    const getLoadingMessage = () => {
        switch (appState) {
            case AppState.ANALYZING: return 'Translating sound into a vision...';
            case AppState.GENERATING: return 'Painting with pixels and light...';
            case AppState.EDITING: return 'Applying magical enhancements...';
            default: return '';
        }
    };
    
    return (
        <div className="w-full max-w-2xl">
            {error && (
                <div role="alert" className="alert alert-error my-4 max-w-2xl mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm">{error}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => setError(null)}>Close</button>
                </div>
            )}
            
            <>
                {imageHistory.length === 0 && !isProcessing && (
                    <div className="card w-full bg-base-200 shadow-xl p-6 md:p-8 space-y-6">
                        <h2 className="text-xl font-bold text-center">Create from Sound or Text</h2>
                        
                        <AudioInput 
                            onAudioFileSelected={handleAudioFileSelected} 
                            onRecordingComplete={handleRecordingComplete} 
                            onError={setError}
                            disabled={isProcessing}
                            micDisabled={!!audioFile}
                        />
                        {audioFile && (
                            <textarea
                                className="textarea textarea-bordered w-full h-20"
                                placeholder="Add optional context about the audio (e.g., 'this is a sad piano melody', 'the speaker is excited')..."
                                value={audioContext}
                                onChange={(e) => setAudioContext(e.target.value)}
                                disabled={isProcessing}
                            />
                        )}
                        
                        <div className="divider">OR</div>
                        
                        <div className="form-control w-full relative group">
                            <textarea
                                ref={textPromptRef}
                                className="textarea textarea-bordered w-full h-24 peer"
                                placeholder="Describe a scene, feeling, or idea... (or record your voice!)"
                                value={textPrompt}
                                onChange={(e) => {
                                    setTextPrompt(e.target.value);
                                    if (audioFile) setAudioFile(null); // Typing clears audio file selection
                                }}
                                disabled={isProcessing || !!audioFile}
                            />
                            {textPrompt && (
                                <button onClick={handleCopyPrompt} className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 peer-focus:opacity-100 transition-opacity" aria-label="Copy prompt">
                                    {copySuccess ? <span className="text-xs">{copySuccess}</span> : <CopyIcon />}
                                </button>
                            )}
                        </div>
                        
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Apply a style filter (optional):</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={generationFilter}
                                onChange={(e) => setGenerationFilter(e.target.value as FilterType)}
                                disabled={isProcessing}
                            >
                                {FILTERS.filter(f => f !== 'raphaelite-digital-art').map(filter => (
                                    <option key={filter} value={filter}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <button 
                            className="btn btn-primary w-full" 
                            onClick={handleGeneration} 
                            disabled={isProcessing || (!audioFile && !textPrompt.trim())}
                        >
                            Generate Image
                        </button>
                    </div>
                )}

                {isProcessing && <Loader message={getLoadingMessage()} />}

                {activeImage && (
                    <div className="w-full">
                    <ImageDisplay image={activeImage} onEdit={handleEdit} onError={setError} isEditing={appState === AppState.EDITING} />
                    <ImageHistory history={imageHistory} activeIndex={activeImageIndex!} onSelect={setActiveImageIndex} />
                    <div className="text-center mt-4">
                        <button className="btn btn-ghost" onClick={resetCreatorState}>Start Over</button>
                    </div>
                    </div>
                )}
           </>

            <Modal
                isOpen={showWarningModal}
                onClose={() => setShowWarningModal(false)}
                onConfirm={modalConfirmAction}
                title="Overwrite Current Prompt?"
            >
                <p>Proceeding with an audio input will clear the text you've written in the prompt box. Is that okay?</p>
            </Modal>
        </div>
    );
};

export default CreatorStudio;
