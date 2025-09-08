import React, { useState, useRef } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import UploadIcon from './icons/UploadIcon';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '../constants';

interface AudioInputProps {
    onAudioFileSelected: (file: File) => void;
    onRecordingComplete: (file: File) => void;
    onError: (message: string) => void;
    disabled: boolean;
    micDisabled: boolean;
}

const AudioInput: React.FC<AudioInputProps> = ({ onAudioFileSelected, onRecordingComplete, onError, disabled, micDisabled }) => {
    const [fileName, setFileName] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRecordingDone = (file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            onError(`Recording is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`);
            setFileName('');
            return;
        }
        setFileName(file.name);
        onRecordingComplete(file);
    };

    const { isRecording, startRecording, stopRecording } = useAudioRecorder(handleRecordingDone);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                onError(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`);
                setFileName('');
                event.target.value = ''; // Reset file input
                return;
            }
            setFileName(file.name);
            onAudioFileSelected(file);
        }
    };
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-md space-y-4">
            <div className="flex items-center space-x-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="hidden"
                    disabled={disabled}
                />
                 <button 
                    onClick={handleUploadClick} 
                    className="btn btn-outline btn-primary flex-grow"
                    disabled={disabled}
                >
                    <UploadIcon />
                    Upload Audio
                </button>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`btn ${isRecording ? 'btn-error' : 'btn-secondary'} btn-circle`}
                    disabled={disabled || micDisabled}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? <StopIcon /> : <MicrophoneIcon />}
                </button>
            </div>
             {isRecording && (
                <div className="text-center text-secondary animate-pulse">
                    Recording... Click stop when done.
                </div>
            )}
            {fileName && !isRecording && (
                 <div className="text-center text-xs truncate text-neutral-content/60">
                    Source: {fileName}
                </div>
            )}
        </div>
    );
};

export default AudioInput;
