export interface Inspector {
  id: string;
  name: string;
  title: string;
  email?: string;
}

export type ChecklistStyle = '17-items' | '20-items';

export interface CooperativeLetter {
  id: string;
  orgName: string;
  letterDate: string;
  recipient: string;
  meetingYear: string;
  repName: string;
  fiscalYearEnd: string;
  inspectionMonth: string;
  inspectionPeriod: string;
  inspectionDatesText: string;
  inspectors: Inspector[];
  checklistStyle: ChecklistStyle;
  checklistItems: string[];
  signeeName: string;
  signeeTitle: string;
  logoType: 'standard' | 'custom';
}

export interface LeaveStatRow {
  taken: string;
  current: string;
  total: string;
}

export interface LeaveRequest {
  id: string;
  dateText: string;
  subject: string;
  recipient: string;
  employeeName: string;
  employeeTitle: string;
  leaveType: 'sick' | 'personal' | 'vacation';
  reason: string;
  delegateName: string;
  hasLastLeave: boolean;
  lastLeaveType: 'sick' | 'personal' | 'vacation' | '';
  lastLeaveStart: string;
  lastLeaveEnd: string;
  lastLeaveDays: string;
  contactAddress: string;
  contactPhone: string;
  delegateSignName: string;
  approvalStatus: 'approved' | 'not_approved' | 'pending';
  approvalReason: string;
  stats: {
    sick: LeaveStatRow;
    personal: LeaveStatRow;
    vacation: LeaveStatRow;
  };
  checkerName: string;
  approverName: string;
  leaveCalendarDay?: number;
}

