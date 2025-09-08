import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="text-center p-4 md:p-6">
            <h1 className="text-4xl md:text-6xl font-orbitron font-extrabold tracking-widest bg-gradient-to-r from-sky-400 via-lime-400 to-pink-500 bg-clip-text text-transparent">
                SYNESTHESIA AI
            </h1>
            <p className="text-neutral-content/70 mt-2 text-sm md:text-base">Generate & Edit Images from Sound & Imagination</p>
        </header>
    );
};

export default Header;