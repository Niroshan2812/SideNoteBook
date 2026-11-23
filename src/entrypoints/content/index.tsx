import React from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingStickyApp } from './FloatingStickyApp';
import styles from '@/styles/global.css?inline';

const HOST_ID = 'sidenotebook-shadow-host';

function mountShadowRoot() {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.all = 'initial';
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  shadowRoot.appendChild(styleTag);

  const mountContainer = document.createElement('div');
  shadowRoot.appendChild(mountContainer);

  const root = createRoot(mountContainer);
  root.render(
    <React.StrictMode>
      <FloatingStickyApp />
    </React.StrictMode>
  );
}

mountShadowRoot();
