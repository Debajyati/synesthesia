import React, { useState } from 'react';
import Header from './components/Header';
import CreatorStudio from './components/CreatorStudio';
import VisualStoryboard from './components/VisualStoryboard';
import CreativeStudioIcon from './components/icons/CreativeStudioIcon';
import FilmIcon from './components/icons/FilmIcon';

type ActiveTab = 'creator' | 'storyboard';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('creator');

    return (
        <div className="min-h-screen bg-base-100 text-neutral-content p-4 flex flex-col items-center">
            <Header />

            <div role="tablist" className="tabs tabs-boxed my-6 bg-base-200">
                <a 
                    role="tab" 
                    className={`tab gap-2 ${activeTab === 'creator' ? 'tab-active' : ''}`} 
                    onClick={() => setActiveTab('creator')}
                    aria-selected={activeTab === 'creator'}
                >
                    <CreativeStudioIcon className="w-5 h-5" /> Creator Studio
                </a>
                <a 
                    role="tab" 
                    className={`tab gap-2 ${activeTab === 'storyboard' ? 'tab-active' : ''}`} 
                    onClick={() => setActiveTab('storyboard')}
                    aria-selected={activeTab === 'storyboard'}
                >
                    <FilmIcon className="w-5 h-5" /> Visual Storyboard
                </a>
            </div>
            
            <main className="w-full flex-grow flex flex-col items-center justify-start">
                {activeTab === 'creator' && <CreatorStudio />}
                {activeTab === 'storyboard' && <VisualStoryboard />}
            </main>

            <footer className="p-4 text-center text-xs text-neutral-content/50">
                <p>Created with ❤️ by Debajyati Dey for the Nano Banana Hackathon. Powered by Google Gemini.</p>
            </footer>
        </div>
    );
};

export default App;
