import { useState } from 'react';
import { ChannelView } from './components/ChannelView';
import { JobsView } from './components/JobsView';

type Tab = 'channel' | 'jobs';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('channel');

  return (
    <div className="flex flex-col min-h-screen bg-primary font-sans">
      <header className="bg-navy sticky top-0 z-50 h-[60px]">
        <div className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between gap-8">
          <h1 className="text-[22px] font-extrabold tracking-tight text-white whitespace-nowrap">
            <span className="text-accent">Zack</span>Localizer
          </h1>
          <nav className="flex gap-1" role="tablist">
            {(['channel', 'jobs'] as Tab[]).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`capitalize border-none text-sm font-medium px-4 py-1.5 rounded cursor-pointer transition-colors ${
                  activeTab === tab
                    ? 'bg-accent text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-5 py-7">
        {activeTab === 'channel' && <ChannelView onJobsCreated={() => setActiveTab('jobs')} />}
        {activeTab === 'jobs' && <JobsView />}
      </main>
    </div>
  );
}

export default App;
