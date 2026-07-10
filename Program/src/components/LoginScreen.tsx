import React, { useState } from 'react';
import { Compass, Lock, User, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a tiny delay for high-quality professional loading feel
    setTimeout(() => {
      const trimmedUser = username.trim();
      if (trimmedUser === 'PEAR' && password === 'chajai6499') {
        localStorage.setItem('app_authenticated', 'true');
        localStorage.setItem('app_user', 'PEAR');
        localStorage.setItem('app_user_display', 'คุณ PEAR (เจ้าของระบบ)');
        onLoginSuccess();
        return;
      }

      // Check registered users in tk_users
      const savedUsersStr = localStorage.getItem('tk_users');
      const savedUsers = savedUsersStr ? JSON.parse(savedUsersStr) : [];
      const matchedUser = savedUsers.find(
        (u: any) => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password === password
      );

      if (matchedUser) {
        if (!matchedUser.isApproved) {
          setError('บัญชีผู้ใช้งานนี้ถูกระงับการเข้าใช้ชั่วคราว กรุณาติดต่อผู้ดูแลระบบ (คุณ PEAR)');
          setIsLoading(false);
          return;
        }
        localStorage.setItem('app_authenticated', 'true');
        localStorage.setItem('app_user', matchedUser.username);
        localStorage.setItem('app_user_display', matchedUser.displayName);
        onLoginSuccess();
      } else {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/50 doc-shadow p-8 flex flex-col gap-6 relative z-10 animate-scaleIn transition-all">
        
        {/* Company Identity */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-3.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
              บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
            </h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
              TK Account & Associate CO.,Ltd.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100/50">
              <Lock className="w-3 h-3" /> ระบบแจ้งวันเข้าตรวจกิจการ (สายตรวจเฉลิมรัตน์)
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ระบุชื่อผู้ใช้ของคุณ"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium"
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านเข้าใช้งาน"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-all"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังยืนยันตัวตน...</span>
              </div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบอย่างปลอดภัย</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[11px] text-slate-400 font-medium space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100/80">
          <div>ระบบรักษาความปลอดภัยจำกัดสิทธิ์เฉพาะผู้ลงทะเบียนเท่านั้น</div>
          <div className="text-emerald-600 font-extrabold text-[10px] mt-1 leading-normal">
            💡 สำหรับทีมงานต่างเครื่อง: กรุณาขอ "ลิงก์แชร์สิทธิ์สำหรับทีมงาน" จากคุณ PEAR เพื่อกดติดตั้งสิทธิ์และล็อกอินในบราวเซอร์ของท่านได้ทันที
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center text-slate-500 text-xs font-mono space-y-1 z-10">
        <div>© 2026 TK Account & Associate CO.,Ltd. All rights reserved.</div>
        <div className="text-[10px] text-slate-600">สายตรวจตรวจสอบกิจการ เฉลิมรัตน์</div>
      </div>
    </div>
  );
}
