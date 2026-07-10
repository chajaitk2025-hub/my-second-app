import React, { useState, useRef, useEffect } from 'react';
import { LeaveRequest, Inspector, LeaveStatRow } from '../types';
import { 
  Printer, Plus, Trash2, Save, FileText, ZoomIn, ZoomOut, RotateCcw, 
  Copy, Check, AlertTriangle, FileSpreadsheet, UserCheck, CalendarDays,
  Phone, Briefcase, FileSignature, CheckSquare, Square
} from 'lucide-react';

interface LeaveRequestFormProps {
  leaveRequests: LeaveRequest[];
  onUpdateLeaveRequests: (requests: LeaveRequest[]) => void;
  inspectorPool: Omit<Inspector, 'id'>[];
}

export default function LeaveRequestForm({ 
  leaveRequests, 
  onUpdateLeaveRequests, 
  inspectorPool 
}: LeaveRequestFormProps) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    return leaveRequests[0]?.id || '';
  });

  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const currentRequest = leaveRequests.find(r => r.id === selectedId) || leaveRequests[0];

  const handleUpdateCurrent = (updated: LeaveRequest) => {
    const next = leaveRequests.map(r => r.id === updated.id ? updated : r);
    onUpdateLeaveRequests(next);
  };

  const handleCreateNew = () => {
    const newId = `leave-${Date.now()}`;
    const newRequest: LeaveRequest = {
      id: newId,
      dateText: 'วันที่ 30 เดือน มิถุนายน พ.ศ. 2569',
      subject: 'ขออนุญาตลากิจ',
      recipient: 'ผู้จัดการ',
      employeeName: inspectorPool[0]?.name || 'นางสาวเฉลิมรัตน์ ใจดี',
      employeeTitle: inspectorPool[0]?.title || 'หัวหน้าสายตรวจสอบ',
      leaveType: 'personal',
      reason: 'ไปงานกิจกรรมโรงเรียนบุตร',
      delegateName: inspectorPool[3]?.name || 'นางสาวปรางทิพย์ เอียดเหตุ',
      hasLastLeave: false,
      lastLeaveType: '',
      lastLeaveStart: '',
      lastLeaveEnd: '',
      lastLeaveDays: '',
      contactAddress: '',
      contactPhone: '062-8954792',
      delegateSignName: '',
      approvalStatus: 'pending',
      approvalReason: '',
      stats: {
        sick: { taken: '-', current: '-', total: '-' },
        personal: { taken: '-', current: '1', total: '1' },
        vacation: { taken: '2', current: '-', total: '2' },
      },
      checkerName: '',
      approverName: 'นางสาวคณพิชญ์ ศรีสง่า',
    };
    onUpdateLeaveRequests([...leaveRequests, newRequest]);
    setSelectedId(newId);
  };

  const handleDeleteRequest = (id: string) => {
    if (leaveRequests.length <= 1) {
      alert('จำเป็นต้องมีใบลาอย่างน้อย 1 รายการ');
      return;
    }
    const next = leaveRequests.filter(r => r.id !== id);
    onUpdateLeaveRequests(next);
    if (selectedId === id) {
      setSelectedId(next[0].id);
    }
  };

  const handlePrint = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else {
      window.print();
    }
  };

  const handleCopyText = () => {
    if (!currentRequest) return;
    const typeLabel = currentRequest.leaveType === 'sick' ? 'ลาป่วย' : currentRequest.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักร้อน';
    
    const plainText = `
บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
ใบลาป่วย ลากิจ ลาพักร้อน

${currentRequest.dateText}
เรื่อง ${currentRequest.subject}
เรียน ${currentRequest.recipient}

ข้าพเจ้า ${currentRequest.employeeName} ตำแหน่ง ${currentRequest.employeeTitle}
ขอลา ${typeLabel} เนื่องจาก ${currentRequest.reason}
ผู้รักษาการแทน: ${currentRequest.delegateName || '-'}

ข้อมูลสถิติการลา:
- ลาป่วย: ลามาแล้ว ${currentRequest.stats.sick.taken} วัน, ครั้งนี้ ${currentRequest.stats.sick.current} วัน, รวมเป็น ${currentRequest.stats.sick.total} วัน
- ลากิจ: ลามาแล้ว ${currentRequest.stats.personal.taken} วัน, ครั้งนี้ ${currentRequest.stats.personal.current} วัน, รวมเป็น ${currentRequest.stats.personal.total} วัน
- ลาพักร้อน: ลามาแล้ว ${currentRequest.stats.vacation.taken} วัน, ครั้งนี้ ${currentRequest.stats.vacation.current} วัน, รวมเป็น ${currentRequest.stats.vacation.total} วัน

เบอร์โทรศัพท์ติดต่อ: ${currentRequest.contactPhone}
ขอแสดงความนับถือ
(${currentRequest.employeeName})
    `.trim();

    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentRequest) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 h-[calc(100vh-65px)] overflow-hidden">
      
      {/* LEFT COLUMN: EDITOR (xl:col-span-5) */}
      <div className="xl:col-span-5 border-r border-slate-200/80 bg-white flex flex-col h-full overflow-hidden no-print">
        
        {/* Editor Title/Selector Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-800 truncate">จัดการข้อมูลใบลา</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNew}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer doc-shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มใบลาใหม่
            </button>
          </div>
        </div>

        {/* Selected Leave Picker */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30 shrink-0">
          <span className="text-xs font-bold text-slate-500 shrink-0">เลือกใบลาที่แก้ไข:</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {leaveRequests.map((req) => (
              <option key={req.id} value={req.id}>
                {req.employeeName} ({req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักร้อน'} - {req.dateText.replace('วันที่ ', '')})
              </option>
            ))}
          </select>
          <button
            onClick={() => handleDeleteRequest(selectedId)}
            disabled={leaveRequests.length <= 1}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="ลบใบลาใบนี้"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Editor Form Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* Section: General Info */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <CalendarDays className="w-4 h-4" />
              ข้อมูลเอกสารหลัก
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">วันที่เขียนใบลา (แสดงที่หัวจดหมาย)</label>
                <input
                  type="text"
                  value={currentRequest.dateText}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, dateText: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                  placeholder="เช่น วันที่ 30 เดือน มิถุนายน พ.ศ. 2569"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">เรื่อง</label>
                <input
                  type="text"
                  value={currentRequest.subject}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, subject: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500">เรียน</label>
                <input
                  type="text"
                  value={currentRequest.recipient}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, recipient: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Employee Info */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <UserCheck className="w-4 h-4" />
              ผู้ขอลาและตำแหน่ง
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">เลือกพนักงาน (จากฐานบุคลากร)</label>
                <select
                  onChange={(e) => {
                    const selected = inspectorPool.find(ins => ins.name === e.target.value);
                    if (selected) {
                      handleUpdateCurrent({
                        ...currentRequest,
                        employeeName: selected.name,
                        employeeTitle: selected.title
                      });
                    }
                  }}
                  value={inspectorPool.some(ins => ins.name === currentRequest.employeeName) ? currentRequest.employeeName : ''}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white"
                >
                  <option value="">-- หรือพิมพ์ชื่อเองด้านล่าง --</option>
                  {inspectorPool.map((ins, idx) => (
                    <option key={idx} value={ins.name}>{ins.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ชื่อผู้ลา (ระบุเอง)</label>
                <input
                  type="text"
                  value={currentRequest.employeeName}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, employeeName: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ตำแหน่งงาน</label>
                <input
                  type="text"
                  value={currentRequest.employeeTitle}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, employeeTitle: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Leave Type & Details */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <Briefcase className="w-4 h-4" />
              ข้อมูลประเภทการลาและเหตุผล
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ประเภทการลาปัจจุบัน</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sick', 'personal', 'vacation'] as const).map((type) => {
                    const label = type === 'sick' ? 'ลาป่วย' : type === 'personal' ? 'ลากิจ' : 'ลาพักร้อน';
                    const active = currentRequest.leaveType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleUpdateCurrent({ ...currentRequest, leaveType: type })}
                        className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                          active 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">เนื่องจาก (เหตุผลการลา)</label>
                <textarea
                  value={currentRequest.reason}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, reason: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 h-16 resize-none"
                  placeholder="เช่น ไปงานกิจกรรมโรงเรียนบุตร"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ผู้รักษาการแทน (ชื่อเพื่อนร่วมงาน)</label>
                <select
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, delegateName: e.target.value })}
                  value={currentRequest.delegateName}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {inspectorPool.map((ins, idx) => (
                    <option key={idx} value={ins.name}>{ins.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={currentRequest.delegateName}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, delegateName: e.target.value })}
                  className="mt-1 w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                  placeholder="พิมพ์กรณีไม่มีในตัวเลือก"
                />
              </div>

              <div className="space-y-1 pt-1.5 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500">วันที่ลาบนปฏิทิน (เฉพาะตัวเลขวันที่ในเดือนกรกฎาคม 2569)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={currentRequest.leaveCalendarDay || ''}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, leaveCalendarDay: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white"
                  placeholder="เช่น 27 หรือ 31 (เว้นว่างไว้เพื่อไม่ให้ขึ้นบนปฏิทิน)"
                />
                <span className="text-[10px] text-slate-400 block leading-tight">หากใบลาได้รับการอนุมัติ และระบุวันที่นี้ จะไปปรากฏบน ปฏิทินแดชบอร์ด อัตโนมัติ</span>
              </div>
            </div>
          </div>

          {/* Section: Leave Statistics */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              แก้ไขตารางสถิติการลา
            </div>

            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 block leading-tight">ระบุตัวเลขหรือเครื่องหมายขีด ( - ) ในตารางสถิติตามการลาจริง</span>

              {/* Sick Leave Stats */}
              <div className="space-y-1 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700">ลาป่วย</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลามาแล้ว (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.sick.taken}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, sick: { ...currentRequest.stats.sick, taken: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลาครั้งนี้ (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.sick.current}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, sick: { ...currentRequest.stats.sick, current: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">รวมเป็น (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.sick.total}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, sick: { ...currentRequest.stats.sick, total: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Leave Stats */}
              <div className="space-y-1 border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700">ลากิจ (4 วัน/ปี)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลามาแล้ว (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.personal.taken}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, personal: { ...currentRequest.stats.personal, taken: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลาครั้งนี้ (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.personal.current}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, personal: { ...currentRequest.stats.personal, current: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">รวมเป็น (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.personal.total}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, personal: { ...currentRequest.stats.personal, total: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Vacation Leave Stats */}
              <div className="space-y-1 pb-1">
                <span className="text-xs font-bold text-slate-700">ลาพักร้อน (6 วัน/ปี)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลามาแล้ว (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.vacation.taken}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, vacation: { ...currentRequest.stats.vacation, taken: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">ลาครั้งนี้ (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.vacation.current}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, vacation: { ...currentRequest.stats.vacation, current: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold block">รวมเป็น (วัน)</label>
                    <input
                      type="text"
                      value={currentRequest.stats.vacation.total}
                      onChange={(e) => {
                        const newStats = { ...currentRequest.stats, vacation: { ...currentRequest.stats.vacation, total: e.target.value } };
                        handleUpdateCurrent({ ...currentRequest, stats: newStats });
                      }}
                      className="w-full text-xs border border-slate-200 rounded p-1 text-center bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact & History */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <Phone className="w-4 h-4" />
              การติดต่อ & สถิติก่อนหน้า
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={currentRequest.contactPhone}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, contactPhone: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                  placeholder="เช่น 062-8954792"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hasLastLeave"
                  checked={currentRequest.hasLastLeave}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, hasLastLeave: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="hasLastLeave" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  แสดงข้อมูลการลาครั้งสุดท้าย (ระบุวันในใบลา)
                </label>
              </div>

              {currentRequest.hasLastLeave && (
                <div className="p-3 bg-white border border-slate-100 rounded-lg space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">ประเภทลาล่าสุด</label>
                      <select
                        value={currentRequest.lastLeaveType}
                        onChange={(e) => handleUpdateCurrent({ ...currentRequest, lastLeaveType: e.target.value as any })}
                        className="w-full border border-slate-200 rounded p-1.5 text-xs"
                      >
                        <option value="">(ไม่เลือก)</option>
                        <option value="sick">ป่วย</option>
                        <option value="personal">ลากิจ</option>
                        <option value="vacation">ลาพักร้อน</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">จำนวนวัน</label>
                      <input
                        type="text"
                        value={currentRequest.lastLeaveDays}
                        onChange={(e) => handleUpdateCurrent({ ...currentRequest, lastLeaveDays: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1 text-xs"
                        placeholder="เช่น 1 หรือ -"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">ตั้งแต่วันที่</label>
                      <input
                        type="text"
                        value={currentRequest.lastLeaveStart}
                        onChange={(e) => handleUpdateCurrent({ ...currentRequest, lastLeaveStart: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1 text-xs font-mono"
                        placeholder="เช่น 2 มิ.ย. 2569"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-bold">ถึงวันที่</label>
                      <input
                        type="text"
                        value={currentRequest.lastLeaveEnd}
                        onChange={(e) => handleUpdateCurrent({ ...currentRequest, lastLeaveEnd: e.target.value })}
                        className="w-full border border-slate-200 rounded p-1 text-xs font-mono"
                        placeholder="เช่น 3 มิ.ย. 2569"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Checker & Signatures */}
          <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 border-b border-emerald-100/50 pb-1.5">
              <FileSignature className="w-4 h-4" />
              การลงนามอนุมัติ & การเซ็นตรวจสอบ
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-bold text-slate-500">ผลการอนุมัติใบลา</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'approved', 'not_approved'] as const).map((status) => {
                    const label = status === 'pending' ? 'รอพิจารณา' : status === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ';
                    const active = currentRequest.approvalStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleUpdateCurrent({ ...currentRequest, approvalStatus: status })}
                        className={`py-1.5 px-2 text-xs font-bold border rounded-lg transition-all cursor-pointer ${
                          active 
                            ? 'bg-amber-600 border-amber-600 text-white' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {currentRequest.approvalStatus === 'not_approved' && (
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-bold text-slate-500">ระบุเหตุผลที่ไม่อนุมัติ</label>
                  <input
                    type="text"
                    value={currentRequest.approvalReason}
                    onChange={(e) => handleUpdateCurrent({ ...currentRequest, approvalReason: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                    placeholder="เช่น ขาดกำลังพลผู้ปฏิบัติงานแทน"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ชื่อผู้ตรวจสอบ</label>
                <input
                  type="text"
                  value={currentRequest.checkerName}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, checkerName: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                  placeholder="ปล่อยว่าง หรือ ใส่ชื่อผู้รับเรื่อง"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">ชื่อผู้อนุมัติ</label>
                <input
                  type="text"
                  value={currentRequest.approverName}
                  onChange={(e) => handleUpdateCurrent({ ...currentRequest, approverName: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500"
                  placeholder="เช่น นางสาวคณพิชญ์ ศรีสง่า"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: HIGH-FIDELITY PREVIEW & PRINT WORKSPACE (xl:col-span-7) */}
      <div className="xl:col-span-7 h-full overflow-hidden flex flex-col bg-slate-100 border-l border-slate-200/80">
        
        {/* Preview Control Bar - Hidden on Print */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">A4 พรีวิวใบลา (WYSIWYG)</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-thai border border-emerald-100">
              มาตราส่วน 1:1
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-lg border border-slate-200/50">
              <button 
                onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 hover:bg-white text-slate-500 rounded-md transition-all cursor-pointer"
                title="ย่อขนาดพรีวิว"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setScale(1)}
                className="p-1 hover:bg-white text-[10px] font-mono font-bold text-slate-500 rounded-md transition-all px-1.5 cursor-pointer"
                title="รีเซ็ตขนาด"
              >
                {Math.round(scale * 100)}%
              </button>
              <button 
                onClick={() => setScale(prev => Math.min(1.4, prev + 0.1))}
                className="p-1 hover:bg-white text-slate-500 rounded-md transition-all cursor-pointer"
                title="ขยายพรีวิว"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Action buttons */}
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
              title="คัดลอกข้อความทั้งหมด"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 border border-slate-800 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer doc-shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              สั่งพิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>

        {/* Live A4 Interactive Screen Canvas */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start no-print">
          <div 
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            className="transition-transform duration-100"
          >
            {/* Margins styled according to strict AGENTS.md standards: left/right: 18mm, top/bottom: 20mm */}
            <div className="print-page bg-white w-[210mm] min-h-[297mm] p-[20mm_18mm_20mm_18mm] doc-shadow relative flex flex-col justify-between text-black text-left select-text font-thai">
              
              <div className="space-y-5">
                {/* Header (No logo as per instruction, styled elegantly and centered for formal leave forms) */}
                <div className="text-center font-thai pb-3 border-b-2 border-dashed border-slate-300">
                  <div className="text-[18pt] font-extrabold tracking-wide text-black leading-tight">
                    บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
                  </div>
                  <div className="text-[16pt] font-extrabold text-black mt-1 leading-normal tracking-wide">
                    ใบลาป่วย ลากิจ ลาพักร้อน
                  </div>
                </div>

                {/* Date line */}
                <div className="flex justify-end text-[16pt] text-black">
                  <span>{currentRequest.dateText}</span>
                </div>

                {/* Subject & Recipient Block */}
                <div className="space-y-1 text-[16pt] text-black">
                  <div className="flex gap-1.5">
                    <span className="font-extrabold shrink-0">เรื่อง</span>
                    <span>{currentRequest.subject}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="font-extrabold shrink-0">เรียน</span>
                    <span>{currentRequest.recipient}</span>
                  </div>
                </div>

                {/* Leave Applicant Line */}
                <div className="text-[16pt] text-black text-justify leading-relaxed" style={{ textIndent: '2.5em' }}>
                  ข้าพเจ้า <span className="font-bold">{currentRequest.employeeName}</span> ตำแหน่ง <span className="font-bold">{currentRequest.employeeTitle}</span>
                </div>

                {/* Leave Request Selections */}
                <div className="space-y-2 text-[16pt] text-black">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">ขอลา</span>
                    <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono">
                      {currentRequest.leaveType === 'sick' ? '✓' : ' '}
                    </span>
                    <span>ป่วย</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mt-2">
                        {currentRequest.leaveType === 'personal' ? '✓' : ' '}
                      </span>
                      <div className="flex-1">
                        <span>ลากิจ เนื่องจาก <span className="border-b border-dotted border-black/60 px-2 min-w-[200px] inline-block">{currentRequest.reason || ''}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono">
                      {currentRequest.leaveType === 'vacation' ? '✓' : ' '}
                    </span>
                    <span>ลาพักร้อน</span>
                  </div>
                </div>

                {/* Previous leaves history info */}
                <div className="text-[16pt] text-black leading-relaxed" style={{ textIndent: '2.5em' }}>
                  <span>ข้าพเจ้าได้ลา</span>
                  <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'sick' ? '✓' : ' '}
                  </span>
                  <span>ป่วย</span>

                  <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'personal' ? '✓' : ' '}
                  </span>
                  <span>ลากิจ</span>

                  <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'vacation' ? '✓' : ' '}
                  </span>
                  <span>ลาพักร้อน</span>

                  <span className="ml-1.5">ครั้งสุดท้ายตั้งแต่วันที่</span>
                  <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[80px] text-center">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveStart ? currentRequest.lastLeaveStart : '................-.................'}
                  </span>
                  <span>ถึงวันที่</span>
                  <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[80px] text-center">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveEnd ? currentRequest.lastLeaveEnd : '....................-.....................'}
                  </span>
                  <span>มีกำหนด</span>
                  <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[30px] text-center">
                    {currentRequest.hasLastLeave && currentRequest.lastLeaveDays ? currentRequest.lastLeaveDays : '.....-.......'}
                  </span>
                  <span>วัน</span>
                </div>

                {/* Emergency contact info */}
                <div className="space-y-1.5 text-[16pt] text-black">
                  <div>
                    ในระหว่างลาติดต่อข้าพเจ้าได้ที่ <span className="border-b border-dotted border-black px-2 inline-block min-w-[300px]">{currentRequest.contactAddress || '..................................................................'}</span> 
                    &nbsp;&nbsp;เบอร์โทรศัพท์ <span className="border-b border-dotted border-black px-2 inline-block font-bold">{currentRequest.contactPhone || '.............................................'}</span>
                  </div>
                  <div>
                    ผู้รักษาการแทนข้าพเจ้าชื่อ <span className="border-b border-dotted border-black px-2 inline-block min-w-[400px] font-bold">{currentRequest.delegateName || '................................................................................................................'}</span>
                  </div>
                </div>

                {/* Respect closing */}
                <div className="flex flex-col items-end pr-12 text-[16pt] text-black space-y-8 pt-2">
                  <div className="text-center w-[180px]">ขอแสดงความนับถือ</div>
                  <div className="text-center w-[180px] space-y-1">
                    <div>(ลงชื่อ)...........................................................</div>
                    <div className="font-bold">({currentRequest.employeeName})</div>
                  </div>
                </div>

                {/* Approval selections */}
                <div className="flex items-start gap-12 text-[16pt] text-black pt-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-mono">
                      {currentRequest.approvalStatus === 'approved' ? '✓' : ' '}
                    </span>
                    <span className="font-extrabold">อนุมัติ</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-mono mt-1.5">
                      {currentRequest.approvalStatus === 'not_approved' ? '✓' : ' '}
                    </span>
                    <div>
                      <span className="font-extrabold">ไม่อนุมัติ</span> 
                      <span> เหตุผล <span className="border-b border-dotted border-black px-2 inline-block min-w-[150px]">{currentRequest.approvalReason || '.................................................'}</span></span>
                    </div>
                  </div>
                </div>

                {/* Statistics block */}
                <div className="space-y-1 pt-1">
                  <h3 className="text-[16pt] font-extrabold text-black">สถิติการลา</h3>
                  <table className="w-full border-collapse border border-black text-[16pt] text-center text-black">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="border border-black py-1 px-2 text-left font-extrabold">ประเภท</th>
                        <th className="border border-black py-1 px-2 w-[110px] font-extrabold">ลามาแล้ว</th>
                        <th className="border border-black py-1 px-2 w-[110px] font-extrabold">ลาครั้งนี้</th>
                        <th className="border border-black py-1 px-2 w-[110px] font-extrabold">รวมเป็น</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black py-1 px-2 text-left">ลาป่วย</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.taken}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.current}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.total}</td>
                      </tr>
                      <tr>
                        <td className="border border-black py-1 px-2 text-left">ลากิจ (4 วัน/ปี)</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.taken}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.current}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.total}</td>
                      </tr>
                      <tr>
                        <td className="border border-black py-1 px-2 text-left">ลาพักร้อน (6 วัน/ปี)</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.taken}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.current}</td>
                        <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Disclaimers / Conditions */}
                <div className="text-[14pt] text-black leading-tight space-y-0.5">
                  <p>*ลากิจ ลาพักร้อน แจ้งล่วงหน้ากับฝ่ายบุคคล 3 วัน /แจ้งหัวหน้าและผู้ที่เกี่ยวข้องทราบล่วงหน้าเช่นเดียวกัน</p>
                  <p>กรณีข้าพเจ้าใช้สิทธิ์ลา โดยไม่แจ้งล่วงหน้า 3 วัน ข้าพเจ้าพินยอมให้บริษัทฯ หักค่าแรงในวันดังกล่าว ก่อนจ่ายเงินเดือน</p>
                </div>

                {/* Checker & Approver Signatures */}
                <div className="grid grid-cols-2 gap-4 text-[16pt] text-black pt-2">
                  <div className="space-y-1">
                    <div>ผู้ตรวจสอบ.......................................................</div>
                    <div>วันที่........................................</div>
                  </div>
                  <div className="space-y-1 text-right pr-6">
                    <div>(ลงชื่อ)...........................................ผู้อนุมัติ</div>
                    <div className="pr-12 font-bold">( {currentRequest.approverName || '.................................................'} )</div>
                    <div>วันที่............/................./.............</div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

      {/* CHANNELS EXCLUSIVELY FOR PRINT STYLING - DISPLAY: BLOCK FOR PRINTING */}
      <div className="hidden print:block print-container">
        <div className="print-page bg-white text-black text-left font-thai" style={{ padding: '20mm 18mm 20mm 18mm' }}>
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center font-thai pb-3 border-b-2 border-dashed border-black">
              <div className="text-[18pt] font-extrabold tracking-wide text-black leading-tight">
                บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
              </div>
              <div className="text-[16pt] font-extrabold text-black mt-1 leading-normal tracking-wide">
                ใบลาป่วย ลากิจ ลาพักร้อน
              </div>
            </div>

            {/* Date line */}
            <div className="flex justify-end text-[16pt] text-black">
              <span>{currentRequest.dateText}</span>
            </div>

            {/* Subject & Recipient Block */}
            <div className="space-y-1 text-[16pt] text-black">
              <div className="flex gap-1.5">
                <span className="font-extrabold shrink-0">เรื่อง</span>
                <span>{currentRequest.subject}</span>
              </div>
              <div className="flex gap-1.5">
                <span className="font-extrabold shrink-0">เรียน</span>
                <span>{currentRequest.recipient}</span>
              </div>
            </div>

            {/* Leave Applicant Line */}
            <div className="text-[16pt] text-black text-justify leading-relaxed" style={{ textIndent: '2.5em' }}>
              ข้าพเจ้า <span className="font-bold">{currentRequest.employeeName}</span> ตำแหน่ง <span className="font-bold">{currentRequest.employeeTitle}</span>
            </div>

            {/* Leave Request Selections */}
            <div className="space-y-2 text-[16pt] text-black">
              <div className="flex items-center gap-2">
                <span className="font-extrabold">ขอลา</span>
                <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono">
                  {currentRequest.leaveType === 'sick' ? '✓' : ' '}
                </span>
                <span>ป่วย</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mt-2">
                    {currentRequest.leaveType === 'personal' ? '✓' : ' '}
                  </span>
                  <div className="flex-1">
                    <span>ลากิจ เนื่องจาก <span className="border-b border-dotted border-black px-2 min-w-[200px] inline-block">{currentRequest.reason || ''}</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono">
                  {currentRequest.leaveType === 'vacation' ? '✓' : ' '}
                </span>
                <span>ลาพักร้อน</span>
              </div>
            </div>

            {/* Previous leaves history info */}
            <div className="text-[16pt] text-black leading-relaxed" style={{ textIndent: '2.5em' }}>
              <span>ข้าพเจ้าได้ลา</span>
              <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'sick' ? '✓' : ' '}
              </span>
              <span>ป่วย</span>

              <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'personal' ? '✓' : ' '}
              </span>
              <span>ลากิจ</span>

              <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-bold font-mono mx-1.5">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveType === 'vacation' ? '✓' : ' '}
              </span>
              <span>ลาพักร้อน</span>

              <span className="ml-1.5">ครั้งสุดท้ายตั้งแต่วันที่</span>
              <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[80px] text-center">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveStart ? currentRequest.lastLeaveStart : '................-.................'}
              </span>
              <span>ถึงวันที่</span>
              <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[80px] text-center">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveEnd ? currentRequest.lastLeaveEnd : '....................-.....................'}
              </span>
              <span>มีกำหนด</span>
              <span className="border-b border-dotted border-black px-1.5 font-bold mx-1 inline-block min-w-[30px] text-center">
                {currentRequest.hasLastLeave && currentRequest.lastLeaveDays ? currentRequest.lastLeaveDays : '.....-.......'}
              </span>
              <span>วัน</span>
            </div>

            {/* Emergency contact info */}
            <div className="space-y-1.5 text-[16pt] text-black">
              <div>
                ในระหว่างลาติดต่อข้าพเจ้าได้ที่ <span className="border-b border-dotted border-black px-2 inline-block min-w-[300px]">{currentRequest.contactAddress || '..................................................................'}</span> 
                &nbsp;&nbsp;เบอร์โทรศัพท์ <span className="border-b border-dotted border-black px-2 inline-block font-bold">{currentRequest.contactPhone || '.............................................'}</span>
              </div>
              <div>
                ผู้รักษาการแทนข้าพเจ้าชื่อ <span className="border-b border-dotted border-black px-2 inline-block min-w-[400px] font-bold">{currentRequest.delegateName || '................................................................................................................'}</span>
              </div>
            </div>

            {/* Respect closing */}
            <div className="flex flex-col items-end pr-12 text-[16pt] text-black space-y-8 pt-2">
              <div className="text-center w-[180px]">ขอแสดงความนับถือ</div>
              <div className="text-center w-[180px] space-y-1">
                <div>(ลงชื่อ)...........................................................</div>
                <div className="font-bold">({currentRequest.employeeName})</div>
              </div>
            </div>

            {/* Approval selections */}
            <div className="flex items-start gap-12 text-[16pt] text-black pt-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-mono">
                  {currentRequest.approvalStatus === 'approved' ? '✓' : ' '}
                </span>
                <span className="font-extrabold">อนุมัติ</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center border border-black w-4 h-4 text-xs font-mono mt-1.5">
                  {currentRequest.approvalStatus === 'not_approved' ? '✓' : ' '}
                </span>
                <div>
                  <span className="font-extrabold">ไม่อนุมัติ</span> 
                  <span> เหตุผล <span className="border-b border-dotted border-black px-2 inline-block min-w-[150px]">{currentRequest.approvalReason || '.................................................'}</span></span>
                </div>
              </div>
            </div>

            {/* Statistics block */}
            <div className="space-y-1 pt-1">
              <h3 className="text-[16pt] font-extrabold text-black">สถิติการลา</h3>
              <table className="w-full border-collapse border border-black text-[16pt] text-center text-black">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="border border-black py-1 px-2 text-left font-extrabold">ประเภท</th>
                    <th className="border border-black py-1 px-2 w-[110px] font-extrabold">ลามาแล้ว</th>
                    <th className="border border-black py-1 px-2 w-[110px] font-extrabold">ลาครั้งนี้</th>
                    <th className="border border-black py-1 px-2 w-[110px] font-extrabold">รวมเป็น</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black py-1 px-2 text-left">ลาป่วย</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.taken}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.current}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.sick.total}</td>
                  </tr>
                  <tr>
                    <td className="border border-black py-1 px-2 text-left">ลากิจ (4 วัน/ปี)</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.taken}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.current}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.personal.total}</td>
                  </tr>
                  <tr>
                    <td className="border border-black py-1 px-2 text-left">ลาพักร้อน (6 วัน/ปี)</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.taken}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.current}</td>
                    <td className="border border-black py-1 px-2 font-bold">{currentRequest.stats.vacation.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Disclaimers / Conditions */}
            <div className="text-[14pt] text-black leading-tight space-y-0.5">
              <p>*ลากิจ ลาพักร้อน แจ้งล่วงหน้ากับฝ่ายบุคคล 3 วัน /แจ้งหัวหน้าและผู้ที่เกี่ยวข้องทราบล่วงหน้าเช่นเดียวกัน</p>
              <p>กรณีข้าพเจ้าใช้สิทธิ์ลา โดยไม่แจ้งล่วงหน้า 3 วัน ข้าพเจ้าพินยอมให้บริษัทฯ หักค่าแรงในวันดังกล่าว ก่อนจ่ายเงินเดือน</p>
            </div>

            {/* Checker & Approver Signatures */}
            <div className="grid grid-cols-2 gap-4 text-[16pt] text-black pt-2">
              <div className="space-y-1">
                <div>ผู้ตรวจสอบ.......................................................</div>
                <div>วันที่........................................</div>
              </div>
              <div className="space-y-1 text-right pr-6">
                <div>(ลงชื่อ)...........................................ผู้อนุมัติ</div>
                <div className="pr-12 font-bold">( {currentRequest.approverName || '.................................................'} )</div>
                <div>วันที่............/................./.............</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal Guide when in Iframe */}
      {showIframeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 doc-shadow text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">กรุณาเปิดแอปบนแท็บใหม่เพื่อสั่งพิมพ์ / บันทึก PDF</h3>
              <p className="text-xs text-slate-500 leading-relaxed text-justify">
                เนื่องจากเบราว์เซอร์ของคุณจำกัดการสั่งพิมพ์เอกสารผ่านหน้าต่างย่อย (Iframe Preview) เพื่อความปลอดภัย 
                กรุณาคลิกปุ่มด้านล่างเพื่อเปิดแอปพลิเคชันบนแท็บใหม่เต็มหน้าจอ จากนั้นจะสามารถคลิกสั่งพิมพ์ใบลาออกเป็น PDF ได้ทันทีอย่างสวยงาม!
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowIframeModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
              <a 
                href={window.location.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 doc-shadow cursor-pointer"
              >
                เปิดบนแท็บใหม่
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
