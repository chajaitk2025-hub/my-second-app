import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Bell, Send, CheckCircle2, AlertCircle, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Inspector } from '../types';

interface EmailSettingsProps {
  pool: Omit<Inspector, 'id'>[];
  onUpdatePool: (newPool: Omit<Inspector, 'id'>[]) => void;
}

interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  status: 'success' | 'failed';
  triggerType: string;
}

export default function EmailSettings({ pool, onUpdatePool }: EmailSettingsProps) {
  const [editingEmails, setEditingEmails] = useState<{ [key: string]: string }>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>(() => {
    const saved = localStorage.getItem('email_notification_logs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        timestamp: '2026-07-02 10:15:30',
        recipient: 'chajai.tk2025@gmail.com',
        subject: 'แจ้งเตือน: อัปเดตตารางเข้าตรวจประจำเดือน สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด',
        status: 'success',
        triggerType: 'อัปเดตตารางเข้าตรวจ'
      },
      {
        id: '2',
        timestamp: '2026-07-01 14:22:11',
        recipient: 'prangthip.e@tk-account.com',
        subject: 'แจ้งเตือน: อัปเดตตารางเข้าตรวจ สหกรณ์ออมทรัพย์พัฒนาองค์กรชุมชน จำกัด',
        status: 'success',
        triggerType: 'อัปเดตตารางเข้าตรวจ'
      }
    ];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('email_notification_rules');
    if (saved) return JSON.parse(saved);
    return {
      notifyOnLetterUpdate: true,
      notifyOnLeaveRequest: true,
      notifyOnWorkingPaperSave: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('email_notification_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('email_notification_rules', JSON.stringify(settings));
  }, [settings]);

  // Sync edits with pool on mount or pool change
  useEffect(() => {
    const initialEdits: { [key: string]: string } = {};
    pool.forEach((ins, idx) => {
      initialEdits[idx.toString()] = ins.email || '';
    });
    setEditingEmails(initialEdits);
  }, [pool]);

  const handleEmailChange = (index: number, val: string) => {
    setEditingEmails(prev => ({ ...prev, [index.toString()]: val }));
  };

  const handleSaveEmail = (index: number) => {
    const updatedPool = [...pool];
    updatedPool[index].email = editingEmails[index.toString()];
    onUpdatePool(updatedPool);
    
    // Show Toast
    setSuccessToast(`บันทึกอีเมลสำหรับ ${pool[index].name} เรียบร้อยแล้ว`);
    setTimeout(() => setSuccessToast(null), 3000);

    // Append Log
    const newLog: EmailLog = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleString('th-TH'),
      recipient: editingEmails[index.toString()] || 'ไม่มีอีเมล',
      subject: `ระบบทดสอบ: ปรับปรุงการตั้งค่าแจ้งเตือนของคุณสำเร็จ`,
      status: editingEmails[index.toString()] ? 'success' : 'failed',
      triggerType: 'แก้ไขผู้ใช้'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleSendTestEmail = (index: number) => {
    const targetEmail = editingEmails[index.toString()];
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('กรุณากรอกรูปแบบอีเมลให้ถูกต้องเพื่อทดสอบส่ง');
      return;
    }

    setSuccessToast(`ส่งอีเมลทดสอบระบบความปลอดภัยสำเร็จไปยัง ${targetEmail}`);
    setTimeout(() => setSuccessToast(null), 4000);

    const newLog: EmailLog = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleString('th-TH'),
      recipient: targetEmail,
      subject: `[TEST ALERT] อีเมลทดสอบการแจ้งเตือนสายตรวจ - บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด`,
      status: 'success',
      triggerType: 'ทดสอบการส่ง'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{successToast}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 doc-shadow">
        <div className="flex items-start gap-4">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Mail className="w-6 h-6" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-800">ตั้งค่าอีเมลและการแจ้งเตือนอัตโนมัติ</h2>
            <p className="text-sm text-slate-500 font-medium">
              จัดการที่อยู่อีเมลสำหรับแจ้งเตือนเจ้าหน้าที่สายตรวจและกำหนดเงื่อนไขการส่งข้อมูลโดยอัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Email Mapping */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 doc-shadow overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                รายชื่อผู้ตรวจสอบและที่ตั้งค่าอีเมลรายบุคคล
              </h3>
              <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                จำนวน {pool.length} ท่าน
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {pool.map((ins, idx) => {
                const isChalermrat = ins.name.includes('เฉลิมรัตน์');
                return (
                  <div key={idx} className={`p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isChalermrat ? 'bg-emerald-50/30' : 'hover:bg-slate-50/30'}`}>
                    <div className="space-y-1 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-base">{ins.name}</span>
                        {isChalermrat && (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                            บัญชีหัวหน้าสายตรวจ (เฉลิมรัตน์)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{ins.title}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="email" 
                          value={editingEmails[idx.toString()] || ''}
                          placeholder="ยังไม่มีอีเมล (กรุณากรอก)"
                          onChange={(e) => handleEmailChange(idx, e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-700"
                        />
                      </div>

                      <button 
                        onClick={() => handleSaveEmail(idx)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                      >
                        บันทึก
                      </button>

                      <button 
                        onClick={() => handleSendTestEmail(idx)}
                        title="ทดสอบส่งอีเมลแจ้งเตือน"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shrink-0 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger Rules Settings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 doc-shadow space-y-4">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              เงื่อนไขการส่งการแจ้งเตือนอัตโนมัติ (Automated Notification Triggers)
            </h3>
            
            <div className="space-y-3.5 pt-2">
              <label className="flex items-start gap-3 p-3 border border-slate-100 hover:border-emerald-100 rounded-xl hover:bg-emerald-50/10 cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={settings.notifyOnLetterUpdate}
                  onChange={(e) => setSettings({ ...settings, notifyOnLetterUpdate: e.target.checked })}
                  className="mt-1 accent-emerald-600 h-4 w-4 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">แจ้งเตือนเมื่อมีการออกหรือแก้ไขหนังสือเข้าตรวจกิจการ</span>
                  <span className="text-xs text-slate-400 block mt-0.5">ส่งจดหมายแจ้งกำหนดการและรายชื่อสายตรวจที่เกี่ยวข้องทันทีเมื่อผู้จัดทำคลิกบันทึกจดหมาย</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-slate-100 hover:border-emerald-100 rounded-xl hover:bg-emerald-50/10 cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={settings.notifyOnLeaveRequest}
                  onChange={(e) => setSettings({ ...settings, notifyOnLeaveRequest: e.target.checked })}
                  className="mt-1 accent-emerald-600 h-4 w-4 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">แจ้งเตือนเมื่อมีผู้จัดทำใบลาป่วย/ลากิจ/ลาพักร้อน</span>
                  <span className="text-xs text-slate-400 block mt-0.5">ส่งเอกสารคำขอใบลาไปยังหัวหน้าสายตรวจเฉลิมรัตน์ (chajai.tk2025@gmail.com) อัตโนมัติเพื่อรอการพิจารณาอนุมัติ</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-slate-100 hover:border-emerald-100 rounded-xl hover:bg-emerald-50/10 cursor-pointer transition-all">
                <input 
                  type="checkbox" 
                  checked={settings.notifyOnWorkingPaperSave}
                  onChange={(e) => setSettings({ ...settings, notifyOnWorkingPaperSave: e.target.checked })}
                  className="mt-1 accent-emerald-600 h-4 w-4 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">แจ้งเตือนเมื่อมีการบันทึกกระดาษทำการ (Working Papers)</span>
                  <span className="text-xs text-slate-400 block mt-0.5">แจ้งยอดบัญชีเงินฝาก ทุนเรือนหุ้น และผลต่างที่ตรวจพบให้กับผู้ตรวจสอบหัวหน้าทีมทันทีที่สรุปรายงานตรวจเสร็จ</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Send Log */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 doc-shadow p-5 flex flex-col h-[520px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                ประวัติการแจ้งเตือน (Notification Logs)
              </h3>
              <button 
                onClick={clearLogs}
                className="text-slate-400 hover:text-rose-500 transition-all text-xs font-bold"
              >
                ล้างข้อมูล
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-bold">ไม่มีข้อมูลประวัติแจ้งเตือน</p>
                  <p className="text-[10px]">เมื่อมีการอัปเดตงาน ประวัติการแจ้งเตือนอีเมลจะถูกจำลองแสดงผลที่นี่</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="p-3 border border-slate-100 rounded-xl space-y-1.5 text-xs hover:border-emerald-100 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{log.timestamp}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {log.status === 'success' ? 'ส่งสำเร็จ' : 'ล้มเหลว'}
                      </span>
                    </div>
                    <p className="font-extrabold text-slate-800 leading-normal">{log.subject}</p>
                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="text-slate-400">ผู้รับ: <span className="font-mono text-slate-600 font-bold">{log.recipient}</span></span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{log.triggerType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 mt-3 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block">
                * จำลองการส่งจริงผ่านเซิร์ฟเวอร์แจ้งเตือนจำกัดของ TK Account
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
