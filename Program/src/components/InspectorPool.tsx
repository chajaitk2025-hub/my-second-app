import React, { useState } from 'react';
import { Inspector, CooperativeLetter, LeaveRequest } from '../types';
import { 
  Users, Plus, Trash2, Edit3, Check, X, ShieldAlert, 
  Briefcase, Calendar, Award, Sparkles, LayoutGrid, List 
} from 'lucide-react';

interface InspectorPoolProps {
  pool: Omit<Inspector, 'id'>[];
  onUpdatePool: (updatedPool: Omit<Inspector, 'id'>[]) => void;
  letters?: CooperativeLetter[];
  leaveRequests?: LeaveRequest[];
}

export default function InspectorPool({ 
  pool, 
  onUpdatePool, 
  letters = [], 
  leaveRequests = [] 
}: InspectorPoolProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editEmail, setEditEmail] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('ผู้ตรวจสอบกิจการ');
  const [newEmail, setNewEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  const startEdit = (idx: number) => {
    setEditingIndex(idx);
    setEditName(pool[idx].name);
    setEditTitle(pool[idx].title);
    setEditEmail(pool[idx].email || '');
  };

  const saveEdit = (idx: number) => {
    if (!editName.trim()) return;
    const newPool = [...pool];
    newPool[idx] = { name: editName.trim(), title: editTitle, email: editEmail.trim() };
    onUpdatePool(newPool);
    setEditingIndex(null);
  };

  const deleteInspector = (idx: number) => {
    const newPool = pool.filter((_, i) => i !== idx);
    onUpdatePool(newPool);
  };

  const addInspector = () => {
    if (!newName.trim()) return;
    const newPool = [...pool, { name: newName.trim(), title: newTitle, email: newEmail.trim() }];
    onUpdatePool(newPool);
    setNewName('');
    setNewTitle('ผู้ตรวจสอบกิจการ');
    setNewEmail('');
    setIsAdding(false);
  };

  // Helper: Get initials of name for avatar (Thai)
  const getInitials = (fullName: string) => {
    const clean = fullName.replace(/นาย|นางสาว|นาง/g, '').trim();
    return clean.substring(0, 2);
  };

  // Helper: Get assignments for an inspector
  const getAssignments = (name: string) => {
    return letters.filter(letter => 
      letter.inspectors.some(ins => ins.name === name)
    );
  };

  // Helper: Get approved leaves for an inspector
  const getApprovedLeaves = (name: string) => {
    return leaveRequests.filter(req => 
      req.employeeName === name && req.approvalStatus === 'approved'
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 doc-shadow p-6 space-y-6">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            รายชื่อบุคลากรและบทบาทผู้ตรวจบัญชี
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            จัดการฐานข้อมูลบุคลากรในสายตรวจเพื่อวิเคราะห์ภาระงานและบันทึกข้อมูลอย่างเป็นเอกภาพ
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50 text-slate-500">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'board' ? 'bg-white text-emerald-600 shadow-xs' : 'hover:text-slate-700'
              }`}
              title="มุมมองบอร์ดรายละเอียด"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-emerald-600 shadow-xs' : 'hover:text-slate-700'
              }`}
              title="มุมมองตารางดั้งเดิม"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all font-sans cursor-pointer doc-shadow shrink-0"
            >
              <Plus className="w-4 h-4" /> เพิ่มรายชื่อใหม่
            </button>
          )}
        </div>
      </div>

      {/* Staff Summary Dashboard (Connected Data analysis) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
        <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-emerald-100/60 rounded-lg text-emerald-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">บุคลากรทั้งหมด</div>
            <div className="text-lg font-extrabold text-slate-800">{pool.length} คน</div>
          </div>
        </div>
        
        <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-indigo-100/60 rounded-lg text-indigo-700">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">สหกรณ์ที่ต้องดูแลรอบนี้</div>
            <div className="text-lg font-extrabold text-slate-800">{letters.length} แห่ง</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-xl flex items-center gap-3">
          <div className="p-3 bg-rose-100/60 rounded-lg text-rose-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">สถิติการลารับการอนุมัติ</div>
            <div className="text-lg font-extrabold text-slate-800">
              {leaveRequests.filter(req => req.approvalStatus === 'approved').length} รายการ
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 text-xs font-sans text-emerald-800 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-emerald-900 text-sm">ข้อกำหนดการบันทึกรูปแบบชื่อ (TK Guidelines):</div>
          <p className="leading-relaxed">
            ระบบจัดทำรายละเอียดบุคลากรตามที่คุณกำหนด (เฉลิมรัตน์ ใจดี, ปรีดี ศรีเหมือนทอง, เจษฎา พูลสุข, ปรางทิพย์ เอียดเหตุ, กิตติพิชญ์ ยอดเพชร)
          </p>
        </div>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-4 gap-4 font-sans text-sm animate-fadeIn">
          <div className="space-y-1.5 col-span-1">
            <label className="block text-xs font-bold text-slate-600">ชื่อ - นามสกุล</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น นายสมชาย หมายดี"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-bold text-slate-700"
            />
          </div>
          <div className="space-y-1.5 col-span-1">
            <label className="block text-xs font-bold text-slate-600">อีเมลสำหรับแจ้งเตือน</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="เช่น chajai.tk2025@gmail.com"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-bold text-slate-700"
            />
          </div>
          <div className="space-y-1.5 col-span-1">
            <label className="block text-xs font-bold text-slate-600">ตำแหน่ง / บทบาท</label>
            <select
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-bold text-slate-700"
            >
              <option value="ผู้ตรวจสอบกิจการ">ผู้ตรวจสอบกิจการ</option>
              <option value="หัวหน้าสายตรวจสอบ">หัวหน้าสายตรวจสอบ</option>
              <option value="ผู้ช่วยผู้ตรวจสอบกิจการ">ผู้ช่วยผู้ตรวจสอบกิจการ</option>
              <option value="ผู้ช่วยตรวจกิจการ">ผู้ช่วยตรวจกิจการ</option>
              <option value="ผู้ช่วยตรวจสอบกิจการ">ผู้ช่วยตรวจสอบกิจการ</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-2 col-span-1">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={addInspector}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer doc-shadow"
            >
              บันทึกรายชื่อ
            </button>
          </div>
        </div>
      )}

      {/* View Mode content */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
          {pool.map((person, idx) => {
            const myLetters = getAssignments(person.name);
            const myLeaves = getApprovedLeaves(person.name);
            const activeEdit = editingIndex === idx;

            // Determine dynamic workload status color & text
            let statusBadgeColor = 'bg-slate-100 text-slate-600';
            let statusText = 'ไม่มีการมอบหมาย';
            if (myLetters.length === 1 || myLetters.length === 2) {
              statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100 border';
              statusText = 'กำลังปฏิบัติภารกิจ';
            } else if (myLetters.length >= 3) {
              statusBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-100 border';
              statusText = 'ภาระงานหนาแน่น';
            }

            return (
              <div 
                key={idx}
                className={`bg-white rounded-xl border border-slate-200/60 p-5 space-y-4 flex flex-col justify-between hover:border-emerald-300 transition-all ${
                  activeEdit ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                
                {/* Header Information */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100">
                      {getInitials(person.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {activeEdit ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs font-bold text-slate-800 w-full"
                          />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="อีเมลผู้ตรวจ (ถ้ามี)"
                            className="px-2 py-1 border border-slate-300 rounded text-[11px] font-semibold text-slate-600 w-full focus:outline-emerald-500 bg-white"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className="font-extrabold text-slate-800 truncate text-sm leading-tight">
                            {person.name}
                          </h3>
                          <span className="text-[10px] font-medium text-slate-500 block truncate max-w-full bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 mt-1 w-fit">
                            📧 {person.email || 'ไม่ได้ระบุอีเมล'}
                          </span>
                        </>
                      )}
                      
                      <div className="mt-1.5">
                        {activeEdit ? (
                          <select
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-[11px] font-bold text-slate-500 bg-white"
                          >
                            <option value="ผู้ตรวจสอบกิจการ">ผู้ตรวจสอบกิจการ</option>
                            <option value="หัวหน้าสายตรวจสอบ">หัวหน้าสายตรวจสอบ</option>
                            <option value="ผู้ช่วยผู้ตรวจสอบกิจการ">ผู้ช่วยผู้ตรวจสอบกิจการ</option>
                            <option value="ผู้ช่วยตรวจกิจการ">ผู้ช่วยตรวจกิจการ</option>
                            <option value="ผู้ช่วยตรวจสอบกิจการ">ผู้ช่วยตรวจสอบกิจการ</option>
                          </select>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 block">
                            {person.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Status / Workload */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                    <span className="text-slate-400 font-bold">สถานะทำงาน:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${statusBadgeColor}`}>
                      {statusText}
                    </span>
                  </div>
                </div>

                {/* Sub-details (Assignments and leaves) */}
                <div className="space-y-3 pt-2">
                  
                  {/* Dynamic letters assigned */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      สหกรณ์รับมอบหมาย ({myLetters.length})
                    </div>
                    {myLetters.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic block pl-4.5">ไม่มีรายชื่อสหกรณ์มอบหมาย</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 pl-4.5 max-h-[60px] overflow-y-auto">
                        {myLetters.map((l, i) => (
                          <span 
                            key={i} 
                            className="bg-slate-50 border border-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium max-w-[120px] truncate"
                          >
                            {l.orgName.replace('สหกรณ์ออมทรัพย์', 'สอ.')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic leave history */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      วันลารับการอนุมัติในระบบ ({myLeaves.length})
                    </div>
                    {myLeaves.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic block pl-4.5">ไม่มีประวัติการลารอบนี้</span>
                    ) : (
                      <div className="space-y-1 pl-4.5">
                        {myLeaves.map((req, i) => {
                          const typeLabel = req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักร้อน';
                          return (
                            <div key={i} className="text-[11px] font-medium text-rose-700 bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50 flex items-center justify-between">
                              <span>{typeLabel} (วันที่ {req.leaveCalendarDay || '-'})</span>
                              <span className="text-[9px] text-rose-400">ได้รับการอนุมัติ</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Operations */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
                  {activeEdit ? (
                    <>
                      <button
                        onClick={() => saveEdit(idx)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        บันทึก
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(idx)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        title="แก้ไขข้อมูลพนักงาน"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteInspector(idx)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100"
                        title="ลบพนักงาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Original Table View option */
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="py-3 px-4 rounded-l-lg">ลำดับ</th>
                <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                <th className="py-3 px-4">อีเมลแจ้งเตือน</th>
                <th className="py-3 px-4">ตำแหน่ง</th>
                <th className="py-3 px-4 text-center">งานในมือ</th>
                <th className="py-3 px-4 text-right rounded-r-lg">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pool.map((person, idx) => {
                const myLetters = getAssignments(person.name);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {editingIndex === idx ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full max-w-sm"
                        />
                      ) : (
                        person.name
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {editingIndex === idx ? (
                        <input
                          type="text"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="chajai.tk2025@gmail.com"
                          className="px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full max-w-sm"
                        />
                      ) : (
                        person.email || <span className="text-slate-400 italic font-normal">ไม่ได้ระบุ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {editingIndex === idx ? (
                        <select
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="ผู้ตรวจสอบกิจการ">ผู้ตรวจสอบกิจการ</option>
                          <option value="หัวหน้าสายตรวจสอบ">หัวหน้าสายตรวจสอบ</option>
                          <option value="ผู้ช่วยผู้ตรวจสอบกิจการ">ผู้ช่วยผู้ตรวจสอบกิจการ</option>
                          <option value="ผู้ช่วยตรวจกิจการ">ผู้ช่วยตรวจกิจการ</option>
                          <option value="ผู้ช่วยตรวจสอบกิจการ">ผู้ช่วยตรวจสอบกิจการ</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          person.title.includes('หัวหน้า')
                            ? 'bg-amber-100 text-amber-800'
                            : person.title.includes('ผู้ช่วย')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {person.title}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600">
                      {myLetters.length} สหกรณ์
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {editingIndex === idx ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveEdit(idx)}
                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded transition-all"
                            title="บันทึก"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 rounded transition-all"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(idx)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded transition-all"
                            title="แก้ไข"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteInspector(idx)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded transition-all"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
