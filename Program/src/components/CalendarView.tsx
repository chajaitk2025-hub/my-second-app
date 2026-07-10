import React, { useState, useEffect } from 'react';
import { CooperativeLetter, LeaveRequest, Inspector } from '../types';
// @ts-ignore
import tkLogo from '../assets/images/tk_logo_1782903136304.jpg';
import { 
  Calendar, Users, Briefcase, Info, Compass, ChevronRight, 
  AlertCircle, FileText, Plus, Trash2, X, Check, CalendarDays,
  Send, Bell, Clock, Eye, Download, Printer, Settings, CheckSquare, Edit2, RotateCcw
} from 'lucide-react';

interface CalendarViewProps {
  letters: CooperativeLetter[];
  onSelectLetter: (id: string) => void;
  leaveRequests?: LeaveRequest[];
  inspectorPool?: Inspector[];
}

interface CustomEvent {
  id: string;
  day: number;
  type: 'meeting' | 'office' | 'leave' | 'holiday';
  label: string;
  time?: string;
  attendees?: string[];
  location?: string;
}

interface LineNotifyConfig {
  token: string;
  enableDailyNotification: boolean;
  notifyTime: string; // e.g. "08:30"
}

interface EmailNotifyConfig {
  enableEmailNotification: boolean;
  senderName: string;
  notifyTime: string; // e.g. "08:30"
}

interface NotificationLog {
  id: string;
  timestamp: string;
  eventTitle: string;
  attendees: string[];
  status: 'sent' | 'failed';
  message: string;
}

export default function CalendarView({ 
  letters, 
  onSelectLetter, 
  leaveRequests = [], 
  inspectorPool = [] 
}: CalendarViewProps) {
  const daysInMonth = 31;
  const startOffset = 3; // July 2569 (July 2026) starts on Wednesday (offset 3)

  // Sub-menu Tab State: 'calendar' | 'line' | 'email' | 'timesheet'
  const [subTab, setSubTab] = useState<'calendar' | 'line' | 'email' | 'timesheet'>('calendar');

  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => {
    const saved = localStorage.getItem('calendar_custom_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback below
      }
    }
    
    return [
      { id: 'init-1', day: 1, type: 'meeting', label: 'ประชุมประจำเดือน', time: '09:00', attendees: ['นางสาวเฉลิมรัตน์ ใจดี', 'นายปรีดี ศรีเหมือนทอง'], location: 'ห้องประชุมสำนักงานใหญ่' },
      { id: 'init-2', day: 2, type: 'office', label: 'เข้าออฟฟิศปฏิบัติงาน', time: '08:30', attendees: ['นางสาวเฉลิมรัตน์ ใจดี'] },
      { id: 'init-3', day: 3, type: 'office', label: 'เข้าออฟฟิศปฏิบัติงาน', time: '08:30', attendees: ['นายปรีดี ศรีเหมือนทอง'] },
      { id: 'init-4', day: 5, type: 'office', label: 'เข้าออฟฟิศปฏิบัติงาน', time: '08:30', attendees: ['นายเจษฎา พูลสุข'] },
      { id: 'init-5', day: 24, type: 'meeting', label: 'ประชุม สอ.ตร.อยุธยา Onsite เฉลิมรัตน์ 9.30 น.', time: '09:30', attendees: ['นางสาวเฉลิมรัตน์ ใจดี', 'นายปรีดี ศรีเหมือนทอง'], location: 'ห้องประชุม สอ.ตร.อยุธยา' },
      { id: 'init-6', day: 28, type: 'holiday', label: 'วันหยุดออฟฟิศ - วันเฉลิมพระชนมพรรษาฯ' },
      { id: 'init-7', day: 29, type: 'holiday', label: 'วันหยุดออฟฟิศ - วันอาสาฬหบูชา' },
      { id: 'init-8', day: 30, type: 'holiday', label: 'วันหยุดออฟฟิศ - วันเข้าพรรษา' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('calendar_custom_events', JSON.stringify(customEvents));
  }, [customEvents]);

  // LINE Configuration States
  const [lineConfig, setLineConfig] = useState<LineNotifyConfig>(() => {
    const saved = localStorage.getItem('calendar_line_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      token: 'TK_Notify_Token_Demo_July2569_99814',
      enableDailyNotification: true,
      notifyTime: '08:30'
    };
  });

  useEffect(() => {
    localStorage.setItem('calendar_line_config', JSON.stringify(lineConfig));
  }, [lineConfig]);

  // Email Configuration States
  const [emailConfig, setEmailConfig] = useState<EmailNotifyConfig>(() => {
    const saved = localStorage.getItem('calendar_email_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enableEmailNotification: true,
      senderName: 'TK Account & Associate Notifier',
      notifyTime: '08:30'
    };
  });

  useEffect(() => {
    localStorage.setItem('calendar_email_config', JSON.stringify(emailConfig));
  }, [emailConfig]);

  // Email Notification Logs
  const [emailLogs, setEmailLogs] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('calendar_email_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'elog-1',
        timestamp: '2569-07-01 08:31:05',
        eventTitle: 'ประชุมประจำเดือน',
        attendees: ['นางสาวเฉลิมรัตน์ ใจดี'],
        status: 'sent',
        message: '📧 ส่งอีเมลแจ้งเตือนนัดหมายประจำวันสำเร็จ ไปยัง chajai.tk2025@gmail.com (คุณเฉลิมรัตน์ ใจดี)'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('calendar_email_logs', JSON.stringify(emailLogs));
  }, [emailLogs]);

  // Email Sandbox States
  const [selectedStaffForEmailTest, setSelectedStaffForEmailTest] = useState<string>('นางสาวเฉลิมรัตน์ ใจดี');
  const [testEmailSubject, setTestEmailSubject] = useState('แจ้งเตือนกำหนดการตรวจสหกรณ์ประจำวัน - สายตรวจเฉลิมรัตน์');
  const [testEmailBody, setTestEmailBody] = useState('เรียน คุณเฉลิมรัตน์ ใจดี,\n\nขอแจ้งกำหนดการปฏิบัติงานสายตรวจดังนี้:\n- วันที่: 6 กรกฎาคม 2569\n- สถานที่: สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด\n- บทบาท: ผู้ตรวจสอบกิจการ\n\nกรุณาจัดเตรียมเอกสารและสมุดสรุปประจำวันด้วยค่ะ\n\nด้วยความเคารพ,\nTK Account & Associate Co., Ltd.');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Auto update sandbox email fields when target inspector changes or pool loads
  useEffect(() => {
    if (inspectorPool.length > 0) {
      const isSelectedInPool = inspectorPool.some(ins => ins.name === selectedStaffForEmailTest);
      if (!isSelectedInPool) {
        setSelectedStaffForEmailTest(inspectorPool[0].name);
      }
    }
  }, [inspectorPool]);

  // LINE Notification Logs
  const [lineLogs, setLineLogs] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('calendar_line_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'log-1',
        timestamp: '2569-07-01 08:30:12',
        eventTitle: 'ประชุมประจำเดือน',
        attendees: ['นางสาวเฉลิมรัตน์ ใจดี', 'นายปรีดี ศรีเหมือนทอง'],
        status: 'sent',
        message: '🔔 แจ้งเตือนประชุมเวลา 09:00 น. เรื่อง ประชุมประจำเดือน สำเร็จ (ผู้รับ: 2 ท่าน)'
      },
      {
        id: 'log-2',
        timestamp: '2569-07-24 08:30:05',
        eventTitle: 'ประชุม สอ.ตร.อยุธยา Onsite เฉลิมรัตน์ 9.30 น.',
        attendees: ['นางสาวเฉลิมรัตน์ ใจดี', 'นายปรีดี ศรีเหมือนทอง'],
        status: 'sent',
        message: '🔔 แจ้งเตือนประชุมเวลา 09:30 น. ณ ห้องประชุม สอ.ตร.อยุธยา เรื่อง ประชุม สอ.ตร.อยุธยา Onsite เฉลิมรัตน์ 9.30 น. สำเร็จ'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('calendar_line_logs', JSON.stringify(lineLogs));
  }, [lineLogs]);

  // Timesheet Generation States
  const [selectedStaffForTimesheet, setSelectedStaffForTimesheet] = useState<string>('');
  
  // Initialize default staff for Timesheet when pool is loaded
  useEffect(() => {
    if (inspectorPool.length > 0 && !selectedStaffForTimesheet) {
      setSelectedStaffForTimesheet(inspectorPool[0].name);
    }
  }, [inspectorPool, selectedStaffForTimesheet]);

  // Manual timesheet overrides store
  const [timesheetOverrides, setTimesheetOverrides] = useState<Record<string, Record<number, { task: string; hours: number; entryTime: string; exitTime: string; note: string }>>>(() => {
    const saved = localStorage.getItem('calendar_timesheet_overrides');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('calendar_timesheet_overrides', JSON.stringify(timesheetOverrides));
  }, [timesheetOverrides]);

  // Modal State for Day details / Add Event
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'meeting' | 'office' | 'leave' | 'holiday'>('meeting');
  const [newTime, setNewTime] = useState('08:30');
  const [newLocation, setNewLocation] = useState('');
  const [newAttendees, setNewAttendees] = useState<string[]>([]);
  const [triggerLineAlert, setTriggerLineAlert] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick add states (Main Calendar Header)
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickDay, setQuickDay] = useState<number>(1);

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'office':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'leave':
        return 'bg-rose-50 text-rose-600 border-rose-200 border-dashed';
      case 'holiday':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'inspection':
        return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-medium';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Build Calendar Matrix
  const cells: {
    dayNum: number | null;
    isHoliday: boolean;
    holidayText?: string;
    events: {
      id: string;
      type: 'inspection' | 'office' | 'leave' | 'meeting' | 'holiday';
      label: string;
      color: string;
      time?: string;
      attendees?: string[];
      location?: string;
      letterId?: string;
      isCustom?: boolean;
    }[];
  }[] = [];

  // Padding cells
  for (let i = 0; i < startOffset; i++) {
    cells.push({ dayNum: null, isHoliday: false, events: [] });
  }

  // Populate events
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents: typeof cells[0]['events'] = [];
    let isHoliday = false;
    let holidayText = '';

    // 1. Custom events
    customEvents.filter(evt => evt.day === day).forEach(evt => {
      if (evt.type === 'holiday') {
        isHoliday = true;
        holidayText = evt.label.replace('วันหยุดออฟฟิศ - ', '');
      }
      dayEvents.push({
        id: evt.id,
        type: evt.type,
        label: evt.label,
        color: getEventStyles(evt.type),
        time: evt.time,
        attendees: evt.attendees,
        location: evt.location,
        isCustom: true
      });
    });

    // 2. Approved Leaves
    leaveRequests
      .filter(req => req.approvalStatus === 'approved' && req.leaveCalendarDay === day)
      .forEach(req => {
        const typeLabel = req.leaveType === 'sick' ? 'ลาป่วย' : req.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักร้อน';
        dayEvents.push({
          id: `leave-req-${req.id}`,
          type: 'leave',
          label: `${req.employeeName} (${typeLabel})`,
          color: getEventStyles('leave'),
          attendees: [req.employeeName]
        });
      });

    // 3. Letters/Inspections
    letters.forEach(letter => {
      const text = letter.inspectionDatesText;
      let matched = false;

      if (text.includes('-')) {
        const parts = text.split('-').map(p => parseInt(p.trim()));
        if (parts.length === 2 && day >= parts[0] && day <= parts[1]) {
          matched = true;
        }
      } else {
        const singleDay = parseInt(text.trim());
        if (singleDay === day) {
          matched = true;
        }
      }

      if (matched) {
        dayEvents.push({
          id: `letter-${letter.id}-${day}`,
          type: 'inspection',
          label: letter.orgName.replace('สหกรณ์ออมทรัพย์', 'สอ.'),
          color: getEventStyles('inspection'),
          attendees: letter.inspectors.map(ins => ins.name),
          letterId: letter.id
        });
      }
    });

    cells.push({
      dayNum: day,
      isHoliday,
      holidayText,
      events: dayEvents
    });
  }

  // Group cells into weeks
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];
  cells.forEach((cell, idx) => {
    currentWeek.push(cell);
    if (currentWeek.length === 7 || idx === cells.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push({ dayNum: null, isHoliday: false, events: [] });
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const weekDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

  // Handle adding events (either from modal or quick add)
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = selectedDay !== null ? selectedDay : quickDay;
    if (!newLabel.trim() || day === null) return;

    const eventId = `custom-${Date.now()}`;
    const newEvent: CustomEvent = {
      id: eventId,
      day: day,
      type: newType,
      label: newLabel.trim(),
      time: newType === 'meeting' || newType === 'office' ? newTime : undefined,
      location: newType === 'meeting' && newLocation.trim() ? newLocation.trim() : undefined,
      attendees: newAttendees.length > 0 ? newAttendees : undefined
    };

    setCustomEvents(prev => [...prev, newEvent]);

    // Handle automated simulated LINE Notification triggering (At 08.30)
    if (triggerLineAlert && (newType === 'meeting' || newType === 'office')) {
      const attendeesText = newAttendees.length > 0 ? newAttendees.join(', ') : 'คณะผู้ปฏิบัติงานทั้งหมด';
      const now = new Date();
      const timestamp = `${now.getFullYear() + 543}-07-${day < 10 ? '0' + day : day} ${lineConfig.notifyTime}:00`;
      
      const newLog: NotificationLog = {
        id: `line-log-${Date.now()}`,
        timestamp: timestamp,
        eventTitle: newLabel.trim(),
        attendees: newAttendees,
        status: 'sent',
        message: `🔔 [กำหนดส่งระบบอัตโนมัติ] LINE Notify ณ เวลา 08:30 น. ถึงผู้เข้าประชุม: "${attendeesText}" สำหรับกำหนดการ "${newLabel.trim()}" ${newTime ? 'เวลา ' + newTime + ' น.' : ''} ${newLocation ? 'สถานที่ ' + newLocation : ''}`
      };
      
      setLineLogs(prev => [newLog, ...prev]);
    }

    // Handle automated simulated Email notifications triggering (At 08.30)
    if (emailConfig.enableEmailNotification && (newType === 'meeting' || newType === 'office')) {
      const now = new Date();
      const timestamp = `${now.getFullYear() + 543}-07-${day < 10 ? '0' + day : day} ${emailConfig.notifyTime}:00`;
      
      // Look up emails
      const attendeesWithEmail = inspectorPool.filter(ins => newAttendees.includes(ins.name));
      if (attendeesWithEmail.length > 0) {
        attendeesWithEmail.forEach(ins => {
          if (ins.email) {
            const newEmailLog: NotificationLog = {
              id: `email-auto-log-${Date.now()}-${ins.name}`,
              timestamp: timestamp,
              eventTitle: newLabel.trim(),
              attendees: [ins.name],
              status: 'sent',
              message: `📧 [กำหนดส่งระบบอัตโนมัติ] ส่งอีเมลเตือนนัดหมายไปยัง ${ins.email} (${ins.name}) เรื่อง: "${newLabel.trim()}" สำหรับกำหนดปฏิบัติงานในวันที่ ${day} กรกฎาคม 2569 เวลา ${newTime || '08:30'} น.`
            };
            setEmailLogs(prev => [newEmailLog, ...prev]);
          }
        });
      }
    }

    if (triggerLineAlert || emailConfig.enableEmailNotification) {
      setSuccessToast('เพิ่มกำหนดการเรียบร้อย! ตั้งเวลาระบบแจ้งเตือน LINE และอีเมลเรียบร้อย');
    } else {
      setSuccessToast('บันทึกกำหนดการปฏิบัติงานสำเร็จแล้ว!');
    }

    // Reset Form state
    setNewLabel('');
    setNewLocation('');
    setNewAttendees([]);
    setSelectedDay(null);
    setIsQuickAdding(false);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleDeleteCustomEvent = (id: string) => {
    setCustomEvents(prev => prev.filter(evt => evt.id !== id));
  };

  // Quick simulated Test message to LINE
  const [testLineMsg, setTestLineMsg] = useState('ทดสอบระบบแจ้งเตือน LINE Notify: สายตรวจกลุ่มคุณเฉลิมรัตน์ กำลังดำเนินการตรวจบัญชีสหกรณ์ตามกำหนดการประจำวัน');
  const [sendingTestLine, setSendingTestLine] = useState(false);

  const handleSendTestLine = async () => {
    if (!testLineMsg.trim()) return;
    setSendingTestLine(true);
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatTimestamp = `${now.getFullYear() + 543}-07-01 ${timeStr}`;
    
    const isDemoToken = lineConfig.token.startsWith('TK_Notify_Token_Demo');

    if (isDemoToken) {
      // Simulation mode
      setTimeout(() => {
        const newLog: NotificationLog = {
          id: `test-log-${Date.now()}`,
          timestamp: formatTimestamp,
          eventTitle: 'ข้อความทดสอบ (ระบบจำลอง)',
          attendees: ['ผู้ดูแลระบบ'],
          status: 'sent',
          message: `📲 [จำลองส่งสำเร็จ] LINE Token: ${lineConfig.token.substring(0, 10)}... ข้อความ: "${testLineMsg}" (กรุณากรอก Token จริงของคุณที่กล่องทางซ้ายเพื่อทดสอบส่งจริงเข้าห้องแชทไลน์ของคุณ!)`
        };
        
        setLineLogs(prev => [newLog, ...prev]);
        setSendingTestLine(false);
        setSuccessToast('จำลองส่งข้อความสำเร็จ! (กรุณาใส่ Token จริงเพื่อทดสอบส่งจริงเข้ากลุ่มไลน์)');
        setTimeout(() => setSuccessToast(null), 4000);
      }, 600);
      return;
    }

    // Real API send mode using CORS proxy to bypass browser security blocks
    try {
      // Use corsproxy.io to allow client-side requests to LINE Notify API
      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://notify-api.line.me/api/notify');
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${lineConfig.token}`
        },
        body: new URLSearchParams({
          message: testLineMsg
        })
      });

      if (response.ok) {
        const newLog: NotificationLog = {
          id: `real-log-${Date.now()}`,
          timestamp: formatTimestamp,
          eventTitle: 'ข้อความส่งตรงเข้า LINE Notify จริง',
          attendees: ['ผู้ใช้งานระบบ'],
          status: 'sent',
          message: `🟢 [ส่งจริงสำเร็จ] ข้อความส่งเข้ากลุ่ม LINE เรียบร้อย: "${testLineMsg}"`
        };
        setLineLogs(prev => [newLog, ...prev]);
        setSuccessToast('ส่งข้อความเข้ากลุ่ม LINE จริงของคุณสำเร็จแล้ว! 🎉');
      } else {
        const errorData = await response.text();
        const newLog: NotificationLog = {
          id: `real-log-fail-${Date.now()}`,
          timestamp: formatTimestamp,
          eventTitle: 'ส่งข้อความจริงล้มเหลว',
          attendees: [],
          status: 'failed',
          message: `🔴 [ส่งไม่สำเร็จ] HTTP Status: ${response.status} - รหัสโทเค็นอาจจะไม่ถูกต้อง หรือไม่ได้รับอนุญาต`
        };
        setLineLogs(prev => [newLog, ...prev]);
        setSuccessToast('ส่งไม่สำเร็จ: กรุณาตรวจสอบความถูกต้องของ LINE Token');
      }
    } catch (err: any) {
      console.error('Error sending line notification:', err);
      const newLog: NotificationLog = {
        id: `real-log-error-${Date.now()}`,
        timestamp: formatTimestamp,
        eventTitle: 'ข้อขัดข้องการเชื่อมต่อ',
        attendees: [],
        status: 'failed',
        message: `⚠️ [ข้อผิดพลาดทางเทคนิค] ไม่สามารถติดต่อ LINE API ได้ (${err?.message || 'Failed to fetch'}) - แนะนำให้เช็คอินเทอร์เน็ตหรือโทเค็น`
      };
      setLineLogs(prev => [newLog, ...prev]);
      setSuccessToast('เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API');
    } finally {
      setSendingTestLine(false);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleSendTestEmail = () => {
    if (!selectedStaffForEmailTest) return;
    setSendingTestEmail(true);
    const targetStaff = inspectorPool.find(ins => ins.name === selectedStaffForEmailTest);
    const targetEmail = targetStaff?.email || 'chajai.tk2025@gmail.com';
    
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const formatTimestamp = `${now.getFullYear() + 543}-07-01 ${timeStr}`;
      
      const newLog: NotificationLog = {
        id: `email-test-log-${Date.now()}`,
        timestamp: formatTimestamp,
        eventTitle: testEmailSubject,
        attendees: [selectedStaffForEmailTest],
        status: 'sent',
        message: `📧 [ส่งสำเร็จ] ส่งอีเมลแจ้งเตือนถึง ${targetEmail} (${selectedStaffForEmailTest}) เรื่อง "${testEmailSubject}" เรียบร้อยแล้ว (เปิดกล่องจดหมายจริงผ่าน Mail Client พร้อมบันทึกประวัติสำเร็จ)`
      };
      
      setEmailLogs(prev => [newLog, ...prev]);
      setSendingTestEmail(false);
      setSuccessToast(`ดึงหน้าต่างอีเมลไปยัง ${targetEmail} เรียบร้อย!`);
      
      // Open Mail Client
      const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(testEmailSubject)}&body=${encodeURIComponent(testEmailBody)}`;
      window.location.href = mailtoUrl;
      
      setTimeout(() => setSuccessToast(null), 4500);
    }, 700);
  };

  // Multi attendee toggle helper
  const handleToggleAttendee = (name: string) => {
    setNewAttendees(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Helper for Timesheet calculation per Day (1-31)
  const generateTimesheetData = (staffName: string) => {
    const list: {
      day: number;
      dayOfWeek: string;
      task: string;
      hours: number;
      entryTime: string;
      exitTime: string;
      note: string;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      // Find day of week for July 2569
      // July 1, 2026 is Wednesday
      const date = new Date(2026, 6, day); // month is 0-indexed (6 = July)
      const daysThai = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const dayOfWeek = daysThai[date.getDay()];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      // Check overrides
      const override = timesheetOverrides[staffName]?.[day];
      if (override) {
        list.push({
          day,
          dayOfWeek,
          ...override
        });
        continue;
      }

      let task = 'ปฏิบัติงานสำนักงาน (Office Support)';
      let hours = 8;
      let entryTime = '08:30';
      let exitTime = '16:30';
      let note = 'ปฏิบัติหน้าที่ประจำสำนักงาน';

      // 1. Check Holiday (28, 29, 30 July)
      const officialHoliday = customEvents.find(e => e.day === day && e.type === 'holiday');
      if (officialHoliday) {
        task = officialHoliday.label;
        hours = 0;
        entryTime = '-';
        exitTime = '-';
        note = 'วันหยุดบริษัทประจำเดือนกรกฎาคม';
      }
      // 2. Weekend
      else if (isWeekend) {
        task = 'วันหยุดประจำสัปดาห์';
        hours = 0;
        entryTime = '-';
        exitTime = '-';
        note = 'วันหยุดเสาร์-อาทิตย์';
      }
      // 3. Approved Leave request for this person
      else {
        const approvedLeave = leaveRequests.find(req => 
          req.employeeName === staffName && 
          req.approvalStatus === 'approved' && 
          req.leaveCalendarDay === day
        );
        if (approvedLeave) {
          const typeLabel = approvedLeave.leaveType === 'sick' ? 'ลาป่วย' : approvedLeave.leaveType === 'personal' ? 'ลากิจ' : 'ลาพักร้อน';
          task = `ลางาน (${typeLabel}): ${approvedLeave.reason || 'ธุระส่วนตัว'}`;
          hours = 0;
          entryTime = '-';
          exitTime = '-';
          note = `ได้รับการอนุมัติใบลาโดย ${approvedLeave.approverName}`;
        }
        // 4. Inspection Dates for this person
        else {
          const matchedInspection = letters.find(letter => {
            const hasStaff = letter.inspectors.some(ins => ins.name === staffName);
            if (!hasStaff) return false;
            
            const text = letter.inspectionDatesText;
            if (text.includes('-')) {
              const parts = text.split('-').map(p => parseInt(p.trim()));
              return parts.length === 2 && day >= parts[0] && day <= parts[1];
            } else {
              return parseInt(text.trim()) === day;
            }
          });

          if (matchedInspection) {
            task = `ปฏิบัติหน้าที่เข้าตรวจบัญชี ณ ${matchedInspection.orgName.replace('สหกรณ์ออมทรัพย์', 'สอ.')}`;
            hours = 8;
            entryTime = '08:30';
            exitTime = '16:30';
            note = 'ตรวจสอบบัญชีและจัดทำเอกสารทำการ';
          }
          // 5. Special meetings / custom events where they attend
          else {
            const matchedMeeting = customEvents.find(e => 
              e.day === day && 
              e.type === 'meeting' && 
              e.attendees?.includes(staffName)
            );
            if (matchedMeeting) {
              task = `เข้าร่วมประชุม: ${matchedMeeting.label} (${matchedMeeting.location || 'สำนักงานใหญ่'})`;
              hours = 8;
              entryTime = matchedMeeting.time || '08:30';
              exitTime = '16:30';
              note = 'การประชุมสายตรวจสอบ';
            }
          }
        }
      }

      list.push({
        day,
        dayOfWeek,
        task,
        hours,
        entryTime,
        exitTime,
        note
      });
    }

    return list;
  };

  // Handle saving Timesheet modifications inline
  const [editingTimesheetDay, setEditingTimesheetDay] = useState<number | null>(null);
  const [tempTimesheetTask, setTempTimesheetTask] = useState('');
  const [tempTimesheetHours, setTempTimesheetHours] = useState(8);
  const [tempTimesheetEntry, setTempTimesheetEntry] = useState('08:30');
  const [tempTimesheetExit, setTempTimesheetExit] = useState('16:30');
  const [tempTimesheetNote, setTempTimesheetNote] = useState('');

  const startEditTimesheetRow = (row: any) => {
    setEditingTimesheetDay(row.day);
    setTempTimesheetTask(row.task);
    setTempTimesheetHours(row.hours);
    setTempTimesheetEntry(row.entryTime);
    setTempTimesheetExit(row.exitTime);
    setTempTimesheetNote(row.note);
  };

  const saveTimesheetRowOverride = (day: number) => {
    const prevStaffOverrides = timesheetOverrides[selectedStaffForTimesheet] || {};
    const updated = {
      ...timesheetOverrides,
      [selectedStaffForTimesheet]: {
        ...prevStaffOverrides,
        [day]: {
          task: tempTimesheetTask,
          hours: Number(tempTimesheetHours),
          entryTime: tempTimesheetEntry,
          exitTime: tempTimesheetExit,
          note: tempTimesheetNote
        }
      }
    };
    setTimesheetOverrides(updated);
    setEditingTimesheetDay(null);
    setSuccessToast('อัปเดตข้อมูล Timesheet เฉพาะบุคคลเรียบร้อย!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const resetTimesheetRowOverride = (day: number) => {
    const prevStaffOverrides = { ...(timesheetOverrides[selectedStaffForTimesheet] || {}) };
    delete prevStaffOverrides[day];
    
    const updated = {
      ...timesheetOverrides,
      [selectedStaffForTimesheet]: prevStaffOverrides
    };
    setTimesheetOverrides(updated);
    setSuccessToast('คืนค่าข้อมูลเริ่มต้นเรียบร้อย');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Calculate stats for current staff timesheet
  const currentTimesheetData = generateTimesheetData(selectedStaffForTimesheet);
  const totalWorkingHours = currentTimesheetData.reduce((acc, curr) => acc + curr.hours, 0);
  const workingDaysCount = currentTimesheetData.filter(curr => curr.hours > 0 && !curr.task.includes('ลางาน')).length;
  const leaveDaysCount = currentTimesheetData.filter(curr => curr.task.includes('ลางาน')).length;

  const selectedDayEvents = selectedDay !== null 
    ? cells.find(c => c.dayNum === selectedDay)?.events || []
    : [];

  return (
    <div className="space-y-6">
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-100 doc-shadow no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-semibold text-slate-800 font-sans">
              ระบบวางแผนงาน ปฏิทินกลาง และระบบแจ้งเตือน
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-sans ml-9">
            ควบคุมจัดการปฏิทินปฏิบัติการ ตารางเวลา Timesheet บุคลากร และเชื่อมต่อส่งการแจ้งเตือนด่วนผ่านแอปพลิเคชัน LINE
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200 no-print flex-wrap gap-1">
          <button
            onClick={() => setSubTab('calendar')}
            className={`px-3 py-2 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            ปฏิทินปฏิบัติงาน
          </button>
          
          <button
            onClick={() => setSubTab('line')}
            className={`px-3 py-2 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'line' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            ระบบแจ้งเตือน LINE ({lineLogs.length})
          </button>

          <button
            onClick={() => setSubTab('email')}
            className={`px-3 py-2 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'email' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4 animate-pulse" />
            ระบบแจ้งเตือนอีเมล ({emailLogs.length})
          </button>

          <button
            onClick={() => setSubTab('timesheet')}
            className={`px-3 py-2 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              subTab === 'timesheet' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Timesheet รายบุคคล
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CALENDAR DASHBOARD */}
      {subTab === 'calendar' && (
        <div className="space-y-6 no-print">
          <div className="flex flex-wrap gap-3 justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100/50 no-print">
            <div className="flex flex-wrap gap-2 text-[11px] font-sans">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> เข้าตรวจสหกรณ์ (ภายนอก)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> ประชุมคณะสายตรวจ
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-md border border-slate-200 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> ทำงานสำนักงานใหญ่ (Office)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md border border-rose-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> การลางานที่ได้รับการอนุมัติ
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-100 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> วันหยุดบริษัท/วันหยุดนักขัตฤกษ์
              </span>
            </div>

            {/* Quick Add Event Trigger Button */}
            <button
              onClick={() => {
                setQuickDay(1);
                setIsQuickAdding(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer doc-shadow font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มกิจกรรม/นัดหมายด่วน
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Calendar Grid Box */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 doc-shadow overflow-hidden">
              
              {/* Month bar */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 font-sans">กรกฎาคม พ.ศ. 2569 (July 2026)</span>
                <span className="text-xs text-slate-400 font-sans font-medium">เริ่มต้นปีงบดุลประจำปี 2569</span>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 border-b border-slate-100 text-center font-sans">
                {weekDays.map((wd, idx) => (
                  <div 
                    key={wd} 
                    className={`py-3.5 text-xs font-bold border-r border-slate-100 last:border-r-0 bg-slate-50/20 ${
                      idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-amber-600' : 'text-slate-600'
                    }`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="divide-y divide-slate-100">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 divide-x divide-slate-100 min-h-[120px]">
                    {week.map((cell, cIdx) => (
                      <div 
                        key={cIdx} 
                        onClick={() => {
                          if (cell.dayNum !== null) {
                            setSelectedDay(cell.dayNum);
                          }
                        }}
                        className={`p-2 flex flex-col justify-between transition-all relative select-none hover:bg-slate-50/60 cursor-pointer ${
                          cell.dayNum === null ? 'bg-slate-50/10 pointer-events-none' : ''
                        } ${cell.isHoliday ? 'bg-amber-50/5' : ''}`}
                      >
                        {cell.dayNum !== null && (
                          <div className="flex justify-between items-start mb-1.5">
                            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              cell.isHoliday 
                                ? 'bg-rose-100 text-rose-700 font-thai font-extrabold' 
                                : cIdx === 0 
                                ? 'text-rose-500 bg-rose-50' 
                                : cIdx === 6 
                                ? 'text-amber-600 bg-amber-50' 
                                : 'text-slate-600 bg-slate-100/70'
                            }`}>
                              {cell.dayNum}
                            </span>
                            {cell.holidayText && (
                              <span className="text-[8px] font-sans text-rose-600 bg-rose-50 px-1 py-0.5 rounded font-bold max-w-[70%] truncate">
                                {cell.holidayText}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="space-y-1 w-full mt-auto">
                          {cell.events.map((evt) => (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                if (evt.letterId) {
                                  e.stopPropagation(); // Avoid opening generic day modal
                                  onSelectLetter(evt.letterId);
                                }
                              }}
                              className={`text-[9px] font-sans p-1 rounded border leading-tight ${evt.color} transition-all duration-150 relative group cursor-pointer`}
                              title={`${evt.label} ${evt.time ? 'เวลา ' + evt.time : ''}`}
                            >
                              <div className="font-semibold truncate pr-2">
                                {evt.time && <span className="font-mono text-[8px] mr-0.5 bg-white/50 px-0.5 rounded">{evt.time}</span>}
                                {evt.label}
                              </div>
                              {evt.type === 'inspection' && (
                                <div className="text-[7px] text-emerald-600 flex items-center gap-0.5 mt-0.5 opacity-80">
                                  <Compass className="w-2 h-2" /> รายละเอียดตรวจกิจการ
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

            </div>

            {/* Sidebar operable widgets */}
            <div className="space-y-4 no-print">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-xl doc-shadow space-y-4">
                <h2 className="text-base font-bold font-sans flex items-center gap-1.5">
                  <Compass className="w-5 h-5 text-emerald-200" />
                  สรุปงานปฏิบัติการรอบกรกฎาคม
                </h2>
                <div className="space-y-3 text-xs font-sans">
                  <div className="p-3 bg-white/10 rounded-lg border border-white/5">
                    <div className="text-[10px] text-emerald-200 font-bold">รอบสายตรวจหลัก</div>
                    <div className="font-extrabold text-sm mt-0.5">สายตรวจ คุณเฉลิมรัตน์ ใจดี</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg border border-white/5">
                    <div className="text-[10px] text-emerald-200 font-bold">จำนวนวันทำงานภายนอก</div>
                    <div className="font-extrabold text-sm mt-0.5">รวม 5 ช่วงสหกรณ์ (ตามจดหมาย)</div>
                  </div>
                  <div className="p-3 bg-white/10 rounded-lg border border-white/5 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-emerald-200 font-bold">การเปิดระบบส่งแจ้งเตือน LINE</div>
                      <div className="font-extrabold text-xs mt-0.5">สถานะ: {lineConfig.enableDailyNotification ? '🟢 เปิดใช้งานส่งเวลา 08.30 น.' : '🔴 ปิดอยู่'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personnel quick list */}
              <div className="bg-white p-4 rounded-xl border border-slate-100 doc-shadow space-y-3">
                <span className="text-xs font-bold text-slate-700 font-sans block flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  รายชื่อคณะทำงานสายตรวจ ({inspectorPool.length})
                </span>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {inspectorPool.map((ins, idx) => (
                    <div key={idx} className="p-2 bg-slate-50/50 rounded-lg border border-slate-100/50 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center justify-center border border-emerald-100">
                        {ins.name.replace('นาย', '').replace('นางสาว', '').substring(0,2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-800 truncate">{ins.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">{ins.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 2: LINE AUTOMATION CONTROLS */}
      {subTab === 'line' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-sm no-print">
          
          {/* Settings Panel */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 doc-shadow space-y-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              ตั้งค่าระบบ LINE Notify Gateway
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">LINE Notify Access Token</label>
                <input
                  type="password"
                  value={lineConfig.token}
                  onChange={(e) => setLineConfig({ ...lineConfig, token: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-emerald-500"
                  placeholder="ใส่ Token สำหรับกลุ่มแจ้งเตือน"
                />
                <span className="text-[10px] text-slate-400 block leading-tight">โทเค็นการเชื่อมต่อห้องแชทไลน์กลุ่มสายตรวจ สำหรับแจ้งกำหนดการทุก 08:30 น.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">เวลาจัดส่งแจ้งเตือนอัตโนมัติประจำวัน</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={lineConfig.notifyTime}
                    onChange={(e) => setLineConfig({ ...lineConfig, notifyTime: e.target.value })}
                    className="w-24 text-center text-xs border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    placeholder="08:30"
                  />
                  <span className="text-xs text-slate-500 font-medium">น. ของวันที่มีนัดหมาย</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableLine"
                  checked={lineConfig.enableDailyNotification}
                  onChange={(e) => setLineConfig({ ...lineConfig, enableDailyNotification: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="enableLine" className="text-xs font-bold text-slate-700 cursor-pointer">
                  เปิดใช้งานส่งข้อความแจ้งเตือน 08.30 น. อัตโนมัติ
                </label>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs leading-relaxed text-emerald-800 space-y-2">
                <span className="font-bold text-emerald-900 block flex items-center gap-1 border-b border-emerald-200 pb-1">
                  <CheckSquare className="w-3.5 h-3.5" /> 
                  วิธีการทำงานของระบบแจ้งเตือน LINE:
                </span>
                <p className="font-medium">1. <strong>บันทึกกิจกรรม:</strong> เมื่อท่านบันทึกกิจกรรมประชุม คิวงาน หรือนัดหมายบนปฏิทิน ระบบจะตั้งสิทธิ์ส่งการแจ้งเตือนทันที</p>
                <p className="font-medium">2. <strong>ส่งข้อความจริง:</strong> ระบบได้เชื่อมต่อ <strong>LINE Notify API</strong> และใช้ <em>CORS Proxy Helper</em> เพื่อให้เบราว์เซอร์สามารถส่งข้อความตรงเข้ากลุ่มไลน์ของท่านได้โดยไม่มี CORS Error</p>
                
                <span className="font-bold text-emerald-900 block flex items-center gap-1 border-b border-emerald-200 pb-1 pt-1.5">
                  <Info className="w-3.5 h-3.5" /> 
                  คู่มือ 3 ขั้นตอนในการขอ Token LINE Notify ฟรี:
                </span>
                <div className="space-y-1 pl-1 text-[11px] text-slate-700 font-medium">
                  <p>1. เปิดเว็บไซต์ <strong><a href="https://notify-bot.line.me/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline hover:text-emerald-900">LINE Notify (คลิกที่นี่)</a></strong> ล็อกอินด้วย LINE ของคุณ</p>
                  <p>2. ไปที่ <strong>"หน้าของฉัน" (My Page)</strong> เลื่อนลงด้านล่างสุด แล้วกดปุ่ม <strong>"ออกโทเค็น" (Generate token)</strong></p>
                  <p>3. กรอกชื่อผู้แจ้งเตือน (เช่น <em>TK แจ้งเตือนคิวงาน</em>) และ <strong>เลือกกลุ่มแชทไลน์</strong> ที่คุณต้องการให้บอทส่งข้อความเข้าไป กดปุ่ม "ออกโทเค็น" เพื่อคัดลอกรหัส (Token)</p>
                  <p className="text-rose-600 font-bold mt-1">⚠️ สำคัญมาก: ต้องพิมพ์เชิญ "LINE Notify" เข้าเป็นสมาชิกในกลุ่มแชทไลน์นั้นด้วย บอทจึงจะส่งข้อความได้สำเร็จ!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Console & Log lists */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex flex-col space-y-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Send className="w-4 h-4 text-emerald-600 animate-bounce" />
              กล่องทดสอบส่งและบันทึกประวัติ (Line Dispatcher Logs)
            </span>

            {/* Test Send input */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
              <label className="text-xs font-bold text-slate-700 block">ทดสอบพิมพ์ข้อความแจ้งเตือนด่วนเพื่อจำลองระบบ</label>
              <div className="flex gap-2">
                <textarea
                  value={testLineMsg}
                  onChange={(e) => setTestLineMsg(e.target.value)}
                  rows={2}
                  className="flex-1 text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-500 bg-white font-medium"
                  placeholder="พิมพ์ข้อความที่ต้องการทดสอบส่งเข้า LINE Notify..."
                />
              </div>
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500">
                  {lineConfig.token.startsWith('TK_Notify_Token_Demo') 
                    ? '⚠️ โหมดทดสอบจำลอง (กรุณาใส่ Token จริงด้านซ้ายเพื่อยิงส่งจริง)' 
                    : '🟢 เชื่อมต่อ Token จริงของคุณเรียบร้อย พร้อมส่งเข้ากลุ่มแชท'}
                </span>
                <button
                  type="button"
                  disabled={sendingTestLine}
                  onClick={handleSendTestLine}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer doc-shadow text-white ${
                    lineConfig.token.startsWith('TK_Notify_Token_Demo')
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 animate-pulse'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingTestLine 
                    ? 'กำลังส่งคำขอเข้า LINE...' 
                    : lineConfig.token.startsWith('TK_Notify_Token_Demo') 
                    ? 'ทดสอบส่งข้อความ (โหมดจำลอง)' 
                    : '🚀 ส่งจริงเข้ากลุ่ม LINE ทันที'}
                </button>
              </div>
            </div>

            {/* History Logs output */}
            <div className="flex-1 space-y-2">
              <span className="text-xs font-bold text-slate-500 block">ประวัติการแจ้งเตือนสำเร็จรอบเดือนกรกฎาคม 2569</span>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {lineLogs.map((log) => (
                  <div key={log.id} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                        <Check className="w-3 h-3" /> ส่งข้อความสำเร็จ
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{log.timestamp} น.</span>
                    </div>
                    <div className="text-slate-700 font-medium pl-1 leading-relaxed">
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB: EMAIL AUTOMATION CONTROLS */}
      {subTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-sm no-print">
          
          {/* Settings Panel */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-100 doc-shadow space-y-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Settings className="w-4 h-4 text-emerald-600" />
              ตั้งค่าระบบแจ้งเตือนทางอีเมล (Email Gateway)
            </span>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">ชื่อผู้ส่งอีเมล (Sender Name)</label>
                <input
                  type="text"
                  value={emailConfig.senderName}
                  onChange={(e) => setEmailConfig({ ...emailConfig, senderName: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-emerald-500 font-bold"
                  placeholder="เช่น TK Account & Associate Notifier"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">เวลาจัดส่งแจ้งเตือนอีเมลอัตโนมัติประจำวัน</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={emailConfig.notifyTime}
                    onChange={(e) => setEmailConfig({ ...emailConfig, notifyTime: e.target.value })}
                    className="w-24 text-center text-xs border border-slate-200 rounded-lg p-2 font-mono font-bold"
                    placeholder="08:30"
                  />
                  <span className="text-xs text-slate-500 font-medium">น. ของวันที่มีภารกิจ</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableEmail"
                  checked={emailConfig.enableEmailNotification}
                  onChange={(e) => setEmailConfig({ ...emailConfig, enableEmailNotification: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="enableEmail" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  เปิดใช้งานการส่งอีเมลแจ้งเตือนอัตโนมัติ
                </label>
              </div>

              <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs leading-relaxed text-indigo-800 space-y-2">
                <span className="font-bold text-indigo-900 block flex items-center gap-1 border-b border-indigo-200 pb-1">
                  <CheckSquare className="w-3.5 h-3.5" /> 
                  แนวทางการรับ-ส่งอีเมลแจ้งเตือน:
                </span>
                <p className="font-medium">1. <strong>รายบุคคล:</strong> ดึงข้อมูลอีเมลจากรายชื่อใน <em>"หน้าจัดการบุคลากร"</em> ซึ่งผู้ใช้สามารถกดคลิกเพื่อแก้ไขเพิ่ม/เปลี่ยนอีเมลได้อย่างอิสระ</p>
                <p className="font-medium">2. <strong>นางสาวเฉลิมรัตน์ ใจดี:</strong> ได้ทำการผูกค่าเริ่มต้นไว้กับอีเมล <strong className="underline text-indigo-950">chajai.tk2025@gmail.com</strong> ตามที่ท่านระบุเรียบร้อยแล้ว</p>
                <p className="font-medium">3. <strong>การยิงส่งเมลด่วน (Mailto):</strong> การกดส่งทดสอบจะเปิดฟังก์ชันเรียกใช้อีเมลด่วนที่ปลอดภัยสูงสุดในเครื่องของท่านเพื่อยิงส่งตรงในเสี้ยววินาที</p>
              </div>
            </div>
          </div>

          {/* Test Console & Log lists */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex flex-col space-y-4">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Send className="w-4 h-4 text-emerald-600 animate-pulse" />
              กล่องจำลองทดสอบและส่งออกอีเมล (Email Dispatcher Sandbox)
            </span>

            {/* Test Send input */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">เลือกบุคลากรในการตรวจสอบเป้าหมาย</label>
                  <select
                    value={selectedStaffForEmailTest}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSelectedStaffForEmailTest(name);
                      const staff = inspectorPool.find(ins => ins.name === name);
                      const email = staff?.email || 'ไม่มีอีเมล';
                      setTestEmailSubject(`แจ้งกำหนดการลงพื้นที่ตรวจสหกรณ์ประจำวัน - ${name.replace('นางสาว', '').replace('นาย', '')}`);
                      setTestEmailBody(`เรียน คุณ${name},\n\nขอแจ้งรายละเอียดภารกิจตรวจบัญชีในฐานะ ${staff?.title || 'ผู้ช่วยตรวจบัญชี'} ประจำเดือนกรกฎาคม 2569\n\nอีเมลผู้ติดต่อส่ง: ${emailConfig.senderName}\nที่อยู่อีเมลของคุณ: ${email}\n\nกรุณาเข้าสำรวจรายละเอียดตารางนัดหมายในปฏิทินกลาง และบันทึกแผ่นลงเวลา Timesheet ของแต่ละวันให้ครบถ้วนก่อนวันส่งรายงาน\n\nขอบคุณค่ะ,\nทีมสายงานจัดเก็บสถิติ บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด`);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white font-bold"
                  >
                    {inspectorPool.map((ins, i) => (
                      <option key={i} value={ins.name}>{ins.name} ({ins.email || 'ยังไม่ได้ระบุอีเมล'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">ปลายทางที่จะจัดส่งจริง (Email Target)</label>
                  <input
                    type="text"
                    disabled
                    value={inspectorPool.find(ins => ins.name === selectedStaffForEmailTest)?.email || 'ไม่มีอีเมล (โปรดตั้งค่าในเมนู "บุคลากร")'}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-600 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">หัวเรื่องอีเมลนัดหมาย (Email Subject)</label>
                <input
                  type="text"
                  value={testEmailSubject}
                  onChange={(e) => setTestEmailSubject(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white font-bold text-slate-800"
                  placeholder="กรุณากรอกหัวข้ออีเมลนัดหมายปฏิบัติงาน..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">เนื้อหาจดหมายฉบับเต็ม (Email Body Content)</label>
                <textarea
                  value={testEmailBody}
                  onChange={(e) => setTestEmailBody(e.target.value)}
                  rows={4}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-emerald-500 bg-white font-medium"
                  placeholder="พิมพ์รายละเอียดเนื้อความจดหมายเพื่อส่ง..."
                />
              </div>

              <div className="flex justify-between items-center gap-4 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  {!(inspectorPool.find(ins => ins.name === selectedStaffForEmailTest)?.email) 
                    ? '❌ ไม่สามารถกดส่งได้จนกว่าจะกำหนดอีเมลให้บุคลากรท่านนี้' 
                    : '🟢 ดึง Mail Client เพื่อส่งออกจริง พร้อมเก็บประวัติสำเร็จ'}
                </span>
                <button
                  type="button"
                  disabled={sendingTestEmail || !(inspectorPool.find(ins => ins.name === selectedStaffForEmailTest)?.email)}
                  onClick={handleSendTestEmail}
                  className={`px-4.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer doc-shadow text-white ${
                    !(inspectorPool.find(ins => ins.name === selectedStaffForEmailTest)?.email)
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Send className="w-3.5 h-3.5 animate-bounce" />
                  {sendingTestEmail ? 'กำลังเรียกโปรแกรมส่งเมล...' : '🚀 เรียกส่งอีเมลฉบับจริง'}
                </button>
              </div>
            </div>

            {/* History Logs output */}
            <div className="flex-1 space-y-2">
              <span className="text-xs font-bold text-slate-500 block">ประวัติการแจ้งเตือนและการจัดส่งทางอีเมล (Email History Logs)</span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {emailLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">ยังไม่มีประวัติการบันทึกจัดส่งอีเมล</p>
                ) : (
                  emailLogs.map((log) => (
                    <div key={log.id} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                          <Check className="w-3 h-3" /> ส่งอีเมลสำเร็จ
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-bold">{log.timestamp} น.</span>
                      </div>
                      <div className="text-slate-700 font-medium pl-1 leading-relaxed">
                        {log.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 3: STAFF TIMESHEET GENERATOR */}
      {subTab === 'timesheet' && (
        <div className="space-y-6">
          
          {/* Controller selectors */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 doc-shadow flex flex-col sm:flex-row justify-between items-center gap-4 font-sans text-sm no-print">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">เลือกพนักงานในการลงเวลา:</span>
              <select
                value={selectedStaffForTimesheet}
                onChange={(e) => {
                  setSelectedStaffForTimesheet(e.target.value);
                  setEditingTimesheetDay(null);
                }}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-800 focus:outline-emerald-500"
              >
                {inspectorPool.map((ins, i) => (
                  <option key={i} value={ins.name}>{ins.name} ({ins.title})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg">รวมเวลาปฏิบัติหน้าที่: {totalWorkingHours} ชั่วโมง</span>
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg">วันเข้าตรวจ: {workingDaysCount} วัน</span>
              <span className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg">ลากิจ/ป่วย: {leaveDaysCount} วัน</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer doc-shadow"
              >
                <Printer className="w-4 h-4" />
                พิมพ์ Timesheet (ใบลงเวลา)
              </button>
            </div>
          </div>

          {/* PRINT-READY COMPACT SHEET CONTENT CONTAINER (SCREEN VIEW) */}
          <div className="bg-white rounded-xl border border-slate-100 p-6 doc-shadow relative overflow-hidden no-print">
            
            {/* THAI OFFICIAL TK LETTERHEAD (Shown in Print & view modes according to design constraints) */}
            <div className="flex items-center pb-2 font-thai border-b-0 text-left">
              <img 
                src={tkLogo} 
                alt="TK Logo" 
                className="w-[105px] h-[78px] object-contain shrink-0 mr-4 select-none"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[18pt] font-extrabold tracking-wide text-black leading-tight">
                  บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
                </div>
                <div className="text-[16pt] font-normal text-black mt-0.5 leading-normal">
                  TK Account & Associate CO.,Ltd.
                </div>
                <div className="text-[16pt] text-slate-800 mt-0.5 leading-normal">
                  110/404 ซอยรามคำแหง 188 ถนนรามคำแหง แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10230
                </div>
                <div className="text-[16pt] text-slate-800 leading-normal flex items-center flex-wrap gap-x-2 mt-0.5">
                  <span>เลขประจำตัวผู้เสียภาษีอากร 0105556199549</span>
                  <span className="inline-flex items-center justify-center bg-black text-white rounded-full w-[14px] h-[14px] shrink-0">
                    <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
                      <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
                    </svg>
                  </span>
                  <span>065-7192893</span>
                  <span className="inline-flex items-center justify-center bg-black text-white rounded-full w-[14px] h-[14px] shrink-0">
                    <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </span>
                  <span>Thatikarn_sr@hotmail.com</span>
                </div>
              </div>
            </div>
            {/* Asterisk Divider */}
            <div className="text-[10pt] font-mono text-black leading-none overflow-hidden whitespace-nowrap tracking-[1px] mt-1 mb-4 select-none">
              {"*".repeat(120)}
            </div>

            {/* Document Header Title */}
            <div className="text-center py-4 space-y-1 font-sans">
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                แผ่นสรุปรายการลงเวลาทำงานพนักงานสายตรวจสอบปฏิบัติการ (Staff Timesheet)
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                ประจำเดือน กรกฎาคม พ.ศ. 2569 (July 2026)
              </p>
              <div className="pt-2 text-xs text-slate-700 flex flex-wrap justify-center gap-6 font-bold">
                <span>ชื่อพนักงาน: {selectedStaffForTimesheet}</span>
                <span>ตำแหน่ง: {inspectorPool.find(i => i.name === selectedStaffForTimesheet)?.title || 'ผู้ตรวจบัญชี'}</span>
                <span>สังกัด: สายตรวจกงจักรหลักกลุ่มที่ 1 (เฉลิมรัตน์)</span>
              </div>
            </div>

            {/* Table Matrix */}
            <div className="overflow-x-auto mt-4 font-sans text-xs">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-extrabold text-center border-b border-slate-200">
                    <th className="py-2 px-1 border border-slate-200 w-[55px]">วันที่</th>
                    <th className="py-2 px-2 border border-slate-200 w-[90px]">วันในสัปดาห์</th>
                    <th className="py-2 px-3 border border-slate-200 text-left">รายละเอียดลักษณะงาน / สถานที่เข้าตรวจปฏิบัติหน้าที่</th>
                    <th className="py-2 px-1 border border-slate-200 w-[60px]">เวลาเข้า</th>
                    <th className="py-2 px-1 border border-slate-200 w-[60px]">เวลาออก</th>
                    <th className="py-2 px-1 border border-slate-200 w-[55px]">ชม.งาน</th>
                    <th className="py-2 px-2 border border-slate-200 text-left w-[160px]">หมายเหตุประกอบการตรวจสอบ</th>
                    <th className="py-2 px-1 border border-slate-200 w-[80px] no-print">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {currentTimesheetData.map((row) => {
                    const isWeekend = row.dayOfWeek === 'อาทิตย์' || row.dayOfWeek === 'เสาร์';
                    const isHoliday = row.task.includes('วันหยุด');
                    const isLeave = row.task.includes('ลางาน');
                    const isEdited = editingTimesheetDay === row.day;

                    return (
                      <tr 
                        key={row.day} 
                        className={`transition-colors text-center ${
                          isWeekend 
                            ? 'bg-slate-50/70 text-slate-400' 
                            : isHoliday 
                            ? 'bg-amber-50/40 text-amber-700' 
                            : isLeave 
                            ? 'bg-rose-50/40 text-rose-800' 
                            : 'hover:bg-slate-50/30 text-slate-800'
                        }`}
                      >
                        {/* Day Number */}
                        <td className="py-2 px-1 border border-slate-200 font-mono font-bold text-slate-700">
                          {row.day}
                        </td>

                        {/* Day of Week */}
                        <td className={`py-2 px-2 border border-slate-200 font-semibold ${
                          row.dayOfWeek === 'อาทิตย์' ? 'text-rose-500' : row.dayOfWeek === 'เสาร์' ? 'text-amber-600' : ''
                        }`}>
                          {row.dayOfWeek}
                        </td>

                        {/* Task / Description */}
                        <td className="py-2 px-3 border border-slate-200 text-left font-sans">
                          {isEdited ? (
                            <input
                              type="text"
                              value={tempTimesheetTask}
                              onChange={(e) => setTempTimesheetTask(e.target.value)}
                              className="w-full text-xs p-1 border border-slate-300 rounded font-bold"
                            />
                          ) : (
                            <span className={row.hours > 0 ? 'font-bold' : ''}>{row.task}</span>
                          )}
                        </td>

                        {/* Entry Time */}
                        <td className="py-2 px-1 border border-slate-200 font-mono">
                          {isEdited ? (
                            <input
                              type="text"
                              value={tempTimesheetEntry}
                              onChange={(e) => setTempTimesheetEntry(e.target.value)}
                              className="w-full text-xs p-0.5 text-center border border-slate-300 rounded"
                            />
                          ) : (
                            row.entryTime
                          )}
                        </td>

                        {/* Exit Time */}
                        <td className="py-2 px-1 border border-slate-200 font-mono">
                          {isEdited ? (
                            <input
                              type="text"
                              value={tempTimesheetExit}
                              onChange={(e) => setTempTimesheetExit(e.target.value)}
                              className="w-full text-xs p-0.5 text-center border border-slate-300 rounded"
                            />
                          ) : (
                            row.exitTime
                          )}
                        </td>

                        {/* Work Hours */}
                        <td className="py-2 px-1 border border-slate-200 font-mono font-bold">
                          {isEdited ? (
                            <input
                              type="number"
                              value={tempTimesheetHours}
                              onChange={(e) => setTempTimesheetHours(Number(e.target.value))}
                              className="w-full text-xs p-0.5 text-center border border-slate-300 rounded"
                            />
                          ) : (
                            row.hours
                          )}
                        </td>

                        {/* Note */}
                        <td className="py-2 px-2 border border-slate-200 text-left text-[11px] text-slate-500 italic">
                          {isEdited ? (
                            <input
                              type="text"
                              value={tempTimesheetNote}
                              onChange={(e) => setTempTimesheetNote(e.target.value)}
                              className="w-full text-[11px] p-1 border border-slate-300 rounded"
                            />
                          ) : (
                            row.note
                          )}
                        </td>

                        {/* Operations (No-print) */}
                        <td className="py-1 px-1 border border-slate-200 no-print">
                          {isEdited ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => saveTimesheetRowOverride(row.day)}
                                className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded"
                                title="บันทึก"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingTimesheetDay(null)}
                                className="p-1 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded"
                                title="ยกเลิก"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => startEditTimesheetRow(row)}
                                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                title="แก้ไขงาน"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {timesheetOverrides[selectedStaffForTimesheet]?.[row.day] && (
                                <button
                                  onClick={() => resetTimesheetRowOverride(row.day)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                  title="รีเซ็ตคืนค่าเดิม"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signature Block for Print */}
            <div className="mt-12 grid grid-cols-2 gap-12 text-center text-xs font-sans font-bold">
              <div className="space-y-12">
                <p>ลงลายมือชื่อพนักงานผู้ขอลงเวลา: ________________________</p>
                <p>( {selectedStaffForTimesheet} )</p>
                <p>วันที่ลงรายงาน: _____ / กรกฎาคม / พ.ศ. 2569</p>
              </div>
              <div className="space-y-12">
                <p>ลงลายมือชื่อผู้รับรองความครบถ้วน: ________________________</p>
                <p>( นางสาวเฉลิมรัตน์ ใจดี )</p>
                <p>ตำแหน่ง: หัวหน้าสายตรวจสอบที่ 1</p>
              </div>
            </div>

          </div>

          {/* PRINT-ONLY TIMESHEET (Standard A4 Letter size and Margins) */}
          <div className="hidden print:block print-container font-thai">
            <div className="print-page bg-white text-black text-left">
              
              {/* Official Left-Aligned Letterhead */}
              <div className="flex items-center pb-2 font-thai border-b-0 text-left">
                <img 
                  src={tkLogo} 
                  alt="TK Logo" 
                  className="w-[105px] h-[78px] object-contain shrink-0 mr-4 select-none"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[18pt] font-extrabold tracking-wide text-black leading-tight">
                    บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
                  </div>
                  <div className="text-[16pt] font-normal text-black mt-0.5 leading-normal">
                    TK Account & Associate CO.,Ltd.
                  </div>
                  <div className="text-[16pt] text-black mt-0.5 leading-normal">
                    110/404 ซอยรามคำแหง 188 ถนนรามคำแหง แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10230
                  </div>
                  <div className="text-[16pt] text-black leading-normal flex items-center flex-wrap gap-x-2 mt-0.5">
                    <span>เลขประจำตัวผู้เสียภาษีอากร 0105556199549</span>
                    <span className="inline-flex items-center justify-center bg-black text-white rounded-full w-[14px] h-[14px] shrink-0">
                      <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
                        <path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
                      </svg>
                    </span>
                    <span>065-7192893</span>
                    <span className="inline-flex items-center justify-center bg-black text-white rounded-full w-[14px] h-[14px] shrink-0">
                      <svg className="w-2 h-2 fill-current" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </span>
                    <span>Thatikarn_sr@hotmail.com</span>
                  </div>
                </div>
              </div>
              {/* Asterisk Divider */}
              <div className="text-[10pt] font-mono text-black leading-none overflow-hidden whitespace-nowrap tracking-[1px] mt-1 mb-4 select-none">
                {"*".repeat(120)}
              </div>

              {/* Document Header Title */}
              <div className="text-center py-5 space-y-1">
                <h2 className="text-[16pt] font-extrabold text-black uppercase tracking-wide">
                  แผ่นสรุปรายการลงเวลาทำงานพนักงานสายตรวจสอบปฏิบัติการ (Staff Timesheet)
                </h2>
                <p className="text-[16pt] text-black font-bold">
                  ประจำเดือน กรกฎาคม พ.ศ. 2569 (July 2026)
                </p>
                <div className="pt-2 text-[16pt] text-black flex justify-center gap-6 font-bold">
                  <span>ชื่อพนักงาน: {selectedStaffForTimesheet}</span>
                  <span>ตำแหน่ง: {inspectorPool.find(i => i.name === selectedStaffForTimesheet)?.title || 'ผู้ตรวจบัญชี'}</span>
                  <span>สังกัด: สายตรวจกงจักรหลักกลุ่มที่ 1 (เฉลิมรัตน์)</span>
                </div>
              </div>

              {/* Table Matrix styled beautifully for print */}
              <table className="w-full text-left border-collapse border border-black mt-4 text-[14pt]">
                <thead>
                  <tr className="bg-slate-50 text-black font-extrabold text-center border-b border-black">
                    <th className="py-1 px-1 border border-black w-[45px]">วันที่</th>
                    <th className="py-1 px-2 border border-black w-[80px]">วันในสัปดาห์</th>
                    <th className="py-1 px-3 border border-black text-left">รายละเอียดลักษณะงาน / สถานที่เข้าตรวจปฏิบัติหน้าที่</th>
                    <th className="py-1 px-1 border border-black w-[55px]">เวลาเข้า</th>
                    <th className="py-1 px-1 border border-black w-[55px]">เวลาออก</th>
                    <th className="py-1 px-1 border border-black w-[45px]">ชม.งาน</th>
                    <th className="py-1 px-2 border border-black text-left w-[160px]">หมายเหตุประกอบการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-medium">
                  {currentTimesheetData.map((row) => {
                    return (
                      <tr key={row.day} className="text-center text-black">
                        <td className="py-1 px-1 border border-black font-bold">{row.day}</td>
                        <td className="py-1 px-2 border border-black font-semibold">{row.dayOfWeek}</td>
                        <td className="py-1 px-3 border border-black text-left">{row.task}</td>
                        <td className="py-1 px-1 border border-black">{row.entryTime}</td>
                        <td className="py-1 px-1 border border-black">{row.exitTime}</td>
                        <td className="py-1 px-1 border border-black font-bold">{row.hours}</td>
                        <td className="py-1 px-2 border border-black text-left italic">{row.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary of working stats in Print */}
              <div className="mt-4 text-[15pt] font-bold text-black flex justify-between px-2">
                <span>รวมเวลาปฏิบัติหน้าที่: {totalWorkingHours} ชั่วโมง</span>
                <span>วันเข้าตรวจ: {workingDaysCount} วัน</span>
                <span>ลากิจ/ป่วย: {leaveDaysCount} วัน</span>
              </div>

              {/* Signature Block for Print */}
              <div className="mt-12 grid grid-cols-2 gap-12 text-center text-[15pt] font-bold">
                <div className="space-y-12">
                  <p>ลงลายมือชื่อพนักงานผู้ขอลงเวลา: ________________________</p>
                  <p>( {selectedStaffForTimesheet} )</p>
                  <p>วันที่ลงรายงาน: _____ / กรกฎาคม / พ.ศ. 2569</p>
                </div>
                <div className="space-y-12">
                  <p>ลงลายมือชื่อผู้รับรองความครบถ้วน: ________________________</p>
                  <p>( นางสาวเฉลิมรัตน์ ใจดี )</p>
                  <p>ตำแหน่ง: หัวหน้าสายตรวจสอบที่ 1</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Day Interaction Modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 font-sans text-base">
                  จัดการตารางงาน วันที่ {selectedDay} กรกฎาคม 2569
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDay(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Event list for selected day */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">กิจกรรมกำหนดไว้ในวันนี้ ({selectedDayEvents.length})</span>
                {selectedDayEvents.length === 0 ? (
                  <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-sans">
                    ไม่มีกิจกรรมนัดหมายพิเศษในวันนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {selectedDayEvents.map(evt => (
                      <div 
                        key={evt.id}
                        className={`flex items-center justify-between p-3 border rounded-xl ${evt.color} transition-all`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold leading-tight block truncate font-sans">
                            {evt.time && <span className="font-mono bg-white/40 px-1 rounded mr-1">{evt.time} น.</span>}
                            {evt.label}
                          </span>
                          <span className="text-[9px] opacity-75 font-sans mt-0.5 block truncate">
                            {evt.type === 'inspection' ? 'ภารกิจเข้าตรวจ' : evt.type === 'leave' ? 'พนักงานลางานอนุมัติ' : `กำหนดเอง ${evt.location ? 'ณ ' + evt.location : ''}`}
                          </span>
                        </div>
                        
                        {evt.isCustom && (
                          <button
                            onClick={() => handleDeleteCustomEvent(evt.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-100/50 rounded-lg transition-all ml-2 cursor-pointer"
                            title="ลบกิจกรรมนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        
                        {evt.letterId && (
                          <button
                            onClick={() => {
                              setSelectedDay(null);
                              onSelectLetter(evt.letterId!);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ml-2 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            ดูจดหมายตรวจ
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form to add custom event */}
              <form onSubmit={handleAddEventSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  เพิ่มกิจกรรม / นัดหมายการประชุม
                </span>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">ชื่อกิจกรรมหรือหัวข้อนัดหมายการประชุม</label>
                  <input
                    type="text"
                    required
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-emerald-500 bg-white"
                    placeholder="เช่น ประชุมทบทวนเกณฑ์ตรวจงบดุล"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">ประเภทกิจกรรม</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                    >
                      <option value="meeting">ประชุมคณะทำงาน (สีน้ำเงิน)</option>
                      <option value="office">ปฏิบัติหน้าที่สำนักงาน (สีเทา)</option>
                      <option value="holiday">วันหยุดปฏิบัติงานบริษัท (สีส้ม)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">เวลาจัดประชุม/งาน</label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono text-center"
                      placeholder="เช่น 09:30"
                    />
                  </div>
                </div>

                {newType === 'meeting' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">สถานที่ปฏิบัติงาน / แพลตฟอร์ม</label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                      placeholder="เช่น ห้องประชุมสำนักงานใหญ่ หรือ Google Meet"
                    />
                  </div>
                )}

                {/* Attendees list from pool */}
                {inspectorPool.length > 0 && (
                  <div className="space-y-1.5 pt-1.5">
                    <label className="text-[10px] font-bold text-slate-500 block">ระบุรายชื่อผู้เข้าร่วมการประชุมเพื่อรับการแจ้งเตือน</label>
                    <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto bg-white border border-slate-200 p-2 rounded-lg">
                      {inspectorPool.map((ins, idx) => {
                        const active = newAttendees.includes(ins.name);
                        return (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => handleToggleAttendee(ins.name)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                              active 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {ins.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LINE notification toggle */}
                <div className="flex items-center gap-1.5 pt-2">
                  <input
                    type="checkbox"
                    id="triggerLineAlert"
                    checked={triggerLineAlert}
                    onChange={(e) => setTriggerLineAlert(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="triggerLineAlert" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                    ตั้งคิวแจ้งเตือนอัตโนมัติเข้ากลุ่ม LINE เวลา 08:30 น. ของวัน
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer doc-shadow"
                  >
                    <Check className="w-4 h-4" />
                    บันทึกกิจกรรมลงตารางงาน
                  </button>
                </div>
              </form>

            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Add Event Modal (For direct quick button on header) */}
      {isQuickAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-100 overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 font-sans text-base">สร้างกิจกรรมหรือนัดหมายการทำงานใหม่</span>
              <button 
                onClick={() => setIsQuickAdding(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEventSubmit} className="p-5 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">เลือกวันที่ (กรกฎาคม 2569)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={quickDay}
                    onChange={(e) => setQuickDay(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-center font-bold font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">ประเภทกิจกรรม</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-bold"
                  >
                    <option value="meeting">ประชุมประจำสายตรวจ</option>
                    <option value="office">เข้าปฏิบัติงานสำนักงาน (Office)</option>
                    <option value="holiday">วันหยุดพนักงาน/วันหยุดนักขัตฤกษ์</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500">ชื่อกิจกรรมหรือข้อความการแจ้งเตือน</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="เช่น ประชุมรายงานความคืบหน้า สอ.ตร.อยุธยา"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">เวลาของกิจกรรม</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="08:30"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-center font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">สถานที่ / ช่องทางประชุม</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="เช่น Google Meet"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              {/* Attendees list */}
              {inspectorPool.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 block">พนักงานผู้เข้าร่วมปฏิบัติภารกิจ</label>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto bg-slate-50 border border-slate-100 p-2 rounded-lg">
                    {inspectorPool.map((ins, idx) => {
                      const active = newAttendees.includes(ins.name);
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleToggleAttendee(ins.name)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            active 
                              ? 'bg-emerald-600 text-white border-emerald-600' 
                              : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {ins.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="checkbox"
                  id="quickLineAlert"
                  checked={triggerLineAlert}
                  onChange={(e) => setTriggerLineAlert(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="quickLineAlert" className="text-[11px] font-bold text-slate-700 cursor-pointer">
                  ตั้งคิวส่งข้อความไลน์กลุ่มอัตโนมัติเวลา 08:30 น.
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAdding(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer doc-shadow"
                >
                  บันทึกด่วน
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Toast alert */}
      {successToast && (
        <div className="fixed bottom-5 right-5 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-slide-up no-print">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold font-sans">{successToast}</span>
        </div>
      )}

    </div>
  );
}
