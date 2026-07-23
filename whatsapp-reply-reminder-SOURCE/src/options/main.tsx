import React from 'react';
import ReactDOM from 'react-dom/client';
import { Options } from './Options';
import '@/styles/globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found for options page');

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>
);
