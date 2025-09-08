import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (onRecordingComplete: (file: File) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        if (isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
                onRecordingComplete(audioFile);
                stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    }, [isRecording, onRecordingComplete]);

    const stopRecording = useCallback(() => {
        if (!isRecording || !mediaRecorderRef.current) return;

        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }, [isRecording]);

    return { isRecording, startRecording, stopRecording };
};
