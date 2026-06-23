/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Resident } from '../types';
import { Building2, Store, Shield, ArrowRight, Phone, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onLoginSuccess: (user: { role: 'admin' | 'resident'; residentData?: Resident }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'resident' | 'admin'>('resident');
  
  // Resident controls
  const [wing, setWing] = useState('A');
  const [flatNumber, setFlatNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(30);
  
  // Admin controls
  const [adminPassword, setAdminPassword] = useState('');
  
  // Demo assistance
  const [allResidents, setAllResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Loading list of seeded residents for demonstration purposes
  useEffect(() => {
    async function fetchResidents() {
      setLoadingResidents(true);
      setErrorText('');
      try {
        const querySnapshot = await getDocs(collection(db, 'residents'));
        const list: Resident[] = [];
        querySnapshot.forEach((doc) => {
          list.push(doc.data() as Resident);
        });
        setAllResidents(list);
      } catch (err) {
        // Soft catch
        console.error("Error loading residents for dropdown: ", err);
      } finally {
        setLoadingResidents(false);
      }
    }
    fetchResidents();
  }, [successText]); // Re-fetch on structural changes if any

  // Timer countdown for simulated OTP
  useEffect(() => {
    let interval: any;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Handler for Resident OTP dispatch
  const handleSendOTP = () => {
    setErrorText('');
    setSuccessText('');
    
    if (!flatNumber.trim() || !mobile.trim()) {
      setErrorText('Please specify both Flat/Shop Number and Registered Mobile Number.');
      return;
    }

    // Try finding the resident
    const normalizedFlat = flatNumber.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    const matched = allResidents.find(r => 
      r.flatNumber.toLowerCase() === normalizedFlat && 
      r.wing.toLowerCase() === wing.toLowerCase() &&
      r.mobile === normalizedMobile
    );

    if (!matched) {
      setErrorText(`No registered resident found with Wing ${wing}, Unit ${flatNumber} and mobile ${mobile} on database. Check one of the quick selector buttons below!`);
      return;
    }

    setOtpSent(true);
    setTimer(30);
    setSuccessText(`Demo OTP sent automatically! For testing, use OTP: 123456`);
  };

  // OTP Verification
  const handleVerifyOTP = () => {
    setErrorText('');
    if (otp !== '123456' && otp !== '654321') {
      setErrorText('Invalid OTP entered. Please use the simulated demo OTP: 123456');
      return;
    }

    const matched = allResidents.find(r => 
      r.flatNumber.trim().toLowerCase() === flatNumber.trim().toLowerCase() && 
      r.wing.toLowerCase() === wing.toLowerCase() &&
      r.mobile === mobile.trim()
    );

    if (matched) {
      onLoginSuccess({
        role: 'resident',
        residentData: matched
      });
    } else {
      setErrorText('Verification failed. Resident index mismatch.');
    }
  };

  // Fast demo selector
  const handleSelectDemoResident = (res: Resident) => {
    setWing(res.wing);
    setFlatNumber(res.flatNumber);
    setMobile(res.mobile);
    setOtpSent(false);
    setOtp('');
    setErrorText('');
    setSuccessText(`Demostration credentials loaded for Flat ${res.wing}-${res.flatNumber}. Click "Send Demo OTP"!`);
  };

  // Admin login handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    
    // Admin password check
    if (adminPassword === 'GH2026Admin' || adminPassword === 'admin' || adminPassword === 'gh2026') {
      onLoginSuccess({
        role: 'admin'
      });
    } else {
      setErrorText('Incorrect Society Admin Access Key. Use demo master key "GH2026Admin" to login.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
        
        {/* Header / Brand */}
        <div className="bg-gradient-to-br from-[#1E88E5] to-[#0D47A1] p-6 text-white text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Building2 className="w-8 h-8 text-white animate-pulse" />
            <span className="text-xl font-bold tracking-tight">Gafoor Heights</span>
          </div>
          <p className="text-blue-100 text-xs">Society Management & Maintenance Portal, Pune</p>
        </div>

        {/* Tabs Changer */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setActiveTab('resident'); setErrorText(''); setOtpSent(false); }}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === 'resident' 
                ? 'text-[#1E88E5] border-b-2 border-[#1E88E5] bg-blue-50/10' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Resident / Owner
          </button>
          <button
            onClick={() => { setActiveTab('admin'); setErrorText(''); }}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === 'admin' 
                ? 'text-[#1E88E5] border-b-2 border-[#1E88E5] bg-blue-50/10' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Society Admin
          </button>
        </div>

        {/* Alerts Block */}
        {errorText && (
          <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs leading-relaxed border border-red-100">
            {errorText}
          </div>
        )}
        {successText && (
          <div className="mx-6 mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-xs leading-relaxed border border-green-100 flex items-start gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <span>{successText}</span>
          </div>
        )}

        {/* Content Box */}
        <div className="p-6 flex-1">
          {activeTab === 'resident' ? (
            <div>
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Wing</label>
                      <select 
                        value={wing} 
                        onChange={(e) => setWing(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium focus:outline-none focus:border-[#1E88E5] text-slate-700"
                      >
                        <option value="A">Wing A</option>
                        <option value="B">Wing B</option>
                        <option value="Commercial">Comm.</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Flat / Shop No.</label>
                      <input 
                        type="text" 
                        value={flatNumber}
                        onChange={(e) => setFlatNumber(e.target.value)}
                        placeholder="e.g. 101 or Shop 1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-medium focus:outline-none focus:border-[#1E88E5] text-slate-705 placeholder:text-slate-350"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Registered Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+91</span>
                      <input 
                        type="tel" 
                        value={mobile}
                        maxLength={10}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-12 pr-3 text-sm font-semibold tracking-wide focus:outline-none focus:border-[#1E88E5] text-slate-700 placeholder:text-slate-350"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendOTP}
                    className="w-full mt-2 bg-[#1E88E5] hover:bg-[#1670c2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Send Demo OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-2 px-4 rounded-xl bg-slate-50 border border-slate-150">
                    <p className="text-slate-500 text-xs">Simulated OTP dispatch successful for Wing {wing} - Unit {flatNumber}</p>
                    <p className="font-mono text-sm tracking-widest font-bold text-slate-700 mt-1">Verification Code Needed</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Enter 6-Digit OTP</label>
                    <input 
                      type="text" 
                      value={otp}
                      maxLength={6}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 123456"
                      className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-2 font-mono text-lg font-bold tracking-widest focus:outline-none focus:border-[#1E88E5] text-slate-800 placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Didn't receive code?</span>
                    {timer > 0 ? (
                      <span className="text-slate-500 font-medium">Resend OTP in {timer}s</span>
                    ) : (
                      <button 
                        onClick={handleSendOTP} 
                        className="text-[#1E88E5] font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setOtpSent(false)}
                      className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerifyOTP}
                      className="flex-[2] bg-[#1E88E5] hover:bg-[#1670c2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <span>Verify and Enter</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Demo Assist Box */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Developer Sandbox Tools</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Choose a pre-seeded resident to simulate instantly (some have overdue maintenance charges):
                </p>
                {loadingResidents ? (
                  <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#1E88E5]" /> Loading demo resident data...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {allResidents.slice(0, 6).map((res) => (
                      <button
                        key={res.residentId}
                        onClick={() => handleSelectDemoResident(res)}
                        className="bg-slate-50 hover:bg-slate-100 border border-slate-150 text-left p-2 rounded-lg text-slate-650 cursor-pointer text-[11px] transition-all overflow-hidden"
                      >
                        <div className="flex items-center justify-between font-bold mb-0.5 text-slate-800">
                          <span>{res.wing}-{res.flatNumber}</span>
                          <span className={`text-[9px] px-1 py-0.5 rounded ${
                            res.outstandingBalance > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {res.outstandingBalance > 0 ? `₹${res.outstandingBalance} Due` : 'Paid'}
                          </span>
                        </div>
                        <p className="truncate text-slate-500 text-[10px]">{res.ownerName}</p>
                        <p className="text-slate-400 font-mono text-[9px] truncate mt-0.5">{res.mobile}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Admin Access Key</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter demoykey: GH2026Admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-3 text-sm font-medium focus:outline-none focus:border-[#1E88E5] text-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl leading-relaxed text-[11px] text-slate-650 border border-blue-100">
                <span className="font-bold text-[#1E88E5]">Pro-Tip:</span> Use master password <code className="font-mono bg-white px-1.5 py-0.5 border rounded border-blue-150">GH2026Admin</code> or simply <code className="font-mono bg-white px-1.5 py-0.5 border rounded border-blue-150">admin</code> to sign in as society authority.
              </div>

              <button
                type="submit"
                className="w-full bg-[#1E88E5] hover:bg-[#1670c2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4"
              >
                <span>Access Admin Control Board</span>
                <Shield className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
