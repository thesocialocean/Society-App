/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  doc, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { Resident, Payment, Receipt, Complaint, Notice } from '../types';
import { 
  Building2, LogOut, Wallet, ReceiptText, Megaphone, AlertCircle, 
  PhoneCall, CreditCard, Calendar, Upload, CheckCircle2, AlertTriangle, 
  Clock, Filter, Download, Share2, ClipboardList, Info, HelpCircle
} from 'lucide-react';

interface ResidentDashboardProps {
  resident: Resident;
  onLogout: () => void;
  forceMobile?: boolean;
}

export default function ResidentDashboard({ resident: initialResident, onLogout, forceMobile = false }: ResidentDashboardProps) {
  const [resident, setResident] = useState<Resident>(initialResident);
  const [activeTab, setActiveTab] = useState<'pay' | 'history' | 'receipts' | 'notices' | 'complaints' | 'contacts'>('pay');
  
  // Collections state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  // Submit state definitions
  const [payAmount, setPayAmount] = useState('200');
  const [transactionId, setTransactionId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('June 2026');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // Submit Complaint states
  const [compCategory, setCompCategory] = useState<'Water Issue' | 'Lift Issue' | 'Parking Issue' | 'Security Issue' | 'Electricity Issue' | 'Other'>('Water Issue');
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compPhoto, setCompPhoto] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Filters
  const [historyFilter, setHistoryFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'monthly' | 'yearly'>('all');

  // Messages
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [complaintError, setComplaintError] = useState('');
  const [complaintSuccess, setComplaintSuccess] = useState('');

  // active receipt selector
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Load real-time data for this resident
  useEffect(() => {
    // 1. Listen for updates to the resident's own profile (e.g., if Admin updates outstandingBalance / status)
    const resRef = doc(db, 'residents', resident.residentId);
    const unsubsResident = onSnapshot(resRef, (snapshot) => {
      if (snapshot.exists()) {
        setResident(snapshot.data() as Resident);
      }
    }, (error) => {
      console.error("Error watching resident profile: ", error);
    });

    // 2. Query complaints for this unit
    const compQuery = query(
      collection(db, 'complaints'),
      where('flatNumber', '==', `${resident.wing}-${resident.flatNumber}`)
    );
    const unsubsComplaints = onSnapshot(compQuery, (snapshot) => {
      const list: Complaint[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Complaint);
      });
      // Sort by open date first
      list.sort((a,b) => b.createdDate.localeCompare(a.createdDate));
      setComplaints(list);
    });

    // 3. Query notices
    const noticeQuery = collection(db, 'notices');
    const unsubsNotices = onSnapshot(noticeQuery, (snapshot) => {
      const list: Notice[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Notice);
      });
      list.sort((a,b) => b.date.localeCompare(a.date));
      setNotices(list);
    });

    // 4. Query payments
    const payQuery = query(
      collection(db, 'payments'),
      where('residentId', '==', resident.residentId)
    );
    const unsubsPayments = onSnapshot(payQuery, (snapshot) => {
      const list: Payment[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Payment);
      });
      list.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate));
      setPayments(list);
    });

    // 5. Query receipts
    const recQuery = query(
      collection(db, 'receipts'),
      where('flatNumber', '==', `${resident.wing}-${resident.flatNumber}`)
    );
    const unsubsReceipts = onSnapshot(recQuery, (snapshot) => {
      const list: Receipt[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Receipt);
      });
      setReceipts(list);
    });

    return () => {
      unsubsResident();
      unsubsComplaints();
      unsubsNotices();
      unsubsPayments();
      unsubsReceipts();
    };
  }, [resident.residentId, resident.flatNumber, resident.wing]);

  // Helper file uploader base64 converter
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800kb to prevent Firestore document overflow
        alert("Screenshot is too large. Please select an image under 800kb.");
        return;
      }
      setScreenshotName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Autogenerate pre-made gorgeous payment receipt mock to bypass camera/upload friction
  const handleAutoScreenshot = () => {
    // Generate a high-contrast elegant template receipt image using base64 Canvas API
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 400, 150);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('UPI TRANSACTION SUCCESSFUL', 20, 25);
      
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.fillText(`FROM: ${resident.ownerName.toUpperCase()}`, 20, 50);
      ctx.fillText(`FLAT: Wing ${resident.wing} - ${resident.flatNumber}`, 20, 68);
      ctx.fillText(`TO: Gafoor Heights Co-Op Society - Pune`, 20, 86);
      ctx.fillText(`AMOUNT: INR ${payAmount}.00`, 20, 104);
      ctx.fillText(`DATE: ${new Date().toLocaleDateString()}`, 20, 122);
      
      // Success checkmark badge green
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(300, 40, 70, 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('✓', 320, 90);
      
      setScreenshotBase64(canvas.toDataURL('image/jpeg'));
      setScreenshotName('Auto_UPI_Screenshot.jpg');
    }
  };

  // Autogenerate pre-made complaint photo
  const handleAutoComplaintPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 200, 150);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${compCategory} Mock_Issues`, 15, 40);
      ctx.fillStyle = '#ef4444';
      ctx.font = '24px sans-serif';
      ctx.fillText('⚠ ERROR', 40, 90);
      
      setCompPhoto(canvas.toDataURL('image/jpeg'));
    }
  };

  // Submit payment function
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setPayError('Please enter a valid amount.');
      return;
    }

    if (!transactionId.trim()) {
      setPayError('Transaction Reference (ID) is required.');
      return;
    }

    if (!screenshotBase64) {
      setPayError('Please upload a screenshot or click "Auto Generate Mock" to simulate.');
      return;
    }

    setSubmittingPayment(true);
    const path = 'payments';
    try {
      const paymentId = `PAY-${Date.now()}`;
      const newPayment: Payment = {
        paymentId,
        residentId: resident.residentId,
        flatNumber: `${resident.wing}-${resident.flatNumber}`,
        residentName: resident.ownerName,
        month: selectedMonth,
        amount: parsedAmount,
        transactionId: transactionId.trim(),
        paymentDate: new Date().toISOString().split('T')[0],
        screenshot: screenshotBase64,
        status: 'Pending Verification',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, path, paymentId), newPayment);
      
      setPaySuccess(`Payment of ₹${parsedAmount} submitted successfully! Awaiting Society Admin verification.`);
      setTransactionId('');
      setScreenshotBase64('');
      setScreenshotName('');
    } catch (err) {
      setPayError('Could not process payment filing. Try again.');
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Submit complaint function
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplaintError('');
    setComplaintSuccess('');

    if (!compTitle.trim() || !compDesc.trim()) {
      setComplaintError('Complaint Title and Description are required.');
      return;
    }

    setSubmittingComplaint(true);
    const path = 'complaints';
    try {
      const complaintId = `COMP-${Date.now()}`;
      const newComplaint: Complaint = {
        complaintId,
        flatNumber: `${resident.wing}-${resident.flatNumber}`,
        residentName: resident.ownerName,
        category: compCategory,
        title: compTitle.trim(),
        description: compDesc.trim(),
        photo: compPhoto || '',
        status: 'Open',
        createdDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, path, complaintId), newComplaint);
      
      setComplaintSuccess('Your complaint has been registered. You will see status updates directly in this dashboard!');
      setCompTitle('');
      setCompDesc('');
      setCompPhoto('');
    } catch (err) {
      setComplaintError('Failed to log your complaint. Please try again.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Simulate local printing of PDF receipts
  const handlePrintReceipt = (rec: Receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker active. Please allow popups to download this official receipt.");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${rec.receiptNumber}</title>
          <style>
            body { font-family: monospace; padding: 40px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #cbd5e1; }
            .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 20px; margin-bottom: 20px; }
            .h1 { font-size: 20px; margin: 0; font-weight: bold; }
            .h2 { font-size: 11px; margin: 5px 0 0; color: #64748b; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin: 12px 0; font-size: 13px; }
            .label { color: #64748b; }
            .val { font-weight: bold; }
            .amount-box { text-align: center; background: #f1f5f9; padding: 15px; margin: 25px 0; border-radius: 4px; font-size: 18px; font-weight: bold; }
            .footer { text-align: center; border-top: 2px dashed #94a3b8; padding-top: 20px; margin-top: 40px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="h1">GAFOOR HEIGHTS CO-OP HOUSING SOCIETY</div>
            <div class="h2">Pune, Maharashtra, India</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 10px;">MAINTENANCE RECEIPT</div>
          </div>
          <div class="row"><span class="label">Receipt Number:</span><span class="val">${rec.receiptNumber}</span></div>
          <div class="row"><span class="label">Resident Name:</span><span class="val">${rec.residentName}</span></div>
          <div class="row"><span class="label">Flat/Shop Number:</span><span class="val">Wing ${rec.flatNumber}</span></div>
          <div class="row"><span class="label">Transaction Date:</span><span class="val">${rec.paymentDate}</span></div>
          <div class="row"><span class="label">Verification Date:</span><span class="val">${rec.verificationDate}</span></div>
          <div class="row"><span class="label">UPI Ref ID:</span><span class="val">${rec.transactionId}</span></div>
          
          <div class="amount-box">
             PAID: INR ${rec.amount}.00
          </div>
          <div style="text-align: center; color: #16a34a; font-weight: bold; font-size: 12px;">✓ DIGITALLY VERIFIED BY SOCIETY BOARD</div>
          <div class="footer">
            Thank you for helping us maintain local society standards.
            <br>Pune Housing Welfare Authority Registry
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Determine user outstanding and next due status
  const outstandingSum = resident.outstandingBalance;
  const isOverdue = outstandingSum > 200; // Overdue if has more than current month
  const displayStatus = outstandingSum > 0 ? (isOverdue ? 'Overdue' : 'Pending') : 'Paid';

  const getInitials = (name: string) => {
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'GH';
  };

  const tabs = [
    { id: 'pay' as const, label: 'Pay Maintenance', icon: CreditCard },
    { id: 'history' as const, label: 'Payment History', icon: Wallet },
    { id: 'receipts' as const, label: 'PDF Receipts', icon: ReceiptText },
    { id: 'notices' as const, label: 'Notice Board', icon: Megaphone },
    { id: 'complaints' as const, label: 'Complaints Hub', icon: AlertCircle },
    { id: 'contacts' as const, label: 'Committee Contacts', icon: PhoneCall },
  ];

  return (
    <div className={`flex flex-col ${forceMobile ? '' : 'md:flex-row'} min-h-screen bg-slate-50 font-sans text-slate-900`}>
      
      {/* Sidebar Navigation - Desktop */}
      <aside className={`${forceMobile ? 'hidden' : 'hidden md:flex'} w-64 bg-[#0D47A1] text-white flex-col shadow-xl z-10 shrink-0`}>
        <div className="p-6 border-b border-blue-900/30">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-blue-200 shrink-0" />
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-tight">Gafoor Heights</h1>
              <p className="text-blue-200 text-[10px] uppercase tracking-widest font-bold">Pune Co-Op Society</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-sm font-semibold cursor-pointer text-left ${
                  isActive 
                    ? 'bg-[#1E88E5] text-white shadow-inner' 
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'opacity-90' : 'opacity-70'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="bg-white/10 rounded-xl p-4 border border-white/5">
            <p className="text-[10px] text-blue-200 uppercase font-black tracking-wider">Unit Session</p>
            <p className="text-sm font-bold mt-1 text-white truncate">{resident.ownerName}</p>
            <p className="text-xs text-blue-200 mt-0.5 font-mono text-[10px]">Wing {resident.wing} • {resident.flatNumber}</p>
            <button 
              onClick={onLogout}
              className="w-full mt-3 py-2 bg-white text-[#0D47A1] rounded-lg font-bold text-xs shadow-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <header className={`${forceMobile ? 'block' : 'md:hidden'} bg-gradient-to-r from-[#1E88E5] to-[#0D47A1] text-white shadow-md z-40 shrink-0`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-200" />
            <div>
              <h1 className="text-sm font-bold">Gafoor Heights</h1>
              <p className="text-[9px] text-blue-200">Pune Co-Op Society</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-white/10 px-2 py-1 rounded">
              Wing {resident.wing} - {resident.flatNumber}
            </span>
            <button 
              onClick={onLogout}
              className="p-1 px-2.5 bg-white/15 rounded border border-white/10 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* Horizontal Navigation Ribbon for mobile only */}
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none border-t border-white/5 bg-blue-950/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3 rounded-lg font-bold text-[10px] shrink-0 cursor-pointer flex items-center gap-1.5 transition-all ${
                  isActive 
                    ? 'bg-white text-[#0D47A1] shadow-xs font-black' 
                    : 'text-blue-100 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col overflow-y-auto ${forceMobile ? '' : 'md:h-screen'}`}>
        
        {/* Desktop Header */}
        <header className={`${forceMobile ? 'hidden' : 'hidden md:flex'} h-20 bg-white border-b border-slate-200 shrink-0 items-center justify-between px-8 shadow-sm`}>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Welcome, {resident.ownerName}</h2>
            <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">
              Wing {resident.wing} | Flat {resident.flatNumber} | {resident.occupancyType}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-[#FF9800] rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {getInitials(resident.ownerName)}
            </div>
            <button 
              onClick={onLogout}
              title="Sign Out"
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Box */}
        <div className={`flex-1 p-4 ${forceMobile ? '' : 'md:p-8'} space-y-6`}>
          
          {/* Quick Metrics Overlay - matching design theme */}
          <div className={`grid grid-cols-1 ${forceMobile ? 'grid-cols-1' : 'md:grid-cols-3'} gap-6`}>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Current Month Due</span>
              <div className="flex justify-between items-end mt-4">
                <h3 className="text-3xl font-black text-slate-800">₹{resident.monthlyMaintenance}</h3>
                <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase mb-1">Due Today</span>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Outstanding Balance</span>
              <div className="flex justify-between items-end mt-4">
                <h3 className={`text-3xl font-black ${outstandingSum > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ₹{outstandingSum}
                </h3>
                {outstandingSum > 0 ? (
                  <button 
                    onClick={() => setActiveTab('pay')}
                    className="px-4 py-2 bg-[#1E88E5] text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    PAY NOW
                  </button>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase mb-1">Cleared</span>
                )}
              </div>
            </div>

            <div className={`p-5 rounded-2xl shadow-sm flex flex-col justify-between ${
              outstandingSum > 0 
                ? 'bg-amber-50/50 border border-amber-100' 
                : 'bg-[#E8F5E9] border border-[#C8E6C9]'
            }`}>
              <span className={`text-xs font-bold uppercase tracking-tight ${outstandingSum > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                Registry Account Status
              </span>
              <div className="flex flex-col mt-4">
                <h3 className={`text-xl font-bold ${outstandingSum > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                  {displayStatus} Account
                </h3>
                <p className={`text-xs ${outstandingSum > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  Approved over the counter
                </p>
              </div>
            </div>
          </div>

          {/* Quick Informational Metadata */}
          <div className="bg-white rounded-2xl border border-slate-150 p-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Next Due Date: <strong>July 10, 2026</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Payment Window: <strong>1st - 10th</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-blue-500" />
              <span>Default Fee: <strong>₹200 / Month</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>User ID: <strong>{resident.residentId}</strong></span>
            </div>
          </div>

          {/* Active Content Body Grid */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
          
          {/* TAB: PAY MAINTENANCE */}
          {activeTab === 'pay' && (
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-[#1E88E5]" />
                Submit Maintenance Clearing Payment
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                Pay your monthly society dues securely by scanning the cooperative bank QR code below, then log your receipt parameters. Pune Cooperative and major banking applications are supported.
              </p>

              {payError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs leading-relaxed mb-4 border border-red-100">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs leading-relaxed mb-6 border border-green-150">
                  {paySuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* QR Code and Account Details Panel */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-150 text-center flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gafoor Heights Co-Op Society QR Gate</span>
                    
                    {/* QR Code Placeholder with beautiful Styling */}
                    <div className="w-48 h-48 mx-auto my-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-center items-center">
                      {/* Generates a gorgeous lookalike mock QR code using basic shapes */}
                      <div className="w-full h-full relative border border-dashed border-slate-300 rounded flex flex-col items-center justify-center p-2 bg-gradient-to-tr from-[#1E88E5]/5 to-slate-50">
                        <div className="grid grid-cols-3 gap-1.5 w-full h-full p-2 opacity-90">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className={`rounded ${
                              i === 0 || i === 2 || i === 6 || i === 8 
                                ? 'bg-[#0D47A1]' 
                                : i === 4 
                                  ? 'bg-[#1E88E5]' 
                                  : 'bg-slate-300'
                            }`} style={{ margin: '1px' }}></div>
                          ))}
                        </div>
                        <span className="absolute bg-[#0D47A1] text-white px-2 py-0.5 rounded text-[8px] font-bold">BHIM UPI QR</span>
                      </div>
                    </div>
                    
                    <h4 className="text-sm font-bold text-slate-800 mb-1">Gafoor Heights Co-operative Bank AC</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Bank Name: <strong>Pune Cooperative Bank Ltd.</strong>
                      <br />Account Name: <strong>Gafoor Heights Maintenance Fund</strong>
                      <br />AC Number: <strong>501066023910</strong>
                      <br />IFSC Code: <strong>PUNB0COOP51</strong>
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-[#1E88E5] font-bold">
                    Scan using PhonePe, GPay, Paytm or Any UPI App
                  </div>
                </div>

                {/* Verification parameters uploader form */}
                <form onSubmit={handleSubmitPayment} className="space-y-4 text-slate-700">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dues Month Selection</label>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#1E88E5]"
                    >
                      <option value="June 2026">June 2026</option>
                      <option value="July 2026">July 2026 (Upcoming)</option>
                      <option value="August 2026">August 2026</option>
                      <option value="Overdue Clear">Clear Outstanding Overdue Balance (Bulk)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Amount Paid (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                      <input 
                        type="number" 
                        value={payAmount} 
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="200"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1E88E5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bank Transaction ID / UPI Ref No.</label>
                    <input 
                      type="text" 
                      value={transactionId} 
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 617290192801"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm font-mono font-semibold uppercase focus:outline-none focus:border-[#1E88E5] placeholder:text-slate-350"
                    />
                  </div>

                  {/* Screenshot upload tool */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Upload Receipt Screenshot</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer bg-slate-100 border border-slate-250 hover:bg-slate-200 text-slate-650 px-4 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all">
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>{screenshotName ? 'Change Image' : 'Select File'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            className="hidden" 
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoScreenshot}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 transition-all"
                        >
                          Auto Generate Mock
                        </button>
                      </div>

                      {screenshotName && (
                        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {screenshotName} (ready)
                        </p>
                      )}

                      {screenshotBase64 && (
                        <div className="p-2 border border-slate-150 rounded-lg bg-slate-50 max-w-[200px]">
                          <img src={screenshotBase64} alt="Screenshot Preview" className="h-14 w-auto rounded border" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-full bg-[#1E88E5] hover:bg-[#1670c2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-150 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:bg-slate-300 text-slate-50 disabled:cursor-not-allowed"
                  >
                    {submittingPayment ? 'Submitting verification...' : 'Submit Payment For Verification'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </div>
          )}

          {/* TAB: PAYMENT HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Wallet className="w-5 h-5 text-[#1E88E5]" />
                    Registered Outlay and Statements
                  </h3>
                  <p className="text-slate-500 text-xs">View all payment records tracked against flat registry.</p>
                </div>
                
                {/* Filters */}
                <div className="flex items-center gap-1 border border-slate-150 rounded-lg p-1 bg-slate-50">
                  <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                  <button 
                    onClick={() => setHistoryFilter('all')}
                    className={`px-2 py-1 rounded text-[10px] font-bold capitalize ${
                      historyFilter === 'all' ? 'bg-[#1E88E5] text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    All Time
                  </button>
                  <button 
                    onClick={() => setHistoryFilter('monthly')}
                    className={`px-2 py-1 rounded text-[10px] font-bold capitalize ${
                      historyFilter === 'monthly' ? 'bg-[#1E88E5] text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs">No payment filings recorded for this flat registration yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b">
                      <tr>
                        <th className="py-2.5 px-3">Transaction Month</th>
                        <th className="py-2.5 px-3">UPI ID Reference</th>
                        <th className="py-2.5 px-3">Date Submitted</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Approval Gate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments
                        .filter(p => {
                          if (historyFilter === 'monthly') {
                            // simple mock filter current month June/July
                            return p.month.includes('2026');
                          }
                          return true;
                        })
                        .map((pay) => (
                          <tr key={pay.paymentId} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-semibold text-slate-800">{pay.month}</td>
                            <td className="py-3 px-3 font-mono text-slate-500 uppercase font-medium">{pay.transactionId}</td>
                            <td className="py-3 px-3 slate-400">{pay.paymentDate}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">₹{pay.amount}.00</td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                pay.status === 'Approved' 
                                  ? 'bg-green-50 text-green-600 border border-green-150' 
                                  : pay.status === 'Rejected' 
                                    ? 'bg-red-50 text-red-600 border border-red-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {pay.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                                {pay.status === 'Rejected' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                {pay.status === 'Pending Verification' && <Clock className="w-3 h-3 text-amber-500 animate-spin" />}
                                {pay.status}
                              </span>
                              {pay.rejectionReason && (
                                <p className="text-[10px] text-red-500 mt-1">Reason: {pay.rejectionReason}</p>
                              )}
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: PDF RECEIPTS */}
          {activeTab === 'receipts' && (
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <ReceiptText className="w-5 h-5 text-[#1E88E5]" />
                Official Society Verification Receipts
              </h3>
              <p className="text-slate-500 text-xs mb-6">PDF receipt indexes generate automatically upon verification of ledger payments.</p>

              {receipts.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <ReceiptText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs">Approved payments generate print ready downloads here. Verify a submission above first!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {receipts.map((rec) => (
                    <div 
                      key={rec.receiptNumber} 
                      className="p-4 border border-slate-150 rounded-xl bg-slate-50 hover-shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-2 mb-3">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#1E88E5]">{rec.receiptNumber}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">UPI Ref: {rec.transactionId}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-800 text-right">INR {rec.amount}.00</span>
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-500 space-y-1">
                        <p>Resident: <strong className="text-slate-700">{rec.residentName}</strong></p>
                        <p>Unit No: <strong className="text-slate-705">Wing {rec.flatNumber}</strong></p>
                        <p>Payment cleared on: {rec.paymentDate}</p>
                        <p>Verified of record: {rec.verificationDate}</p>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-150">
                        <button
                          onClick={() => handlePrintReceipt(rec)}
                          className="flex-1 text-center font-bold bg-[#1E88E5] text-white hover:bg-[#1670c2] py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF Download
                        </button>
                        <button
                          onClick={() => alert(`Official Receipt link shared to: thesocialoceanfirm@gmail.com!`)}
                          className="font-bold border border-slate-200 bg-white text-slate-650 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTICE BOARD */}
          {activeTab === 'notices' && (
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Megaphone className="w-5 h-5 text-[#1E88E5]" />
                Official Announcements & Advisories
              </h3>
              <p className="text-slate-500 text-xs mb-6">Critical information regarding society maintenance events, water, Lifts, and welfare meetings.</p>

              {notices.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs">No open notices currently declared on the board.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <div key={notice.noticeId} className="p-4 border border-slate-150 rounded-xl bg-white hover:bg-slate-50/50 transition-all">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                          {notice.createdBy}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {new Date(notice.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">{notice.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{notice.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: COMPLAINTS HUB */}
          {activeTab === 'complaints' && (
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-[#1E88E5]" />
                Resident Complaints Ticketing
              </h3>
              <p className="text-slate-500 text-xs mb-6">File civic issues instantly. Society board and plumber/security/electricians review updates on priority.</p>

              {complaintError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs leading-relaxed mb-4 border border-red-105">
                  {complaintError}
                </div>
              )}
              {complaintSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs leading-relaxed mb-6 border border-green-150">
                  {complaintSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Submit new complaint form */}
                <form onSubmit={handleSubmitComplaint} className="space-y-4 text-slate-700">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Civil Category</label>
                    <select
                      value={compCategory}
                      onChange={(e: any) => setCompCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-[#1E88E5]"
                    >
                      <option value="Water Issue">Water Issue</option>
                      <option value="Lift Issue">Lift Issue</option>
                      <option value="Parking Issue">Parking Issue</option>
                      <option value="Security Issue">Security Issue</option>
                      <option value="Electricity Issue">Electricity Issue</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Issue Title (Brief summary)</label>
                    <input
                      type="text"
                      value={compTitle}
                      onChange={(e) => setCompTitle(e.target.value)}
                      placeholder="e.g. Toilet/Kitchen pipeline leaking"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-[#1E88E5] placeholder:text-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Details & Location Description</label>
                    <textarea
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      rows={3}
                      placeholder="Provide precise details of the plumbing/lift breakdown..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-[#1E88E5] placeholder:text-slate-350 resize-y"
                    ></textarea>
                  </div>

                  {/* Attachment optional */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Photo Attachment (Optional)</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAutoComplaintPhoto}
                        className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-650 px-4 py-2 rounded-xl text-xs font-bold transition-all transition-colors flex items-center justify-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Attach Demo Proof Photo
                      </button>
                      {compPhoto && (
                        <div className="h-10 w-10 border rounded bg-slate-100 p-0.5">
                          <img src={compPhoto} alt="Issues proof preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingComplaint}
                    className="w-full bg-[#1E88E5] hover:bg-[#1670c2] text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-150 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {submittingComplaint ? 'Filing Issue...' : 'Submit Issue to Society board'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>

                {/* Tracking panel */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Your Active / Past Tickets</h4>
                  
                  {complaints.length === 0 ? (
                    <div className="p-6 border border-slate-150 text-slate-400 text-center rounded-xl bg-slate-50/50">
                      <HelpCircle className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                      <p className="text-[11px]">You have no registered complaints currently filed.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {complaints.map((comp) => (
                        <div key={comp.complaintId} className="p-3.5 border border-slate-150 rounded-xl bg-slate-50 relative">
                          <div className="flex justify-between items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-slate-700">{comp.category}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              comp.status === 'Resolved' 
                                ? 'bg-green-50 text-green-600 border border-green-150' 
                                : comp.status === 'In Progress' 
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : comp.status === 'Closed'
                                    ? 'bg-slate-200 text-slate-600'
                                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                            }`}>
                              {comp.status}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 truncate">{comp.title}</h5>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{comp.description}</p>
                          <div className="text-[9px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                            <span>Logged: {new Date(comp.createdDate).toLocaleDateString()}</span>
                            <span>ID: {comp.complaintId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB: CONTACT COMMITTEE */}
          {activeTab === 'contacts' && (
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <PhoneCall className="w-5 h-5 text-[#1E88E5]" />
                Gafoor Heights Managing Committee Pune
              </h3>
              <p className="text-slate-500 text-xs mb-6">Reach out to the authorized representative board at Gafoor Heights Co-Op Pune for help or emergency support.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { role: 'Chairman', name: 'Mr. Ravindra Dixit', phone: '9822156821', email: 'dixit.r@gafoorheights.com', available: 'Wing A-302' },
                  { role: 'Secretary', name: 'Mr. Sandeep Patil', phone: '9822451002', email: 'patil.s@gafoorheights.com', available: 'Wing B-101' },
                  { role: 'Treasurer', name: 'Mrs. Smita Deshmukh', phone: '9822391099', email: 'smita@gafoorheights.com', available: 'Wing A-504' },
                  { role: 'Main Gate Security Office', name: 'Security Guard Gate 1', phone: '020-25661022', email: 'security@gafoorheights.com', available: '24/7 Hours Onboard' },
                  { role: 'Electrician Pune MSEDCL', name: 'Local Society On-call Electrician', phone: '9422019283', email: 'electricity@gafoorheights.com', available: '9 AM - 6 PM Office' },
                  { role: 'Emergency Water Tanker', name: 'PMC Water Tank Supply Line', phone: '020-24401928', email: 'waterdept@pmc.in', available: 'Municipal Line Authority' },
                ].map((co, i) => (
                  <div key={i} className="p-4 border border-slate-150 rounded-xl bg-slate-50 hover-shadow-sm transition-all flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-[#1E88E5] uppercase tracking-wider bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">{co.role}</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-2">{co.name}</h4>
                      <p className="text-slate-500 text-[11px] mt-1">{co.available}</p>
                      <p className="text-slate-500 text-[11px] truncate font-mono mt-0.5">{co.email}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-150 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-700">{co.phone}</span>
                      <a 
                        href={`tel:${co.phone}`}
                        onClick={(e) => { e.preventDefault(); alert(`Simulated calling Dialing ${co.phone}...`); }}
                        className="bg-[#1E88E5] hover:bg-[#1670c2] text-white p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 select-none transition-all cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      </main>

    </div>
  );
}
