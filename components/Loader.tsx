import React from 'react';

interface LoaderProps {
    message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-4 my-8">
            <span className="loading loading-dots loading-lg text-primary"></span>
            <p className="text-lg text-neutral-content animate-pulse">{message}</p>
        </div>
    );
};

export default Loader;
