import React from 'react';
import { ImageData } from '../types';

interface ImageHistoryProps {
    history: ImageData[];
    activeIndex: number;
    onSelect: (index: number) => void;
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ history, activeIndex, onSelect }) => {
    if (history.length <= 1) {
        return null;
    }

    return (
        <div className="w-full mt-6">
            <h3 className="text-lg font-bold mb-2 text-center">Version History</h3>
            <div className="flex justify-center items-center gap-4 p-4 overflow-x-auto bg-base-200/50 rounded-box">
                {history.map((img, index) => (
                    <button
                        key={img.id}
                        onClick={() => onSelect(index)}
                        className={`rounded-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100 focus:ring-primary ${activeIndex === index ? 'ring-2 ring-primary' : 'ring-1 ring-base-content/20'}`}
                    >
                        <img
                            src={`data:image/jpeg;base64,${img.base64}`}
                            alt={`Version ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-md"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ImageHistory;