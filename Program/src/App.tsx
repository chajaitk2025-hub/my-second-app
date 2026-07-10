import React, { useState, useEffect } from 'react';
import { INITIAL_LETTERS, DEFAULT_INSPECTORS_POOL, INITIAL_LEAVE_REQUESTS } from './data';
import { CooperativeLetter, Inspector, LeaveRequest } from './types';
import CalendarView from './components/CalendarView';
import InspectorPool from './components/InspectorPool';
import LetterEditor from './components/LetterEditor';
import LetterPreview from './components/LetterPreview';
import LoginScreen from './components/LoginScreen';
import LeaveRequestForm from './components/LeaveRequestForm';
import WorkingPaperGenerator from './components/WorkingPaperGenerator';
import MonthlyReportGenerator from './components/MonthlyReportGenerator';
import PresentationSlides from './components/PresentationSlides';
import EmailSettings from './components/EmailSettings';
import UserManagement from './components/UserManagement';
import { 
  LayoutDashboard, Users, FileText, Calendar, ShieldCheck, 
  Sparkles, Compass, CheckCircle, Clock, ChevronRight, ChevronDown, Menu, X, Printer, LogOut,
  FileSignature, FileSpreadsheet, Presentation, Mail
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('app_authenticated') === 'true';
  });

  const [currentUsername, setCurrentUsername] = useState(() => {
    return localStorage.getItem('app_user') || 'PEAR';
  });

  const [currentUserDisplay, setCurrentUserDisplay] = useState(() => {
    return localStorage.getItem('app_user_display') || 'คุณ PEAR (เจ้าของระบบ)';
  });

  // Try to load from localStorage first, otherwise use default
  const [letters, setLetters] = useState<CooperativeLetter[]>(() => {
    const saved = localStorage.getItem('inspection_letters');
    return saved ? JSON.parse(saved) : INITIAL_LETTERS;
  });

  const [inspectorPool, setInspectorPool] = useState<Omit<Inspector, 'id'>[]>(() => {
    const saved = localStorage.getItem('inspector_pool');
    return saved ? JSON.parse(saved) : DEFAULT_INSPECTORS_POOL;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leave_requests');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pool' | 'leave' | string>('dashboard');
  const [workingPaperTab, setWorkingPaperTab] = useState<'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve'>('bank');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('inspection_letters', JSON.stringify(letters));
  }, [letters]);

  useEffect(() => {
    localStorage.setItem('inspector_pool', JSON.stringify(inspectorPool));
  }, [inspectorPool]);

  useEffect(() => {
    localStorage.setItem('leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  // Handle team setup links securely and support Unicode characters (Thai)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedUsers = params.get('setup_users');
    if (encodedUsers) {
      try {
        // Decode Base64 safely supporting UTF-8 Thai characters
        const binaryString = atob(encodedUsers);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedStr = new TextDecoder().decode(bytes);
        const importedUsers = JSON.parse(decodedStr);

        if (Array.isArray(importedUsers) && importedUsers.length > 0) {
          const existingUsersStr = localStorage.getItem('tk_users');
          const existingUsers = existingUsersStr ? JSON.parse(existingUsersStr) : [];
          
          // Merge by username, prioritizing imported users
          const mergedUsersMap = new Map();
          existingUsers.forEach((u: any) => {
            if (u && u.username) mergedUsersMap.set(u.username.toLowerCase(), u);
          });
          importedUsers.forEach((u: any) => {
            if (u && u.username) mergedUsersMap.set(u.username.toLowerCase(), u);
          });
          
          const mergedUsers = Array.from(mergedUsersMap.values());
          localStorage.setItem('tk_users', JSON.stringify(mergedUsers));
          
          alert(`🎉 ติดตั้งบัญชีผู้ใช้งานสำหรับทีมงานสำเร็จเรียบร้อยแล้ว!\nจำนวนผู้ใช้ที่อัปเดต: ${importedUsers.length} คน\nคุณสามารถใช้ชื่อผู้ใช้งานและรหัสผ่านเข้าสู่ระบบได้ทันที`);
          
          // Remove query param from URL without reloading
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      } catch (err) {
        console.error('Failed to parse setup_users parameter', err);
        alert('ลิงก์ตั้งค่าไม่ถูกต้องหรือข้อมูลเสียหาย กรุณาให้คุณ PEAR ส่งลิงก์ใหม่อีกครั้ง');
      }
    }
  }, []);

  // Update a single letter
  const handleUpdateLetter = (updatedLetter: CooperativeLetter) => {
    setLetters(prev => prev.map(l => l.id === updatedLetter.id ? updatedLetter : l));
  };

  // Find the selected letter if activeTab matches a letter ID
  const selectedLetter = letters.find(l => l.id === activeTab);

  // Stats calculation
  const totalLetters = letters.length;
  const totalInspectorsCount = inspectorPool.length;
  const totalInspectionDays = letters.reduce((acc, curr) => {
    // Basic calculation of days from text like "6 - 7 กรกฎาคม" or "12"
    const text = curr.inspectionDatesText;
    if (text.includes('-')) {
      const parts = text.split('-').map(p => parseInt(p.trim()));
      if (parts.length === 2) return acc + (parts[1] - parts[0] + 1);
    }
    return acc + 1;
  }, 0);

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLoginSuccess={() => {
          setCurrentUsername(localStorage.getItem('app_user') || 'PEAR');
          setCurrentUserDisplay(localStorage.getItem('app_user_display') || 'คุณ PEAR (เจ้าของระบบ)');
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden selection:bg-emerald-100">
      
      {/* Top Header Navigation - Hidden on Print */}
      <header className="no-print bg-white border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between sticky top-0 z-40 doc-shadow">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all flex items-center justify-center border border-slate-200/50 hover:text-emerald-700 bg-slate-50/50 hover:shadow-sm"
            title={sidebarOpen ? "ซ่อนเมนูหลัก" : "แสดงเมนูหลัก"}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl doc-shadow">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
                ระบบงานตรวจกิจการ
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold font-mono">
                  สายตรวจเฉลิมรัตน์
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                การเข้าตรวจรอบบัญชีประจำเดือนมิถุนายน 2569 (ตารางงาน ก.ค. 2569)
              </p>
            </div>
          </div>
        </div>

        {/* Header Stats Pill */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-sans">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500">รอบตรวจ:</span>
            <span className="font-bold text-slate-800">มิ.ย. 2569</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500">รายการงาน:</span>
            <span className="font-bold text-slate-800">{totalLetters} สหกรณ์</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/50 border border-emerald-100/30 rounded-lg text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-500 text-[11px] font-semibold">ผู้ใช้งาน:</span>
            <span className="font-extrabold text-emerald-700">{currentUserDisplay}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative">
        
        {/* Left Sidebar Navigation - Hidden on Print */}
        <aside 
          className={`no-print bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 h-[calc(100vh-65px)] sticky top-[65px] transition-all duration-300 z-30 ${
            sidebarOpen 
              ? 'w-72 translate-x-0 lg:relative absolute left-0' 
              : 'w-0 -translate-x-full absolute overflow-hidden border-r-0'
          }`}
        >
          {/* Menu Items */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            
            {/* General Navigation */}
            <div className="space-y-2">
              <h3 className="px-3 text-base font-extrabold text-slate-800 tracking-wider mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-1.5 h-4 bg-emerald-600 rounded-full inline-block shrink-0 animate-pulse"></span>
                <span>เมนูหลัก</span>
              </h3>
              
              {/* Menu Item 1 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  แดชบอร์ด & ตารางงานปฏิทิน
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <LayoutDashboard className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>แดชบอร์ด & ตารางงานปฏิทิน</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 2 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('pool');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'pool' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  จัดการบุคลากรสายตรวจ
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <Users className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>จัดการบุคลากรสายตรวจ</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 3 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('leave');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'leave' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileSignature className="w-4 h-4" />
                  ใบลาป่วย ลากิจ ลาพักร้อน
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <FileSignature className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>ใบลาป่วย ลากิจ ลาพักร้อน</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 4 */}
              <div className="w-full space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('working_paper');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'working_paper' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>สร้างกระดาษทำการ ตรวจกิจการ</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${activeTab === 'working_paper' ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
                </button>

                {/* Sub-menus shown when main activeTab is 'working_paper' */}
                <div className={`pl-4 space-y-1 overflow-hidden transition-all duration-300 ${
                  activeTab === 'working_paper' ? 'max-h-80 opacity-100 mt-1 pb-1' : 'max-h-0 opacity-0 pointer-events-none'
                }`}>
                  {/* Sub-menu 1: กระดาษทำการเงินฝากธนาคาร */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('bank');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'bank'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'bank' ? 'bg-white' : 'bg-slate-400'}`}></div>
                    <span className="text-left leading-tight">1. เงินฝากธนาคาร & สหกรณ์อื่น</span>
                  </button>

                  {/* Sub-menu 2: กระดาษทำการลูกหนี้ */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('debtor');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'debtor'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'debtor' ? 'bg-white' : 'bg-slate-400'}`}></div>
                    <span className="text-left leading-tight">2. กระดาษทำการลูกหนี้</span>
                  </button>

                  {/* Sub-menu 3 Header */}
                  <div className="pt-1.5 border-t border-slate-200/50 mt-1 pb-0.5">
                    <span className="px-3 text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                      3. หมวดหนี้สินและทุน
                    </span>
                  </div>

                  {/* Sub-menu 3a: กระดาษทำการเงินรับฝาก */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('deposit');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'deposit'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'deposit' ? 'bg-white' : 'bg-amber-500'}`}></div>
                    <span className="text-left leading-tight">3.1 เงินรับฝาก</span>
                  </button>

                  {/* Sub-menu 3b: กระดาษทำการเงินรับฝากสหกรณ์อื่น */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('deposit_other');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'deposit_other'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'deposit_other' ? 'bg-white' : 'bg-amber-500'}`}></div>
                    <span className="text-left leading-tight">3.2 เงินรับฝากสหกรณ์อื่น</span>
                  </button>

                  {/* Sub-menu 3c: กระดาษทำการเงินกู้ยืม */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('loan');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'loan'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'loan' ? 'bg-white' : 'bg-amber-500'}`}></div>
                    <span className="text-left leading-tight">3.3 เงินกู้ยืม</span>
                  </button>

                  {/* Sub-menu 3d: กระดาษทำการทุนเรือนหุ้น */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('share');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'share'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'share' ? 'bg-white' : 'bg-amber-500'}`}></div>
                    <span className="text-left leading-tight">3.4 ทุนเรือนหุ้น</span>
                  </button>

                  {/* Sub-menu 3e: กระดาษทำการทุนสะสม */}
                  <button
                    onClick={() => {
                      setActiveTab('working_paper');
                      setWorkingPaperTab('reserve');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      activeTab === 'working_paper' && workingPaperTab === 'reserve'
                        ? 'bg-emerald-600 text-white font-bold border-transparent shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === 'working_paper' && workingPaperTab === 'reserve' ? 'bg-white' : 'bg-amber-500'}`}></div>
                    <span className="text-left leading-tight">3.5 ทุนสะสม</span>
                  </button>
                </div>
              </div>

              {/* Menu Item 5 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('monthly_report');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'monthly_report' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  รายงานตรวจกิจการประจำเดือน
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <FileText className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>รายงานตรวจกิจการประจำเดือน</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 6 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('presentation_slides');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'presentation_slides' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Presentation className="w-4 h-4" />
                  งานนำเสนอรายงานตรวจกิจการ
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <Presentation className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>งานนำเสนอรายงานตรวจกิจการ</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 7 */}
              <div className="relative group w-full">
                <button
                  onClick={() => {
                    setActiveTab('email_settings');
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'email_settings' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  ตั้งค่าอีเมลแจ้งเตือน
                </button>
                {/* 2x Popup on Hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                  <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                  <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                    <Mail className="w-8 h-8 text-emerald-400 shrink-0" />
                    <span>ตั้งค่าอีเมลแจ้งเตือน</span>
                  </div>
                </div>
              </div>

              {/* Menu Item 8: จัดการผู้ใช้งาน (Admin Only) */}
              {currentUsername === 'PEAR' && (
                <div className="relative group w-full">
                  <button
                    onClick={() => {
                      setActiveTab('user_management');
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === 'user_management' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
                    จัดการผู้ใช้งานและอนุมัติสิทธิ์
                  </button>
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none drop-shadow-xl">
                    <div className="w-0 h-0 border-y-[10px] border-y-transparent border-r-[12px] border-r-slate-900"></div>
                    <div className="bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold text-[28px] whitespace-nowrap flex items-center gap-3 border border-slate-800 shadow-2xl">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                      <span>จัดการผู้ใช้งานและอนุมัติสิทธิ์</span>
                    </div>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Footer of Sidebar */}
          <div className="p-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-mono space-y-2 bg-slate-50/50">
            <div>บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด</div>
            <div className="font-sans text-[9px] text-slate-300">ระบบสร้างจดหมายเข้าตรวจกิจการ v1.0</div>
            <button
              onClick={() => {
                localStorage.removeItem('app_authenticated');
                localStorage.removeItem('app_user');
                localStorage.removeItem('app_user_display');
                setIsAuthenticated(false);
              }}
              className="w-full mt-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate"
              title={`ออกจากระบบ (${currentUsername})`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>ออกจากระบบ ({currentUsername})</span>
            </button>
          </div>
        </aside>

        {/* Content Viewport */}
        <main className="flex-1 min-w-0 relative">
          
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              
              {/* Visual Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 no-print">
                <div className="bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex items-center gap-4">
                  <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="text-xs text-slate-400 font-sans font-medium">สหกรณ์ที่ต้องเข้าตรวจทั้งหมด</div>
                    <div className="text-2xl font-bold text-slate-800 font-mono mt-0.5">{totalLetters} เล่ม</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex items-center gap-4">
                  <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Calendar className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="text-xs text-slate-400 font-sans font-medium">ระยะเวลาเข้าตรวจรวม</div>
                    <div className="text-2xl font-bold text-slate-800 font-mono mt-0.5">{totalInspectionDays} วัน</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex items-center gap-4">
                  <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Users className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="text-xs text-slate-400 font-sans font-medium">จำนวนคณะทำงานสายตรวจ</div>
                    <div className="text-2xl font-bold text-slate-800 font-mono mt-0.5">{totalInspectorsCount} ท่าน</div>
                  </div>
                </div>
              </div>

              {/* Calendar core Component */}
              <CalendarView 
                letters={letters} 
                onSelectLetter={(id) => setActiveTab(id)} 
                leaveRequests={leaveRequests}
                inspectorPool={inspectorPool}
              />
            </div>
          )}

          {/* Inspectors Pool View */}
          {activeTab === 'pool' && (
            <div className="p-6 max-w-4xl mx-auto no-print">
              <InspectorPool 
                pool={inspectorPool} 
                onUpdatePool={setInspectorPool} 
                letters={letters}
                leaveRequests={leaveRequests}
              />
            </div>
          )}

          {/* Leave Request Workspace */}
          {activeTab === 'leave' && (
            <LeaveRequestForm 
              leaveRequests={leaveRequests}
              onUpdateLeaveRequests={setLeaveRequests}
              inspectorPool={inspectorPool}
            />
          )}

          {/* Working Paper Workspace */}
          {activeTab === 'working_paper' && (
            <WorkingPaperGenerator 
              letters={letters} 
              activeTabProp={workingPaperTab} 
              onTabChangeProp={setWorkingPaperTab} 
            />
          )}

          {/* Monthly Report Workspace */}
          {activeTab === 'monthly_report' && (
            <MonthlyReportGenerator letters={letters} />
          )}

          {/* Presentation Slides Workspace */}
          {activeTab === 'presentation_slides' && (
            <PresentationSlides letters={letters} />
          )}

          {/* Email Settings Workspace */}
          {activeTab === 'email_settings' && (
            <div className="p-6 max-w-6xl mx-auto no-print">
              <EmailSettings pool={inspectorPool} onUpdatePool={setInspectorPool} />
            </div>
          )}

          {/* User Management Workspace (Admin Only) */}
          {activeTab === 'user_management' && currentUsername === 'PEAR' && (
            <UserManagement currentUsername={currentUsername} />
          )}

          {/* Letter Workspace (Selected letter) */}
          {selectedLetter && (
            <div className="grid grid-cols-1 xl:grid-cols-12 h-[calc(100vh-65px)] overflow-hidden">
              {/* Left Column: Editor (Col 5) */}
              <div className="xl:col-span-5 border-r border-slate-200/80 no-print">
                <LetterEditor 
                  letter={selectedLetter} 
                  onUpdateLetter={handleUpdateLetter} 
                  inspectorPool={inspectorPool}
                />
              </div>

              {/* Right Column: Live Printable Preview (Col 7) */}
              <div className="xl:col-span-7 h-full overflow-hidden flex flex-col">
                <LetterPreview letter={selectedLetter} />
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
