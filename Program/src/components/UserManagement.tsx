import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Key, Trash2, CheckCircle, XCircle, 
  Lock, AlertTriangle, Check, UserCheck, ShieldCheck, UserX, Info, Share2
} from 'lucide-react';

export interface TKUser {
  id: string;
  username: string;
  displayName: string;
  password?: string; // stored plainly in localstorage since it is local client-side only
  isApproved: boolean;
  createdAt: string;
}

interface UserManagementProps {
  currentUsername: string;
}

export default function UserManagement({ currentUsername }: UserManagementProps) {
  const [users, setUsers] = useState<TKUser[]>(() => {
    const saved = localStorage.getItem('tk_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Save to localStorage whenever user list changes
  useEffect(() => {
    localStorage.setItem('tk_users', JSON.stringify(users));
  }, [users]);

  const handleCopySetupLink = () => {
    if (users.length === 0) {
      alert('กรุณาเพิ่มบัญชีผู้ใช้งานทีมงานก่อนคัดลอกลิงก์');
      return;
    }

    try {
      // Safe UTF-8 Base64 encoding for Thai characters
      const stringData = JSON.stringify(users);
      const utf8Bytes = new TextEncoder().encode(stringData);
      const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
      const encoded = btoa(binaryString);

      const shareUrl = `${window.location.origin}${window.location.pathname}?setup_users=${encoded}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        alert('คัดลอกลิงก์ตั้งค่าระบบสำหรับทีมงานสำเร็จแล้ว!\n\nกรุณาส่งลิงก์นี้ให้ทีมงานของคุณเพื่อให้พวกเขาเปิดลิงก์นี้ในเบราว์เซอร์ของตัวเอง ระบบจะติดตั้งบัญชีและสิทธิ์อนุมัติให้อัตโนมัติทันที');
      }).catch(err => {
        console.error('Failed to copy', err);
        window.prompt('คัดลอกลิงก์ติดตั้งระบบด้านล่างนี้ และส่งให้ทีมงาน:', shareUrl);
      });
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างลิงก์ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Clean inputs
    const trimmedUsername = newUsername.trim();
    const trimmedDisplayName = newDisplayName.trim();

    if (!trimmedUsername || !trimmedDisplayName || !newPassword) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
      return;
    }

    // Check limit of 5 users
    if (users.length >= 5) {
      setError('ไม่สามารถเพิ่มผู้ใช้งานได้เกิน 5 คน (ระบบจำกัดผู้ใช้งานภายนอกไว้สูงสุด 5 คนเท่านั้น)');
      return;
    }

    // Check if username already exists
    if (trimmedUsername.toLowerCase() === 'pear') {
      setError('ไม่สามารถใช้ชื่อผู้ใช้งาน "PEAR" ได้ เนื่องจากเป็นของเจ้าของระบบหลัก');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase())) {
      setError(`ชื่อผู้ใช้งาน "${trimmedUsername}" มีอยู่ในระบบแล้ว`);
      return;
    }

    const newUser: TKUser = {
      id: Math.random().toString(36).substring(2, 9),
      username: trimmedUsername,
      displayName: trimmedDisplayName,
      password: newPassword,
      isApproved: true, // Auto approved on creation since PEAR is creating it
      createdAt: new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setUsers(prev => [...prev, newUser]);
    setNewUsername('');
    setNewDisplayName('');
    setNewPassword('');
    setSuccess(`เพิ่มผู้ใช้งาน "${trimmedDisplayName}" และอนุมัติเข้าใช้งานสำเร็จแล้ว`);
  };

  const handleDeleteUser = (id: string, displayName: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งาน "${displayName}" ออกจากระบบ?`)) {
      setUsers(prev => prev.filter(u => u.id !== id));
      setSuccess(`ลบผู้ใช้งาน "${displayName}" สำเร็จ`);
    }
  };

  const toggleApproval = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const nextState = !u.isApproved;
        return { ...u, isApproved: nextState };
      }
      return u;
    }));
  };

  const handleUpdatePassword = (id: string, currentDisplayName: string) => {
    const newPass = window.prompt(`ระบุรหัสผ่านใหม่สำหรับผู้ใช้ "${currentDisplayName}":`);
    if (newPass === null) return; // cancelled
    if (newPass.trim() === '') {
      alert('รหัสผ่านห้ามเป็นค่าว่าง');
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, password: newPass.trim() };
      }
      return u;
    }));
    setSuccess(`เปลี่ยนรหัสผ่านสำหรับ "${currentDisplayName}" สำเร็จแล้ว`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 no-print">
      
      {/* Header and intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">ระบบจัดการผู้ใช้งานและสิทธิ์การเข้าใช้งาน</h1>
            <p className="text-xs text-slate-500 mt-1">
              ผู้ดูแลระบบหลัก (<span className="font-bold text-emerald-600">{currentUsername}</span>) สามารถอนุมัติ จำกัดจำนวน หรือกำหนดชื่อผู้ใช้งานและรหัสผ่านเข้าใช้งานสำหรับบุคคลอื่นได้สูงสุด 5 คน
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="text-xs font-semibold text-slate-500">ผู้ใช้งานทั่วไป:</div>
          <div className="font-mono font-bold text-sm text-slate-700">
            <span className={users.length >= 5 ? "text-rose-600" : "text-emerald-600"}>{users.length}</span>
            <span className="text-slate-400"> / 5 คน</span>
          </div>
        </div>
      </div>

      {/* Share Setup Link Section */}
      {users.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-50 border border-emerald-100 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/10 shrink-0">
              <Share2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">ส่งลิงก์แชร์สิทธิ์การเข้าใช้งานให้ทีมงาน</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                เนื่องจากระบบทำงานบนบราวเซอร์แยกกัน (Local Storage) คุณ PEAR จะต้องส่งลิงก์พิเศษนี้ให้กับทีมงาน (2 คน) <br className="hidden sm:inline" />
                เมื่อพวกเขาเปิดลิงก์นี้ ระบบจะติดตั้งบัญชีผู้ใช้งานที่ได้รับอนุมัติในเครื่องของพวกเขาทันทีเพื่อเข้าล็อกอิน
              </p>
            </div>
          </div>
          <button
            onClick={handleCopySetupLink}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm cursor-pointer transition-all shrink-0 ${
              copiedLink 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                คัดลอกลิงก์สำเร็จ!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                คัดลอกลิงก์ตั้งค่าระบบสำหรับทีม
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: List of Users */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                รายชื่อผู้ใช้ที่ได้รับสิทธิ์เข้าใช้งานระบบ ({users.length} คน)
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto">
                  <UserX className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-400">ยังไม่มีผู้ใช้งานท่านอื่นในระบบขณะนี้</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  คุณสามารถเพิ่มข้อมูลบัญชีผู้ใช้ใหม่ให้กับทีมงานหรือบุคคลอื่นที่แถบเมนูด้านขวาเพื่อสิทธิ์เข้าดูและทำงานในระบบร่วมกันได้ทันที
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div key={user.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 truncate text-sm">
                          {user.displayName}
                        </span>
                        {user.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <UserCheck className="w-3 h-3" /> อนุมัติแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse">
                            <UserX className="w-3 h-3" /> ระงับสิทธิ์
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                        <div>Username: <span className="font-bold text-slate-700">{user.username}</span></div>
                        <div>Password: <span className="font-bold text-slate-700">{user.password}</span></div>
                        <div className="sm:col-span-2 text-[10px] text-slate-400">เพิ่มเมื่อ: {user.createdAt}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Toggle status */}
                      <button
                        onClick={() => toggleApproval(user.id)}
                        title={user.isApproved ? "ระงับการใช้งานชั่วคราว" : "อนุมัติเปิดให้ใช้งาน"}
                        className={`p-1.5 rounded-lg border transition-all ${
                          user.isApproved 
                            ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {user.isApproved ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>

                      {/* Edit password */}
                      <button
                        onClick={() => handleUpdatePassword(user.id, user.displayName)}
                        title="กำหนดรหัสผ่านใหม่"
                        className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      {/* Delete user */}
                      <button
                        onClick={() => handleDeleteUser(user.id, user.displayName)}
                        title="ลบผู้ใช้งานออกจากระบบ"
                        className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>คำแนะนำในการตรวจสอบและสิทธิ์ความปลอดภัย</span>
            </div>
            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4 leading-relaxed">
              <li>สิทธิ์ "PEAR" คือสิทธิ์ผู้ดูแลสูงสุด (Owner/Admin) สามารถจัดทำเอกสารและเข้าสู่เมนูบริหารจัดการผู้ใช้ระบบได้</li>
              <li>ผู้ใช้รายอื่นที่คุณเป็นคนอนุมัติ (สิทธิ์เข้าใช้งานทั่วไป) จะสามารถเข้าถึงฟังก์ชันงานทุกอย่างในระบบเพื่อความสะดวกและยืดหยุ่นในการทำงาน แต่จะ<b>ไม่สามารถเปิดหน้าระบบจัดการผู้ใช้</b>นี้ได้ เพื่อความปลอดภัยขั้นสูงสุด</li>
              <li>คุณสามารถเปิด-ปิดสิทธิ์ชั่วคราว (ระงับสิทธิ์) หรือลบผู้ใช้ได้ทันที และการตั้งค่าจะมีผลในการเข้าใช้ทันที</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Add User Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                ลงทะเบียนเพิ่มบัญชีผู้ใช้ใหม่
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดรหัสผ่านและการเข้าใช้สำหรับทีมงานตรวจสอบกิจการ
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  ชื่อเต็ม / ชื่อผู้ร่วมตรวจกิจการ
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  ชื่อผู้ใช้งานเพื่อล็อกอิน (Username)
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น SOMCHAI (ภาษาอังกฤษเท่านั้น)"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono font-medium"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  รหัสผ่านใช้งาน (Password)
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น tk123456"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={users.length >= 5}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserCheck className="w-4 h-4" />
                บันทึกและอนุมัติบัญชีผู้ใช้
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
