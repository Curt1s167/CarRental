// src/main.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import 'remixicon/fonts/remixicon.css';
import './index.css';
import App from './App';
import { AuthProvider } from './store/AuthContext';
import ErrorBoundary from './components/Common/ErrorBoundary/ErrorBoundary';

const Root = () => (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
            <App />
        </AuthProvider>
    </BrowserRouter>
);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <Root />
        </ErrorBoundary>
    </StrictMode>,
);