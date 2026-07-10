import React, { useState } from 'react';
import { CooperativeLetter, Inspector, ChecklistStyle } from '../types';
import { DEFAULT_INSPECTORS_POOL, get17Items, get20Items } from '../data';
import { 
  ArrowUp, ArrowDown, Trash2, Plus, RefreshCw, FileText, 
  Users, Calendar, Settings, CheckSquare, Edit, Compass,
  Lock, Unlock
} from 'lucide-react';

interface LetterEditorProps {
  letter: CooperativeLetter;
  onUpdateLetter: (updatedLetter: CooperativeLetter) => void;
  inspectorPool: Omit<Inspector, 'id'>[];
}

export default function LetterEditor({ letter, onUpdateLetter, inspectorPool }: LetterEditorProps) {
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newInspectorTitle, setNewInspectorTitle] = useState('ผู้ตรวจสอบกิจการ');
  const [isLocked, setIsLocked] = useState(true);

  const updateField = (key: keyof CooperativeLetter, value: any) => {
    onUpdateLetter({ ...letter, [key]: value });
  };

  // Inspectors list modifications
  const handleMoveInspector = (index: number, direction: 'up' | 'down') => {
    const inspectors = [...letter.inspectors];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= inspectors.length) return;

    const temp = inspectors[index];
    inspectors[index] = inspectors[targetIdx];
    inspectors[targetIdx] = temp;

    updateField('inspectors', inspectors);
  };

  const handleRemoveInspector = (id: string) => {
    const inspectors = letter.inspectors.filter(ins => ins.id !== id);
    updateField('inspectors', inspectors);
  };

  const handleAddInspectorFromPool = (person: Omit<Inspector, 'id'>) => {
    const newIns: Inspector = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: person.name,
      title: person.title
    };
    updateField('inspectors', [...letter.inspectors, newIns]);
  };

  const handleAddCustomInspector = () => {
    if (!newInspectorName.trim()) return;
    const newIns: Inspector = {
      id: Date.now().toString(),
      name: newInspectorName.trim(),
      title: newInspectorTitle
    };
    updateField('inspectors', [...letter.inspectors, newIns]);
    setNewInspectorName('');
  };

  // Checklist items modifications
  const handleChecklistItemChange = (index: number, value: string) => {
    const items = [...letter.checklistItems];
    items[index] = value;
    updateField('checklistItems', items);
  };

  const handleRemoveChecklistItem = (index: number) => {
    const items = letter.checklistItems.filter((_, i) => i !== index);
    updateField('checklistItems', items);
  };

  const handleAddChecklistItem = () => {
    updateField('checklistItems', [...letter.checklistItems, 'เอกสารเพิ่มเติม...']);
  };

  const handleResetChecklist = (style: ChecklistStyle) => {
    const items = style === '17-items' ? get17Items(letter.inspectionMonth) : get20Items(letter.inspectionMonth);
    onUpdateLetter({
      ...letter,
      checklistStyle: style,
      checklistItems: items
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 doc-shadow p-5 space-y-6 font-sans text-sm h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600 shrink-0" />
            แก้ไขรายละเอียดจดหมาย
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            แก้ไขรายละเอียดเนื้อหา คณะทำงาน และวันที่เข้าตรวจ
          </p>
        </div>
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 shrink-0 ${
            isLocked
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
          title={isLocked ? "คลิกเพื่อปลดล็อกฟิลด์ทั้งหมด" : "คลิกเพื่อล็อกส่วนที่ไม่เกี่ยวข้องเพื่อความปลอดภัย"}
        >
          {isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>ระบบคงเดิมเฉพาะจุด 🔒</span>
            </>
          ) : (
            <>
              <Unlock className="w-3.5 h-3.5 text-slate-600" />
              <span>ปลดล็อกทุกฟิลด์แล้ว 🔓</span>
            </>
          )}
        </button>
      </div>

      {/* Basic Metadata */}
      <div className={`space-y-4 p-3 rounded-lg border transition-all ${isLocked ? 'bg-slate-50/50 border-slate-200/40 opacity-75' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            ข้อมูลเอกสารพื้นฐาน
          </h3>
          {isLocked && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> คงเดิมตามระบบ
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ชื่อสหกรณ์ผู้รับ</label>
            <input
              type="text"
              value={letter.orgName}
              disabled={isLocked}
              onChange={(e) => {
                updateField('orgName', e.target.value);
                updateField('recipient', `ผู้จัดการ ${e.target.value}`);
              }}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">วันที่ลงในหนังสือแจ้ง</label>
            <input
              type="text"
              value={letter.letterDate}
              disabled={isLocked}
              onChange={(e) => updateField('letterDate', e.target.value)}
              placeholder="เช่น วันที่ 26 มิถุนายน 2569"
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">เรียน (ผู้รับจดหมาย)</label>
            <input
              type="text"
              value={letter.recipient}
              disabled={isLocked}
              onChange={(e) => updateField('recipient', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ปีที่ประชุมใหญ่ที่แต่งตั้ง (พ.ศ.)</label>
            <input
              type="text"
              value={letter.meetingYear}
              disabled={isLocked}
              onChange={(e) => updateField('meetingYear', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ผู้ได้รับแต่งตั้งเริ่มแรกในที่ประชุม</label>
            <input
              type="text"
              value={letter.repName}
              disabled={isLocked}
              onChange={(e) => updateField('repName', e.target.value)}
              placeholder="เช่น นางสาวเฉลิมรัตน์ ใจดี"
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ปีการเงินสิ้นสุดวันที่</label>
            <input
              type="text"
              value={letter.fiscalYearEnd}
              disabled={isLocked}
              onChange={(e) => updateField('fiscalYearEnd', e.target.value)}
              placeholder="เช่น 30 กันยายน 2569"
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Inspection Dates & Period */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          กำหนดการเข้าตรวจและรอบบัญชี
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">วันที่เข้าตรวจ (แสดงบนเอกสาร)</label>
            <input
              type="text"
              value={letter.inspectionDatesText}
              onChange={(e) => updateField('inspectionDatesText', e.target.value)}
              placeholder="เช่น 6 - 7 กรกฎาคม 2569"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ประจำเดือน (รอบตรวจสอบ)</label>
            <input
              type="text"
              value={letter.inspectionMonth}
              onChange={(e) => updateField('inspectionMonth', e.target.value)}
              placeholder="เช่น มิถุนายน 2569"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ขอบเขตวันที่ข้อมูลบัญชี</label>
            <input
              type="text"
              value={letter.inspectionPeriod}
              onChange={(e) => updateField('inspectionPeriod', e.target.value)}
              placeholder="เช่น 1 มิถุนายน 2569 – 30 มิถุนายน 2569"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>
        </div>
      </div>

      {/* Team Assignment (Inspectors List) */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            คณะทำงานที่จะเข้าตรวจ ({letter.inspectors.length})
          </h3>
          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-medium">
            เรียงลำดับตามชื่อที่เขียนในตาราง
          </span>
        </div>

        {/* Existing assigned inspectors */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-100 p-2.5 rounded-lg bg-slate-50/50">
          {letter.inspectors.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 font-medium">ยังไม่มีรายชื่อผู้ตรวจกิจการสำหรับเล่มนี้</p>
          ) : (
            letter.inspectors.map((ins, idx) => (
              <div key={ins.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition-all">
                <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                  <div className="text-xs font-bold text-slate-800 truncate">{ins.name}</div>
                  <div className="text-[11px] text-slate-500 truncate italic">{ins.title}</div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveInspector(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-30 rounded transition-all"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveInspector(idx, 'down')}
                    disabled={idx === letter.inspectors.length - 1}
                    className="p-1 hover:bg-slate-100 text-slate-500 disabled:opacity-30 rounded transition-all"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveInspector(ins.id)}
                    className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-all"
                    title="ลบออก"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add from inspector pool */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600">เลือกจากบุคลากรในตารางอ้างอิง</label>
          <div className="flex flex-wrap gap-2">
            {inspectorPool.map((person, idx) => {
              // Check if already added
              const isAdded = letter.inspectors.some(ins => ins.name === person.name);
              return (
                <button
                  key={idx}
                  onClick={() => !isAdded && handleAddInspectorFromPool(person)}
                  disabled={isAdded}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 font-medium ${
                    isAdded 
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-emerald-50/50 text-emerald-800 border-emerald-100 hover:bg-emerald-50 hover:border-emerald-200'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  {person.name.split(' ').slice(0, 2).join(' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add custom member directly */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500">พิมพ์ระบุชื่อใหม่</label>
            <input
              type="text"
              placeholder="ชื่อ - นามสกุล"
              value={newInspectorName}
              onChange={(e) => setNewInspectorName(e.target.value)}
              className="w-full px-2.5 py-1 rounded border border-slate-200 text-xs bg-white"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500">เลือกตำแหน่ง</label>
            <select
              value={newInspectorTitle}
              onChange={(e) => setNewInspectorTitle(e.target.value)}
              className="w-full px-2 py-1 rounded border border-slate-200 text-xs bg-white"
            >
              <option value="ผู้ตรวจสอบกิจการ">ผู้ตรวจสอบกิจการ</option>
              <option value="หัวหน้าสายตรวจสอบ">หัวหน้าสายตรวจสอบ</option>
              <option value="ผู้ช่วยผู้ตรวจสอบกิจการ">ผู้ช่วยผู้ตรวจสอบกิจการ</option>
              <option value="ผู้ช่วยตรวจกิจการ">ผู้ช่วยตรวจกิจการ</option>
              <option value="ผู้ช่วยตรวจสอบกิจการ">ผู้ช่วยตรวจสอบกิจการ</option>
            </select>
          </div>
          <button
            onClick={handleAddCustomInspector}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded py-1.5 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มกำหนดเอง
          </button>
        </div>
      </div>

      {/* Signature and Position Signee */}
      <div className={`space-y-4 p-3 rounded-lg border transition-all ${isLocked ? 'bg-slate-50/50 border-slate-200/40 opacity-75' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            ส่วนผู้ลงนามท้ายหนังสือ
          </h3>
          {isLocked && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> คงเดิมตามระบบ
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ชื่อผู้ลงนามแสดงความนับถือ</label>
            <input
              type="text"
              value={letter.signeeName}
              disabled={isLocked}
              onChange={(e) => updateField('signeeName', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">ตำแหน่งของผู้ลงนาม</label>
            <input
              type="text"
              value={letter.signeeTitle}
              disabled={isLocked}
              onChange={(e) => updateField('signeeTitle', e.target.value)}
              className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isLocked 
                  ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-white border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Document Checklist Selection */}
      <div className={`space-y-4 p-3 rounded-lg border transition-all ${isLocked ? 'bg-slate-50/50 border-slate-200/40 opacity-75' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
              รายการเอกสารที่แจ้งให้เตรียม ({letter.checklistItems.length} รายการ)
            </h3>
            {isLocked && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> คงเดิมตามระบบ
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleResetChecklist('17-items')}
              disabled={isLocked}
              className={`text-[10px] px-2 py-1 rounded border transition-all font-semibold flex items-center gap-0.5 ${
                isLocked 
                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <RefreshCw className="w-2.5 h-2.5" /> โหลด 17 รายการ
            </button>
            <button
              onClick={() => handleResetChecklist('20-items')}
              disabled={isLocked}
              className={`text-[10px] px-2 py-1 rounded border transition-all font-semibold flex items-center gap-0.5 ${
                isLocked 
                  ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <RefreshCw className="w-2.5 h-2.5" /> โหลด 20 รายการ
            </button>
          </div>
        </div>

        {/* Checklist item lines */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {letter.checklistItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 w-6 shrink-0 text-center">{idx + 1}</span>
              <input
                type="text"
                value={item}
                disabled={isLocked}
                onChange={(e) => handleChecklistItemChange(idx, e.target.value)}
                className={`flex-1 px-2.5 py-1 border rounded text-xs transition-all ${
                  isLocked 
                    ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed font-medium' 
                    : 'bg-white border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium'
                }`}
              />
              <button
                onClick={() => handleRemoveChecklistItem(idx)}
                disabled={isLocked}
                className={`p-1 rounded transition-all shrink-0 ${
                  isLocked 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'hover:bg-rose-50 text-rose-500'
                }`}
                title="ลบเอกสารนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddChecklistItem}
          disabled={isLocked}
          className={`w-full border border-dashed rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            isLocked 
              ? 'bg-slate-50/50 border-slate-200 text-slate-300 cursor-not-allowed' 
              : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-500 hover:text-emerald-700'
          }`}
        >
          <Plus className="w-4 h-4" /> เพิ่มรายการเอกสารใหม่
        </button>
      </div>
    </div>
  );
}
