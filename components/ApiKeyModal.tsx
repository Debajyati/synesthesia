import React, { useState } from 'react';

interface ApiKeyModalProps {
    onKeySubmit: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySubmit }) => {
    const [apiKey, setApiKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiKey.trim()) {
            onKeySubmit(apiKey.trim());
        }
    };

    return (
        // Using a fixed position div to create a mandatory modal overlay
        <div className="fixed inset-0 bg-base-100 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-md bg-base-200 shadow-xl">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <h3 className="font-bold text-lg text-center font-orbitron">Gemini API Key Required</h3>
                        <p className="py-4 text-sm text-neutral-content/80">
                            To use Synesthesia AI, please provide your Billing Enabled Google Gemini API key. Your key is stored only in your browser's local storage and is never sent to our servers.
                        </p>
                        <div className="form-control">
                            <input
                                type="password"
                                placeholder="Enter your API key"
                                className="input input-bordered w-full"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                aria-label="Gemini API Key"
                            />
                        </div>
                        <div className="text-center mt-3">
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="link link-primary text-xs">
                                Get a Billing Enabled Gemini API Key from Google AI Studio
                            </a>
                        </div>
                        <div className="card-actions justify-end mt-6">
                            <button type="submit" className="btn btn-primary" disabled={!apiKey.trim()}>
                                Save & Start Creating
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;

