import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { PopupApp } from '../popup/PopupApp';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <div className="min-h-screen bg-slate-900 p-4">
        <PopupApp />
      </div>
    </React.StrictMode>
  );
}
