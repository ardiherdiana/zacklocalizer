import { useState } from 'react';
import './App.css';
import { ChannelView } from './components/ChannelView';
import { JobsView } from './components/JobsView';

type Tab = 'channel' | 'jobs';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('channel');

  function handleJobsCreated() {
    setActiveTab('jobs');
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <h1 className="logo">
            <span className="logo__zack">Zack</span>Localizer
          </h1>
          <nav className="tab-nav" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'channel'}
              className={`tab-btn${activeTab === 'channel' ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab('channel')}
            >
              Channel
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'jobs'}
              className={`tab-btn${activeTab === 'jobs' ? ' tab-btn--active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              Jobs
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        {activeTab === 'channel' && <ChannelView onJobsCreated={handleJobsCreated} />}
        {activeTab === 'jobs' && <JobsView />}
      </main>
    </div>
  );
}

export default App;
