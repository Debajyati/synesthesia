import React, { useState, useEffect, useRef } from 'react';
import { ImageData, FilterType } from '../types';
import UploadIcon from './icons/UploadIcon';
import { FILTERS, MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '../constants';
import CopyIcon from './icons/CopyIcon';

interface ImageDisplayProps {
    image: ImageData;
    onEdit: (prompt: string, filter: FilterType, remixImageFile?: File) => void;
    onError: (message: string) => void;
    isEditing: boolean;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ image, onEdit, onError, isEditing }) => {
    const [editPrompt, setEditPrompt] = useState('');
    const [copySuccess, setCopySuccess] = useState('');
    const [remixFile, setRemixFile] = useState<File | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('unspecified');
    const remixFileInputRef = useRef<HTMLInputElement>(null);

    const canSubmit = editPrompt.trim() !== '' || selectedFilter !== 'unspecified';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (canSubmit && !isEditing) {
            onEdit(editPrompt, selectedFilter, remixFile || undefined);
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(image.prompt).then(() => {
            setCopySuccess('Copied!');
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess('Failed!');
             setTimeout(() => setCopySuccess(''), 2000);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                onError(`Image file is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`);
                setRemixFile(null);
                event.target.value = '';
                return;
            }
            setRemixFile(file);
        }
    };
    
    const handleUploadClick = () => {
        remixFileInputRef.current?.click();
    };

    // Reset local state when the image prop changes (e.g., user selects from history)
    useEffect(() => {
        setEditPrompt('');
        setRemixFile(null);
        setSelectedFilter('unspecified');
        if (remixFileInputRef.current) {
            remixFileInputRef.current.value = '';
        }
    }, [image.id]);

    const imageUrl = `data:image/jpeg;base64,${image.base64}`;

    return (
        <div className="card w-full bg-base-300 shadow-xl mt-8">
            <figure className="px-4 pt-4">
                <img src={imageUrl} alt="Generated art" className="rounded-xl object-contain max-h-[60vh]" />
            </figure>
            <div className="card-body">
                <div className="mb-4">
                    <h3 className="font-bold text-sm text-neutral-content/60 mb-1">Generation Prompt:</h3>
                    <div className="relative group">
                        <p className="text-sm p-3 bg-base-100 rounded-lg italic whitespace-pre-wrap">"{image.prompt}"</p>
                        <button onClick={handleCopyPrompt} className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Copy generation prompt">
                            {copySuccess ? <span className="text-xs">{copySuccess}</span> : <CopyIcon />}
                        </button>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="form-control">
                        <label className="label">
                            <span className="label-text">Apply a style filter:</span>
                        </label>
                         <select
                            className="select select-bordered w-full"
                            value={selectedFilter}
                            onChange={(e) => setSelectedFilter(e.target.value as FilterType)}
                            disabled={isEditing}
                        >
                            {FILTERS.map(filter => (
                                <option key={filter} value={filter}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Describe your edits (optional if filter is selected):</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered h-24"
                            placeholder="e.g., 'add a futuristic city in the background', 'change the color scheme to neon blue', 'make it a cubist painting'"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            disabled={isEditing}
                        />
                    </div>
                    
                    <div className="form-control">
                         <label className="label">
                            <span className="label-text">Remix with an image (optional):</span>
                        </label>
                        <div className="flex items-center space-x-2">
                             <input
                                type="file"
                                ref={remixFileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                                disabled={isEditing}
                            />
                            <button 
                                type="button"
                                onClick={handleUploadClick} 
                                className="btn btn-outline btn-primary btn-sm"
                                disabled={isEditing}
                            >
                                <UploadIcon className="h-4 w-4" />
                                Choose Image
                            </button>
                             {remixFile && <span className="text-xs truncate">{remixFile.name}</span>}
                        </div>
                    </div>

                     <div className="card-actions justify-end">
                        <a href={imageUrl} download={`synesthesia-art-${Date.now()}.jpg`} className="btn btn-outline">Download</a>
                        <button type="submit" className="btn btn-secondary" disabled={isEditing || !canSubmit}>
                            {isEditing ? 'Applying...' : 'Remix Image'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ImageDisplay;