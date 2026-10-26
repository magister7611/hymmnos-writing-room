import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/libre-caslon-display/400.css';
import './style.css';
import Studio from './Studio.jsx';
createRoot(document.getElementById('root')).render(<Studio/>);
if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('sw.js',document.baseURI)).catch(()=>{}));
