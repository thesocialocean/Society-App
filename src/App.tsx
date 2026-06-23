/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { seedInitialDataIfNecessary } from './firebase';
import { Resident } from './types';
import AuthScreen from './components/AuthScreen';
import ResidentDashboard from './components/ResidentDashboard';
import AdminDashboard from './components/AdminDashboard';
import { 
  RefreshCw, Building2, Smartphone, Monitor, Wifi, Battery, Signal, ArrowRightLeft, Cpu 
} from 'lucide-react';

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<{
    role: 'admin' | 'resident' | null;
    residentData?: Resident;
  }>({ role: null });

  // Mobile framing state
  const [frameMode, setFrameMode] = useState<'mobile' | 'fullscreen'>('mobile');
  const [currentTime, setCurrentTime] = useState('09:41');

  // Detect screens that are already mobile viewports on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        setFrameMode('fullscreen');
      }
    }
  }, []);

  // Update virtual phone status bar clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Bootstrapping the app
  useEffect(() => {
    async function bootApp() {
      try {
        // Seed standard society slots if database collection is currently empty
        await seedInitialDataIfNecessary();
        
        // Check for local storage persistence if any
        const cachedRole = localStorage.getItem('gh_society_role');
        if (cachedRole === 'admin') {
          setSession({ role: 'admin' });
        } else if (cachedRole === 'resident') {
          const cachedRes = localStorage.getItem('gh_society_res');
          if (cachedRes) {
            setSession({
              role: 'resident',
              residentData: JSON.parse(cachedRes)
            });
          }
        }
      } catch (err) {
        console.error("App boot failure: ", err);
      } finally {
        setInitializing(false);
      }
    }
    bootApp();
  }, []);

  const handleLoginSuccess = (loginData: { role: 'admin' | 'resident'; residentData?: Resident }) => {
    setSession(loginData);
    localStorage.setItem('gh_society_role', loginData.role);
    if (loginData.residentData) {
      localStorage.setItem('gh_society_res', JSON.stringify(loginData.residentData));
    }
  };

  const handleLogout = () => {
    setSession({ role: null });
    localStorage.removeItem('gh_society_role');
    localStorage.removeItem('gh_society_res');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans animate-fade-in">
        <div className="text-center space-y-3 p-6 bg-white/80 rounded-2xl border border-slate-100 shadow-xl backdrop-blur-md max-w-sm">
          <Building2 className="w-12 h-12 text-[#1E88E5] animate-bounce mx-auto" />
          <h2 className="text-base font-black text-slate-800 tracking-tight">Gafoor Heights Co-Op Pune</h2>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1E88E5]" />
            <span>Spinning up Secure Ledger Engine...</span>
          </div>
        </div>
      </div>
    );
  }

  // Children element resolver
  const renderInteractiveApp = (forceMobileView: boolean) => {
    return (
      <>
        {session.role === null && (
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        )}
        
        {session.role === 'resident' && session.residentData && (
          <ResidentDashboard 
            resident={session.residentData} 
            onLogout={handleLogout} 
            forceMobile={forceMobileView}
          />
        )}
        
        {session.role === 'admin' && (
          <AdminDashboard 
            onLogout={handleLogout} 
            forceMobile={forceMobileView}
          />
        )}
      </>
    );
  };

  // Smartphone Frame Simulator Viewport Markup
  if (frameMode === 'mobile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center px-4 py-8 font-sans overflow-y-auto">
        
        {/* Frame Toggle Controls Bar */}
        <div className="w-full max-w-[412px] mb-4 flex items-center justify-between text-white/90">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            <Smartphone className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Mobile App Simulator</span>
          </div>
          
          <button 
            onClick={() => setFrameMode('fullscreen')}
            className="flex items-center gap-1 text-[11px] font-bold bg-[#1E88E5] hover:bg-blue-600 px-3.5 py-1.5 rounded-full border border-blue-400 shadow-md transition-all cursor-pointer text-white"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Switch to Fullscreen</span>
          </button>
        </div>

        {/* Physical Device Frame Bezel */}
        <div className="w-[400px] h-[830px] rounded-[50px] border-[10px] border-slate-950 shadow-2xl overflow-hidden relative bg-white ring-4 ring-slate-800/20 flex flex-col scale-[0.95] sm:scale-100 transition-all">
          
          {/* Top Notch Cutout */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140px] h-[26px] bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center pointer-events-none">
            {/* Camera sensor and speaker mesh */}
            <div className="w-2.5 h-2.5 bg-blue-950/40 rounded-full mr-2 shadow-inner border border-slate-900"></div>
            <div className="w-8 h-1 bg-slate-900 rounded-full"></div>
          </div>

          {/* Virtual Phone Status Bar */}
          <div className="h-11 bg-[#0D47A1] text-white flex items-center justify-between px-6 select-none shrink-0 relative z-40 pt-2 transition-colors">
            {/* Clock */}
            <span className="text-xs font-bold tracking-tight">{currentTime}</span>
            {/* Status Icons */}
            <div className="flex items-center gap-1.5 opacity-90">
              <Signal className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-wide">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* Device Screen Application Mount */}
          <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-50">
            {renderInteractiveApp(true)}
          </div>

          {/* Bottom Virtual Home Touch Indicator Indicator */}
          <div className="bg-white shrink-0 h-6 w-full flex items-center justify-center select-none pointer-events-none border-t border-slate-100">
            <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
          </div>

        </div>

        {/* App Meta Caption */}
        <div className="mt-2 text-center text-xs text-slate-400 flex items-center gap-1.5 select-none font-medium">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Real-time persistence active via Pune Cloud Ledger.</span>
        </div>
      </div>
    );
  }

  // Pure Full-screen mode view
  return (
    <div className="relative font-sans min-h-screen bg-slate-50">
      
      {/* Floating simulator button to toggle mobile layout view anytime */}
      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <button 
          onClick={() => setFrameMode('mobile')}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-full shadow-2xl border border-slate-700 transition-all cursor-pointer transform hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Smartphone className="w-4 h-4 text-blue-400" />
          <span>Show Mobile Simulator</span>
        </button>
      </div>

      {renderInteractiveApp(false)}
    </div>
  );
}
