import React, { useState, useEffect } from 'react';
import { CooperativeLetter } from '../types';
import { INITIAL_LETTERS } from '../data';
import { 
  FileText, Printer, ChevronLeft, ChevronRight, Settings, Layout, Info, Edit, Trash2, Plus,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Undo2, Redo2
} from 'lucide-react';
// @ts-ignore
import tkLogo from '../assets/images/tk_logo_1782903136304.jpg';

interface MonthlyReportGeneratorProps {
  letters: CooperativeLetter[];
}

export default function MonthlyReportGenerator({ letters }: MonthlyReportGeneratorProps) {
  const coopList = letters || INITIAL_LETTERS;
  const [selectedCoopId, setSelectedCoopId] = useState<string>(coopList[0]?.id || 'ayutthaya-police');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'loans' | 'deposits' | 'capital' | 'followup'>('general');
  const [showIframeModal, setShowIframeModal] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  
  // Active page selector in sidebar to jump to different pages
  const [activePreviewPage, setActivePreviewPage] = useState<number>(1);
  const [wordMode, setWordMode] = useState<boolean>(false);

  const formatDoc = (cmd: string, value: string = '') => {
    try {
      document.execCommand(cmd, false, value);
    } catch (e) {
      console.warn('Formatting error:', e);
    }
  };

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // 1. General Info States
  const [reportNo, setReportNo] = useState<string>('TK-AUD-06/2569');
  const [reportDate, setReportDate] = useState<string>('วันที่ 9 มิถุนายน 2569');
  const [subject, setSubject] = useState<string>('รายงานการตรวจสอบกิจการ');
  const [recipient, setRecipient] = useState<string>('คณะกรรมการดำเนินการ');
  const [inspectionDatesText, setInspectionDatesText] = useState<string>('8 มิถุนายน 2569');
  const [inspectorsText, setInspectorsText] = useState<string>('นางสาวเฉลิมรัตน์ ใจดี');
  const [periodText, setPeriodText] = useState<string>('พฤษภาคม 2569');
  const [meetingYearText, setMeetingYearText] = useState<string>('2568');
  const [meetingDateText, setMeetingDateText] = useState<string>('8 พฤศจิกายน 2568');
  const [fiscalYearText, setFiscalYearText] = useState<string>('30 กันยายน 2569');

  // 2. Loan Stats Table 1
  const [loanStats, setLoanStats] = useState({
    emergency: { aprQty: 102, mayQty: 129, aprAmt: 7865000, mayAmt: 6770500 },
    regular: { aprQty: 14, mayQty: 8, aprAmt: 16350000, mayAmt: 12150000 },
    special: { aprQty: 32, mayQty: 11, aprAmt: 14472000, mayAmt: 9130000 }
  });

  // Table 2: Random Contract Audit
  const [loanAudit, setLoanAudit] = useState({
    emergency: { qty: 77, amt: 3801000, pct: 56.14 },
    regular: { qty: 6, amt: 10850000, pct: 89.30 },
    special: { qty: 9, amt: 8870000, pct: 97.15 }
  });

  // 3. Deposit Stats Table 3
  const [memberDeposits, setMemberDeposits] = useState([
    { name: 'ออมทรัพย์', rate: '3.00%', aprBal: 271921548.87, mayBal: 275078242.88, interest: 13484.51 },
    { name: 'ออมทรัพย์ (โครงการวันออม ปี2569)', rate: '3.50%', aprBal: 141000.00, mayBal: 169000.00, interest: 0.00 }
  ]);

  const [otherCoopDeposits, setOtherCoopDeposits] = useState([
    { name: 'ชุมนุมสหกรณ์ออมทรัพย์ภาคกลาง', rate: '3.00%', aprBal: 30000000.00, mayBal: 30000000.00, interest: 71506.85 },
    { name: 'สอ.ม.พระจอมเกล้าธนบุรี จำกัด(1)', rate: '3.25%', aprBal: 30000000.00, mayBal: 30000000.00, interest: 77465.75 },
    { name: 'สอ.ไทยยาซากิและในเครือ(2)', rate: '3.20%', aprBal: 100000000.00, mayBal: 100000000.00, interest: 254246.58 },
    { name: 'สอ.ไทยยาซากิและในเครือ(3)', rate: '3.00%', aprBal: 70000000.00, mayBal: 70000000.00, interest: 166849.31 },
    { name: 'สอ.ม.พระจอมเกล้าธนบุรี จำกัด(2)', rate: '2.95%', aprBal: 170000000.00, mayBal: 170000000.00, interest: 398452.05 },
    { name: 'สอ.มหาวิทยาลัยสงขลานครินทร์', rate: '3.00%', aprBal: 100000000.00, mayBal: 100000000.00, interest: 238356.16 }
  ]);

  // 4. Liabilities Table 4
  const [promissoryNotes, setPromissoryNotes] = useState([
    { name: 'ธนาคาร ธกส.(วงเงินกู้ 1,400 ล้านบาท)', rate: '2.90%', aprBal: 982000000.00, mayBal: 955000000.00, interest: 2247619.19 }
  ]);

  const [otherCoopLoans, setOtherCoopLoans] = useState([
    { name: 'สอ.มหาวิทยาลัยมหิดล', rate: '2.75%', aprBal: 239500000.00, mayBal: 234250000.00, interest: 523291.10 },
    { name: 'ชุมนุมสหกรณ์ออมทรัพย์แห่งประเทศไทย', rate: '2.50%', aprBal: 12800000.00, mayBal: 12400000.00, interest: 25424.66 },
    { name: 'ชุมนุมสหกรณ์ออมทรัพย์แห่งประเทศไทย(1)', rate: '3.00%', aprBal: 51200000.00, mayBal: 49600000.00, interest: 122038.36 },
    { name: 'ชุมนุมสหกรณ์ออมทรัพย์แห่งประเทศไทย(3)', rate: '1.00%', aprBal: 7499800.00, mayBal: 6666400.00, interest: 5958.75 }
  ]);

  // 5. Member Statistics Table 5
  const [memberStats, setMemberStats] = useState({
    regular: { beg: 2287, add: 6, dec: 0, dead: 4 },
    associate: { beg: 100, add: 5, dec: 1, dead: 0 }
  });

  // Table 6: Share Capital Movements
  const [shareCapital, setShareCapital] = useState({
    aprBal: 1256997840.00,
    mayBal: 1258029470.00
  });

  // Table 7: Reserve Funds
  const [reserveFunds, setReserveFunds] = useState([
    { name: 'ทุนสำรอง', aprBal: 233713570.98, mayBal: 233713570.98 },
    { name: 'ทุนสาธารณประโยชน์', aprBal: 465228.23, mayBal: 439228.23 },
    { name: 'ทุนรักษาระดับอัตราเงินปันผล', aprBal: 1149922.03, mayBal: 1149922.03 },
    { name: 'ทุนเพื่อการศึกษาอบรมทางสหกรณ์', aprBal: 2309007.00, mayBal: 2210112.00 },
    { name: 'ทุนจัดตั้งสำนักงานหรือทุนอื่นๆ เพื่อเสริมสร้างความมั่นคง', aprBal: 6167271.40, mayBal: 6167271.40 }
  ]);

  // 6. Table 3.8 Follow Up List (Across Page 6, 7, 8)
  const [followUpRows, setFollowUpRows] = useState([
    {
      id: 'oct-2568',
      month: 'ตุลาคม 2568',
      topic: 'การพิสูจน์ลายมือชื่อของสมาชิก',
      detection: 'จากการตรวจสอบสัญญาเงินกู้ฉุกเฉิน ผู้ตรวจกิจการต้องการเปรียบเทียบการลงลายมือชื่อผู้กู้และผู้ค้ำประกัน จึงขอดูใบสมัครสมาชิกของทั้งผู้กู้และผู้ค้ำประกัน ทางสหกรณ์แจ้งว่าไม่มีเอกสารใบสมัครเนื่องจากเอกสารเสียหายจากเหตุน้ำท่วมในอดีต ผู้ตรวจกิจการจึงขอดูทะเบียนลายมือชื่อสมาชิกในระบบเงินรับฝากพบว่าทั้งผู้กู้และผู้ค้ำประกันมีบัญชีเงินรับฝากแต่ไม่มีลายมือชื่อในระบบฯ สหกรณ์แจ้งว่า มีมติที่ประชุมใหญ่สามัญประจำปี 2564 ที่ให้ "เปิดบัญชีให้สมาชิกโดยอัตโนมัติ คนละ 100 บาท" ทำให้ไม่มีลายมือชื่อในระบบเงินฝาก ซึ่งขัดแย้งกับระเบียบว่าด้วย การรับเงินฝากออมทรัพย์ พ.ศ. ๒๕๖๗ ของสหกรณ์ฯ ข้อ 5 และ 6 ที่กำหนดให้การเปิดบัญชีต้องเป็นไปตามความประสงค์ของสมาชิก สมาชิกต้องมาดำเนินการยื่นคำขอด้วยตนเอง พร้อมยื่นหนังสือขอเปิดบัญชีเงินฝาก และต้องให้ตัวอย่างลายมือชื่อของตนหรือตัวแทนผู้มีอำนาจถอนเงิน',
      impact: '1. ปัญหาในการพิสูจน์ลายมือชื่อของสมาชิก เมื่อต้องการพิสูจน์ลายมือชื่อของสมาชิกจะไม่สามารถตรวจสอบลายมือชื่อกับตัวอย่างที่ให้ไว้ได้ตามระเบียบข้อ 6\n\n2. ระเบียบว่าด้วย การรับเงินฝากออมทรัพย์ พ.ศ. ๒๕๖๗ ข้อ 7 “จำนวนเงินฝากในบัญชีนั้น ในเวลาหนึ่งเวลาใดต้องไม่น้อยกว่าห้าร้อยบาท”',
      resolution: '1. สหกรณ์ฯ จัดทำประกาศ หรือ หนังสือเวียน แจ้งให้สมาชิกทุกคนทราบเพื่อให้สมาชิกมายื่น "หนังสือขอเปิดบัญชี" ด้วยตนเอง โดยต้องมีใบคำขอ/ตัวอย่างลายมือชื่อจากสมาชิก และฝากเงินให้บัญชีมียอดไม่น้อยกว่าห้าร้อยบาท เพื่อให้เป็นไปตามระเบียบว่าด้วย การรับเงินฝากออมทรัพย์ พ.ศ. ๒๕๖๗',
      followup: 'ที่ประชุมคณะกรรมการดำเนินการ ครั้งที่ 2/2568 เมื่อวันที่ 26 พฤศจิกายน 2568 รับทราบผลการตรวจกิจการประจำเดือนตุลาคม 2568 ของผู้ตรวจกิจการ และมีแนวทางแก้ไข ดังนี้\n\n1. แก้ไขระเบียบสหกรณ์ฯ ทุนสวัสดิการหรือสงเคราะห์สมาชิกและทุนสาธารณประโยชน์ พ.ศ.2568 เรื่องของสวัสดิการวันเกิดเข้าบัญชีเงินฝาก (เล่มแดง) ต่อไปนี้ เมื่อสมาชิกมาติดต่อก็จะมีการแก้ไขลายมือชื่อให้ถูกต้อง\n\n2. ติดตามการแก้ไขในเดือนมิถุนายน พบว่า เมื่อสหกรณ์โอนเงินสวัสดิการวันเกิดเข้าบัญชีเงินฝาก (เล่มแดง) จำนวนบัญชีละ 500 บาท และได้แจ้งให้สมาชิกทราบว่าได้โอนเงินเข้าบัญชีแล้ว แต่สมาชิกจะยังถอนเงินมิได้ เนื่องจากตามระเบียบว่าด้วย การรับเงินฝากออมทรัพย์ พ.ศ.2567 ข้อ 7 “เงินฝากในบัญชีนั้น ในเวลาหนึ่งเวลาใดต้องไม่น้อยกว่า 500 บาท” ทำให้สมาชิกไม่สามารถถอนเงินจากบัญชีได้ สมาชิกจึงไม่เข้ามาติดต่อสหกรณ์เพื่อเพิ่มลายมือชื่อ และถอนเงิน ทั้งนี้สหกรณ์ยังได้ประชาสัมพันธ์ ขอความร่วมมือไปยังสมาชิกให้เข้ามาติดต่อ ให้มีการแก้ไขลายมือในระบบเงินรับฝากให้ถูกต้อง ทั้งทางไลน์ส่วนกลางสหกรณ์ และทางหน่วยงานของสมาชิก'
    },
    {
      id: 'jan-2569-1',
      month: 'มกราคม 2569',
      topic: 'สถานที่จัดเก็บเอกสารสัญญาเงินกู้',
      detection: '1. ตรวจสอบสถานที่จัดเก็บเอกสารสัญญาเงินกู้ของสหกรณ์ พบว่า สถานที่จัดเก็บเอกสารสัญญาเงินกู้ในบางห้องมีอุณหภูมิไม่เหมาะสมในการจัดเก็บเอกสาร\n\n2. ไม่มีทะเบียนคุมเอกสารที่จัดเก็บไว้เพื่อความสะดวกและรวดเร็วในการค้นหา',
      impact: '1. เอกสารสัญญาเงินกู้ ซีดจาง จากความร้อน เอกสารเสียหายไม่สามารถนำมาใช้เป็นหลักฐานตามกฎหมายเมื่อเกิดข้อพิพาท\n\n2. ไม่เป็นไปตามระเบียบสหกรณ์ฯ ว่าด้วยการเก็บรักษา ยืม และทำลายเอกสารของสหกรณ์ พ.ศ.2554 (ข้อ 4.การเก็บเอกสารที่ปฏิบัติเสร็จแล้ว ให้พนักงานฝ่ายธุรการแยกเอกสารนั้นๆเป็นเรื่องๆ เย็บเข้าเล่มหรือเก็บเข้าแฟ้ม พร้อมทั้งทำบัญชีหน้าเรื่องของบัญชีเรื่องประจำแฟ้มด้วย เอกสารใดซึ่งไม่สามารถเก็บโดยวิธีดังกล่าวได้ ให้มัดรวมกันเป็นหมวดหมู่ไว้ในที่เดียวกัน พร้อมทั้งทำบัญชีหน้าเรื่องประจำหมวดหมู่ เสร็จแล้วให้ทำสารบัญเรื่อง หรือแฟ้ม หรือหมวดหมู่ของเอกสารนั้นๆด้วย เพื่อความสะดวกและรวดเร็วในการค้นหาเป็นสำคัญ เมื่อทำการตรวจบัญชีประจำปีเสร็จเรียบร้อยแล้ว ให้พนักงานเก็บเอกสาร รวบรวมเอกสารที่ทำการตรวจบัญชีแล้วนั้นเก็บไว้ในที่อันปลอดภัย)',
      resolution: '1. สหกรณ์ฯ ควรดำเนินการเก็บรักษาเอกสารนั้นๆ ให้ปลอดภัย หลีกเลี่ยงห้องที่มีความร้อน แสงUV หรือความชื้นสูง ควรเก็บในชั้นวางที่สูงจากพื้น เพื่อป้องกันน้ำท่วมหรือความชื้นจากพื้นห้อง และปลอดภัยจากอัคคีภัย\n\n2. สหกรณ์ฯ ควรดำเนินการตามระเบียบสหกรณ์ฯ ว่าด้วยการเก็บรักษา ยืม และทำลายเอกสารของสหกรณ์ พ.ศ.2554 ในการจัดทำทะเบียนคุม หรือสารบัญ หรือหมวดหมู่เอกสารนั้นๆ',
      followup: '1.สหกรณ์ฯ รับทราบ อยู่ระหว่างดำเนินตามแนวทางแก้ไขและข้อเสนอแนะ\n\n2.สหกรณ์ฯ รับทราบ อยู่ระหว่างดำเนินตามแนวทางแก้ไขและข้อเสนอแนะ'
    },
    {
      id: 'mar-2569-1',
      month: 'มีนาคม 2569',
      topic: 'หลักประกันสัญญาเงินกู้บกพร่อง',
      detection: 'หลักประกันสัญญาเงินกู้บกพร่อง สัญญาเงินกู้ที่ผู้ค้ำประกันพ้นสภาพ หรือลาออกแล้ว ผู้กู้มิสามารถหาผู้ค้ำประกันสัญญารายใหม่มาค้ำประกันแทนได้',
      impact: 'หลักประกันบกพร่อง',
      resolution: 'เมื่อเกิดเหตุใดที่ทำให้หลักทรัพย์ค้ำประกันบกพร่อง ให้สหกรณ์ฯ รีบแจ้งผู้กู้ ผู้ค้ำประกัน หรือผู้ที่เกี่ยวข้องดำเนินการแก้ไข โดยนำหลักทรัพย์อื่นมาค้ำประกันแทน หรือหาคนมาค้ำประกัน เพื่อทดแทนหลักค้ำประกันเดิมโดยเร็ว',
      followup: '1.สหกรณ์ฯ รับทราบ อยู่ระหว่างดำเนินตามแนวทางแก้ไขและข้อเสนอแนะ'
    },
    {
      id: 'apr-2569-1',
      month: 'เมษายน 2569',
      topic: 'สุ่มตรวจสอบเอกสาร ใบถอนเงินฝากออมทรัพย์',
      detection: '1. สุ่มตรวจสอบเอกสาร ใบถอนเงินฝากออมทรัพย์ เลขที่บัญชี 11023465 พบว่าสมาชิกแจ้งถอนเงินออนไลน์ จำนวน 100,000 บาท โดยโอนเข้าบัญชีธนาคารของสมาชิกเองใน วันที่ 9 เม.ย.69 และสหกรณ์ฯ ได้แจ้งสมาชิกให้ส่งใบถอนฉบับจริงมาให้ ณ วันเข้าตรวจกิจการ วันที่ 7 พ.ค.69 สหกรณ์ฯ ยังมิได้รับเอกสารใบถอนเงินฉบับจริงจากสมาชิก',
      impact: '1. ไม่เป็นไปตามระเบียบว่าด้วย การรับเงินฝากออมทรัพย์ พ.ศ.2567 หมวด 3 การถอนเงินฝากและการปิดบัญชี ข้อ 12 การถอนเงินจากบัญชีเงินฝากต้องใช้ใบถอนเงินตามแบบของสหกรณ์ ผู้มีอำนาจถอนเงิน ต้องยื่นใบถอนเงินฝากโดยลงลายมือชื่อตามที่ให้ตัวอย่างไว้นั้นพร้อมกับสมุดคู่ฝากต่อเจ้าหน้าที่สหกรณ์ฯ และเมื่อสหกรณ์ได้ตรวจถูกต้องแล้วจะจ่ายเงินถอนให้ และลงรายการเงินถอนพร้อมทั้งเงินคงเหลือในสมุดคู่ฝาก และคืนสมุดคู่ฝากให้ผู้ฝาก',
      resolution: '1.1 สหกรณ์ควรปฏิบัติตามระเบียบของสหกรณ์เอง\n\n1.2 สหกรณ์พิจารณาแก้ไขระเบียบเงินรับฝากที่ใช้อยู่เพื่อให้สอดคล้องกับวิธีปฏิบัติ',
      followup: '1.สหกรณ์ได้รับเอกสารใบถอนเงินต้นฉบับจากสมาชิกแล้ว\n\n2.สหกรณ์พิจารณาแก้ไขระเบียบเงินรับฝากที่ใช้อยู่เพื่อให้สอดคล้องกับวิธีปฏิบัติการทำธุรกรรมออนไลน์ยิ่งขึ้น'
    }
  ]);

  // Sync general values when coop changes
  useEffect(() => {
    const currentCoop = coopList.find(c => c.id === selectedCoopId) || coopList[0];
    if (currentCoop) {
      setRecipient(`คณะกรรมการดำเนินการ ${currentCoop.orgName}`);
      setSubject(`รายงานผลการตรวจสอบกิจการ ประจำเดือน ${currentCoop.inspectionMonth}`);
      setPeriodText(currentCoop.inspectionMonth);
      setInspectionDatesText(currentCoop.inspectionDatesText);
      const names = currentCoop.inspectors.map(i => i.name).join(', ');
      setInspectorsText(names);
      
      const prefix = currentCoop.id.substring(0, 3).toUpperCase();
      setReportNo(`TK-AUD-${prefix}-05/2569`);
    }
  }, [selectedCoopId]);

  // Formatter helpers
  const fCur = (val: number) => {
    return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fInt = (val: number) => {
    return val.toLocaleString('th-TH');
  };

  const fPct = (val: number) => {
    const sign = val > 0 ? '+' : '';
    const formatted = val.toFixed(2);
    return `${sign}${formatted}%`;
  };

  const handlePrint = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else {
      window.print();
    }
  };

  // Safe dynamic calculations for Loan Stats
  const getLoanDiff = (type: 'emergency' | 'regular' | 'special') => {
    const row = loanStats[type];
    const diffQty = row.mayQty - row.aprQty;
    const pctQty = row.aprQty === 0 ? 0 : (diffQty / row.aprQty) * 100;
    const diffAmt = row.mayAmt - row.aprAmt;
    const pctAmt = row.aprAmt === 0 ? 0 : (diffAmt / row.aprAmt) * 100;
    return { diffQty, pctQty, diffAmt, pctAmt };
  };

  const loanTotals = {
    aprQty: loanStats.emergency.aprQty + loanStats.regular.aprQty + loanStats.special.aprQty,
    mayQty: loanStats.emergency.mayQty + loanStats.regular.mayQty + loanStats.special.mayQty,
    aprAmt: loanStats.emergency.aprAmt + loanStats.regular.aprAmt + loanStats.special.aprAmt,
    mayAmt: loanStats.emergency.mayAmt + loanStats.regular.mayAmt + loanStats.special.mayAmt,
  };

  const loanTotalsDiff = {
    diffQty: loanTotals.mayQty - loanTotals.aprQty,
    pctQty: loanTotals.aprQty === 0 ? 0 : ((loanTotals.mayQty - loanTotals.aprQty) / loanTotals.aprQty) * 100,
    diffAmt: loanTotals.mayAmt - loanTotals.aprAmt,
    pctAmt: loanTotals.aprAmt === 0 ? 0 : ((loanTotals.mayAmt - loanTotals.aprAmt) / loanTotals.aprAmt) * 100,
  };

  // Safe dynamic calculations for Member Deposits Table 3
  const memberDepositsTotal = {
    apr: memberDeposits.reduce((acc, r) => acc + r.aprBal, 0),
    may: memberDeposits.reduce((acc, r) => acc + r.mayBal, 0),
    interest: memberDeposits.reduce((acc, r) => acc + r.interest, 0),
  };

  const otherCoopDepositsTotal = {
    apr: otherCoopDeposits.reduce((acc, r) => acc + r.aprBal, 0),
    may: otherCoopDeposits.reduce((acc, r) => acc + r.mayBal, 0),
    interest: otherCoopDeposits.reduce((acc, r) => acc + r.interest, 0),
  };

  // Promissory Notes & Borrowings Table 4 totals
  const borrowingsTotal = {
    apr: promissoryNotes.reduce((acc, r) => acc + r.aprBal, 0) + otherCoopLoans.reduce((acc, r) => acc + r.aprBal, 0),
    may: promissoryNotes.reduce((acc, r) => acc + r.mayBal, 0) + otherCoopLoans.reduce((acc, r) => acc + r.mayBal, 0),
    interest: promissoryNotes.reduce((acc, r) => acc + r.interest, 0) + otherCoopLoans.reduce((acc, r) => acc + r.interest, 0),
  };

  // Member stats calculations Table 5
  const endRegular = memberStats.regular.beg + memberStats.regular.add - memberStats.regular.dec - memberStats.regular.dead;
  const endAssociate = memberStats.associate.beg + memberStats.associate.add - memberStats.associate.dec - memberStats.associate.dead;
  const totalBeg = memberStats.regular.beg + memberStats.associate.beg;
  const totalAdd = memberStats.regular.add + memberStats.associate.add;
  const totalDec = memberStats.regular.dec + memberStats.associate.dec;
  const totalDead = memberStats.regular.dead + memberStats.associate.dead;
  const totalEnd = endRegular + endAssociate;

  // Reserves Table 7 totals
  const reservesTotal = {
    apr: reserveFunds.reduce((acc, r) => acc + r.aprBal, 0),
    may: reserveFunds.reduce((acc, r) => acc + r.mayBal, 0),
  };

  // Shared Letterhead formatting component
  const Letterhead = () => (
    <div className="mb-5 no-print-padding">
      {/* Official Letterhead */}
      <div className="pb-2 font-thai border-b-2 border-dashed border-black text-left">
        <div className="text-[18pt] font-extrabold tracking-wide text-black leading-tight">
          บริษัททีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
        </div>
        <div className="text-[16pt] font-normal text-black mt-0.5 leading-normal">
          TK Account & Associate CO.,Ltd
        </div>
        <div className="text-[16pt] text-black mt-0.5 leading-normal">
          110/404 ซอยรามคำแหง 188 แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10510
        </div>
        <div className="text-[16pt] text-black leading-normal mt-0.5">
          เลขประจำตัวผู้เสียภาษีอากร 0105556199549 โทร 086- 549-9814 : E-mail- Thatikarn_sr @ hotmail.com
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Top Iframe Warning Banner */}
      {isInIframe && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner no-print font-sans shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-white/20 shrink-0">⚠️</span>
            <span>ระบบตรวจพบว่าคุณกำลังเปิดผ่านหน้าต่างพรีวิว (Iframe) ซึ่งเบราว์เซอร์จะบล็อกการสั่งพิมพ์และดาวน์โหลด PDF เป็นการป้องกันความปลอดภัย</span>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-white text-orange-700 font-bold rounded-lg hover:bg-orange-50 transition-all flex items-center gap-1 shadow shrink-0 text-xs"
          >
            เปิดในแท็บใหม่เพื่อพิมพ์/ดาวน์โหลด ↗
          </a>
        </div>
      )}

      {/* Main Container */}
      <div className="min-h-[calc(100vh-65px)] bg-slate-100 flex flex-col xl:flex-row overflow-hidden w-full print:block print:h-auto print:overflow-visible print:bg-transparent">
        
        {/* LEFT COLUMN: Controls & Narrative Settings */}
        <div className="xl:w-[480px] w-full border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 h-full overflow-y-auto p-5 space-y-6 no-print">
          <div className="space-y-6">
            
            {/* Header Title */}
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <span className="p-2 bg-gradient-to-tr from-indigo-500 to-blue-600 text-white rounded-xl shadow-md">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">สร้างรายงานประจำเดือน</h2>
                <p className="text-[11px] text-slate-400 font-medium">ร่างรายงานการตรวจสอบกิจการอย่างเป็นทางการ</p>
              </div>
            </div>

            {/* Cooperative Target Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">เลือกสหกรณ์เป้าหมาย</label>
              <select
                value={selectedCoopId}
                onChange={(e) => setSelectedCoopId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {coopList.map((c) => (
                  <option key={c.id} value={c.id}>{c.orgName}</option>
                ))}
              </select>
            </div>

            {/* Jump to Preview Page */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">หน้าของพรีวิวรายงาน</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      setActivePreviewPage(page);
                      const el = document.getElementById(`doc-page-${page}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`py-1 rounded text-xs font-bold transition-all ${
                      activePreviewPage === page 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    หน้า {page}
                  </button>
                ))}
              </div>
            </div>

            {/* TABBED CONTROL BAR */}
            <div className="border-b border-slate-100 flex gap-1 overflow-x-auto pb-1 shrink-0">
              {[
                { id: 'general', label: 'ทั่วไป' },
                { id: 'loans', label: 'สินเชื่อ' },
                { id: 'deposits', label: 'เงินฝาก/หนี้สิน' },
                { id: 'capital', label: 'ทุน/สำรอง' },
                { id: 'followup', label: 'ติดตามผล' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSettingsTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap rounded-lg transition-all ${
                    activeSettingsTab === tab.id 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: General info */}
            {activeSettingsTab === 'general' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">เลขที่หนังสือรายงาน</label>
                    <input type="text" value={reportNo} onChange={(e) => setReportNo(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">วันที่ในรายงาน</label>
                    <input type="text" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">เรื่อง</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">เรียน</label>
                  <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">วันที่เข้าตรวจ</label>
                    <input type="text" value={inspectionDatesText} onChange={(e) => setInspectionDatesText(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">ชื่อผู้ตรวจสอบกิจการ</label>
                    <input type="text" value={inspectorsText} onChange={(e) => setInspectorsText(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">สำหรับงวดประจำเดือน</label>
                    <input type="text" value={periodText} onChange={(e) => setPeriodText(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400">ปีที่ประชุมใหญ่</label>
                    <input type="text" value={meetingYearText} onChange={(e) => setMeetingYearText(e.target.value)} className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Loans */}
            {activeSettingsTab === 'loans' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-700 border-b pb-1">จำนวนสัญญากู้และการจ่ายเงินให้กู้ (เม.ย. vs พ.ค.)</h3>
                {Object.keys(loanStats).map((key) => {
                  const k = key as 'emergency' | 'regular' | 'special';
                  const title = k === 'emergency' ? 'เงินกู้ฉุกเฉิน' : k === 'regular' ? 'เงินกู้สามัญ' : 'เงินกู้พิเศษ';
                  return (
                    <div key={k} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                      <span className="text-xs font-bold text-indigo-700">{title}</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-400 font-bold block">สัญญา เม.ย.</label>
                          <input type="number" value={loanStats[k].aprQty} onChange={(e) => setLoanStats({ ...loanStats, [k]: { ...loanStats[k], aprQty: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block">สัญญา พ.ค.</label>
                          <input type="number" value={loanStats[k].mayQty} onChange={(e) => setLoanStats({ ...loanStats, [k]: { ...loanStats[k], mayQty: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block">เงินอนุมัติ เม.ย. (บาท)</label>
                          <input type="number" value={loanStats[k].aprAmt} onChange={(e) => setLoanStats({ ...loanStats, [k]: { ...loanStats[k], aprAmt: parseFloat(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400 font-bold block">เงินอนุมัติ พ.ค. (บาท)</label>
                          <input type="number" value={loanStats[k].mayAmt} onChange={(e) => setLoanStats({ ...loanStats, [k]: { ...loanStats[k], mayAmt: parseFloat(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-xs" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <h3 className="text-xs font-bold text-slate-700 border-b pb-1 mt-4">ข้อมูลสุ่มตรวจสอบสัญญาเงินกู้</h3>
                {Object.keys(loanAudit).map((key) => {
                  const k = key as 'emergency' | 'regular' | 'special';
                  const title = k === 'emergency' ? 'สุ่มตรวจฉุกเฉิน' : k === 'regular' ? 'สุ่มตรวจสามัญ' : 'สุ่มตรวจพิเศษ';
                  return (
                    <div key={k} className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded border border-slate-100 text-[10px]">
                      <span className="col-span-3 font-bold text-indigo-700 text-[11px]">{title}</span>
                      <div>
                        <label className="text-slate-400 block">จำนวนสัญญา</label>
                        <input type="number" value={loanAudit[k].qty} onChange={(e) => setLoanAudit({ ...loanAudit, [k]: { ...loanAudit[k], qty: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-[11px]" />
                      </div>
                      <div>
                        <label className="text-slate-400 block">จำนวนเงิน (บาท)</label>
                        <input type="number" value={loanAudit[k].amt} onChange={(e) => setLoanAudit({ ...loanAudit, [k]: { ...loanAudit[k], amt: parseFloat(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-[11px]" />
                      </div>
                      <div>
                        <label className="text-slate-400 block">% สุ่มตรวจ</label>
                        <input type="number" step="0.01" value={loanAudit[k].pct} onChange={(e) => setLoanAudit({ ...loanAudit, [k]: { ...loanAudit[k], pct: parseFloat(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-[11px]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: Deposits & Liabilities */}
            {activeSettingsTab === 'deposits' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-700 border-b pb-1">เงินรับฝากจากสมาชิก</h3>
                {memberDeposits.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-50 rounded border border-slate-100 space-y-1.5 text-[10px]">
                    <span className="font-bold text-slate-700 text-xs">{item.name}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400">อัตราดอกเบี้ย</label>
                        <input type="text" value={item.rate} onChange={(e) => {
                          const next = [...memberDeposits];
                          next[index].rate = e.target.value;
                          setMemberDeposits(next);
                        }} className="w-full p-1 bg-white border rounded" />
                      </div>
                      <div>
                        <label className="text-slate-400">ดอกเบี้ยจ่ายประจำเดือน</label>
                        <input type="number" value={item.interest} onChange={(e) => {
                          const next = [...memberDeposits];
                          next[index].interest = parseFloat(e.target.value) || 0;
                          setMemberDeposits(next);
                        }} className="w-full p-1 bg-white border rounded" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-semibold text-slate-500">ยอด ณ 30 เม.ย.69</label>
                        <input type="number" value={item.aprBal} onChange={(e) => {
                          const next = [...memberDeposits];
                          next[index].aprBal = parseFloat(e.target.value) || 0;
                          setMemberDeposits(next);
                        }} className="w-full p-1 bg-white border rounded" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-semibold text-slate-500">ยอด ณ 31 พ.ค.69</label>
                        <input type="number" value={item.mayBal} onChange={(e) => {
                          const next = [...memberDeposits];
                          next[index].mayBal = parseFloat(e.target.value) || 0;
                          setMemberDeposits(next);
                        }} className="w-full p-1 bg-white border rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: Capital & Reserves */}
            {activeSettingsTab === 'capital' && (
              <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-700 border-b pb-1">สถิติสมาชิก (เมษายน - พฤษภาคม 2569)</h3>
                {['regular', 'associate'].map((type) => {
                  const t = type as 'regular' | 'associate';
                  const title = t === 'regular' ? 'สมาชิกสามัญ' : 'สมาชิกสมทบ';
                  return (
                    <div key={t} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[10px] space-y-2">
                      <span className="font-bold text-indigo-700 block text-xs">{title}</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div>
                          <label className="text-slate-400">ยกมา</label>
                          <input type="number" value={memberStats[t].beg} onChange={(e) => setMemberStats({ ...memberStats, [t]: { ...memberStats[t], beg: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-center text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400">เข้าใหม่</label>
                          <input type="number" value={memberStats[t].add} onChange={(e) => setMemberStats({ ...memberStats, [t]: { ...memberStats[t], add: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-center text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400">ลาออก</label>
                          <input type="number" value={memberStats[t].dec} onChange={(e) => setMemberStats({ ...memberStats, [t]: { ...memberStats[t], dec: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-center text-xs" />
                        </div>
                        <div>
                          <label className="text-slate-400">พ้นสภาพ</label>
                          <input type="number" value={memberStats[t].dead} onChange={(e) => setMemberStats({ ...memberStats, [t]: { ...memberStats[t], dead: parseInt(e.target.value) || 0 } })} className="w-full p-1 bg-white border rounded text-center text-xs" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <h3 className="text-xs font-bold text-slate-700 border-b pb-1 mt-4">ยอดเงินทุนเรือนหุ้น</h3>
                <div className="p-3 bg-slate-50 rounded border border-slate-100 text-[10px] grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-bold block">ยอด ณ 30 เม.ย.69</label>
                    <input type="number" value={shareCapital.aprBal} onChange={(e) => setShareCapital({ ...shareCapital, aprBal: parseFloat(e.target.value) || 0 })} className="w-full p-1 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold block">ยอด ณ 31 พ.ค.69</label>
                    <input type="number" value={shareCapital.mayBal} onChange={(e) => setShareCapital({ ...shareCapital, mayBal: parseFloat(e.target.value) || 0 })} className="w-full p-1 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Follow Up Rows */}
            {activeSettingsTab === 'followup' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center border-b pb-1">
                  <h3 className="text-xs font-bold text-slate-700">รายการติดตามผลการตรวจสอบ (3.8)</h3>
                </div>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {followUpRows.map((row, index) => (
                    <div key={row.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-2 relative">
                      <div className="font-bold text-indigo-700 border-b pb-1">{row.month} : {row.topic}</div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 block uppercase">สิ่งที่ตรวจพบ</label>
                        <textarea rows={2} value={row.detection} onChange={(e) => {
                          const next = [...followUpRows];
                          next[index].detection = e.target.value;
                          setFollowUpRows(next);
                        }} className="w-full p-1 bg-white text-[11px] border rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 block uppercase">แนวทางแก้ไข</label>
                        <textarea rows={2} value={row.resolution} onChange={(e) => {
                          const next = [...followUpRows];
                          next[index].resolution = e.target.value;
                          setFollowUpRows(next);
                        }} className="w-full p-1 bg-white text-[11px] border rounded" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 block uppercase">ติดตามผล</label>
                        <textarea rows={3} value={row.followup} onChange={(e) => {
                          const next = [...followUpRows];
                          next[index].followup = e.target.value;
                          setFollowUpRows(next);
                        }} className="w-full p-1 bg-white text-[11px] border rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-400 font-mono">TK Account & Associate</span>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              พิมพ์รายงาน 100% (PDF)
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENT PREVIEW CANVAS */}
        <div className="flex-1 h-full overflow-y-auto p-8 flex flex-col items-center gap-8 bg-slate-500/10 select-text print:p-0 print:bg-transparent print:overflow-visible print:block print:h-auto">
          
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-bold shadow no-print">
            <span>แสดงตัวอย่างเอกสารอย่างเป็นทางการ 8 หน้ากระดาษ (จัดรูปเล่มเรียง 100% ตามไฟล์ต้นฉบับ)</span>
          </div>

          {/* Word Mode WYSIWYG Editor Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-md border border-slate-200 w-full max-w-[210mm] no-print shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWordMode(!wordMode)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  wordMode 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10'
                }`}
              >
                <Edit className="w-4 h-4" />
                {wordMode ? '✔️ บันทึก/ปิดโหมดแก้ไข' : '✍️ เปิดโหมดแก้ไขแบบ Word'}
              </button>
              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
              <span className="text-[11px] text-slate-500 font-medium font-thai">
                {wordMode 
                  ? '💡 คลิกจุดใดก็ได้บนเอกสารเพื่อพิมพ์แก้ไข และใช้ปุ่มด้านขวาเพื่อจัดรูปแบบตัวอักษร' 
                  : '👁️ ขณะนี้อยู่ในโหมดพรีวิวปกติ กดปุ่มสีน้ำเงินเพื่อเริ่มแก้ไขพิมพ์ข้อความและจัดรูปแบบตัวอักษรได้อิสระ'}
              </span>
            </div>

            {wordMode && (
              <div className="flex items-center flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => formatDoc('bold')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ตัวหนา (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('italic')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ตัวเอียง (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('underline')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ขีดเส้นใต้ (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                
                <div className="w-px h-5 bg-slate-200 mx-1"></div>

                <button
                  type="button"
                  onClick={() => formatDoc('justifyLeft')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ชิดซ้าย"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('justifyCenter')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="กึ่งกลาง"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('justifyRight')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ชิดขวา"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('justifyFull')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="จัดกระจาย"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1"></div>

                <button
                  type="button"
                  onClick={() => formatDoc('insertUnorderedList')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="รายการจุดสัญลักษณ์"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('insertOrderedList')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="รายการตัวเลข"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1"></div>

                <button
                  type="button"
                  onClick={() => formatDoc('undo')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="เลิกทำ (Undo)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => formatDoc('redo')}
                  className="p-1.5 hover:bg-slate-200 hover:text-slate-900 text-slate-600 rounded-lg transition-all"
                  title="ทำซ้ำ (Redo)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-8 w-[210mm] print:gap-0 select-text">
            
            {/* ============================== PAGE 1 ============================== */}
            <div id="doc-page-1" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <div className="text-center font-extrabold text-[18pt] tracking-wide mt-2">รายงานการตรวจสอบกิจการ</div>
                  <div className="text-center font-extrabold text-[18pt] tracking-wide">สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด</div>
                  <div className="text-center font-extrabold text-[18pt] tracking-wide">ประจำเดือน {periodText}</div>
                  
                  <div className="text-right font-normal text-[16pt] mt-4">{reportDate}</div>
                  <div className="text-left font-bold text-[16pt] mt-2">เรียน &nbsp;&nbsp;คณะกรรมการดำเนินการ</div>
                  
                  <p className="text-[16pt] text-justify leading-relaxed indent-12 mt-3">
                    ตามที่สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด ประชุมใหญ่สามัญประจำปี {meetingYearText} เมื่อวันที่ <span className="font-extrabold">{meetingDateText}</span> ได้เลือกบริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด โดยนางสาวเฉลิมรัตน์ ใจดี เป็นผู้ตรวจสอบกิจการสำหรับปีทางบัญชีสิ้นสุดวันที่ {fiscalYearText} บริษัทได้เข้าตรวจสอบกิจการ เดือน{periodText} ในวันที่ <span className="font-extrabold">{inspectionDatesText}</span> จึงขอเสนอผลการตรวจสอบโดยสรุป ดังนี้
                  </p>

                  <div className="mt-4">
                    <div className="font-extrabold text-[16pt] border-b pb-0.5 inline-block">1.วัตถุประสงค์ของการตรวจสอบ</div>
                    <div className="mt-1.5 space-y-1 text-[16pt] text-justify">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">1.1</span>
                        <span>เพื่อให้ทราบว่าการบริหารงานของคณะกรรมการดำเนินการเป็นไปตามข้อบังคับและระเบียบของสหกรณ์ฯ ที่กำหนดไว้</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">1.2</span>
                        <span>เพื่อให้ทราบว่าการปฏิบัติงานเกี่ยวกับการเงิน การบัญชี และการบริหารสินทรัพย์เป็นไปตามข้อบังคับและระเบียบของสหกรณ์ฯ ที่กำหนดไว้</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">1.3</span>
                        <span>เพื่อให้ทราบว่าการดำเนินงานของสหกรณ์ฯ เป็นไปอย่างเหมาะสม มีประสิทธิภาพและบรรลุเป้าหมายที่กำหนดไว้ ซึ่งบังเกิดผลดีต่อการดำเนินงานของสหกรณ์ฯ</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-extrabold text-[16pt] border-b pb-0.5 inline-block">2.ขอบเขตการตรวจสอบ</div>
                    <div className="mt-1.5 text-[16pt] text-justify leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">2.1</span>
                        <span>ตรวจสอบการดำเนินงานทั้งปวงของสหกรณ์ ทั้งด้านการปฏิบัติเกี่ยวกับการเงิน การบัญชีและด้านปฏิบัติการในการดำเนินธุรกิจตามที่กำหนดไว้ในข้อบังคับของสหกรณ์ รวมถึงการประเมินผลการควบคุมภายใน การรักษาความปลอดภัยของข้อมูลสารสนเทศของสหกรณ์ และการตรวจสอบในเรื่องต่าง ๆ ดังนี้</span>
                      </div>
                      <div className="pl-6 space-y-1 mt-1 text-[15pt]">
                        <div className="flex items-start gap-1">
                          <span className="font-bold shrink-0">2.1.1</span>
                          <span>ตรวจสอบความถูกต้องของการบันทึกบัญชีเพื่อให้เป็นไปตามแบบและรายการที่นายทะเบียนสหกรณ์กำหนด</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold shrink-0">2.1.2</span>
                          <span>ติดตาม ประเมินความมีประสิทธิภาพและประสิทธิผลการดำเนินงานของคณะกรรมการดำเนินการสหกรณ์เพื่อให้ข้อสังเกต และข้อเสนอแนะในการปรับปรุงการบริหารงานของคณะกรรมการดำเนินการสหกรณ์ให้เป็นไปตามกฎหมาย ข้อบังคับ และระเบียบของสหกรณ์</span>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="font-bold shrink-0">2.1.3</span>
                          <span>สอบทานระบบการปฏิบัติงาน of สหกรณ์ เพื่อให้เป็นตามกฎหมาย ระเบียบนายทะเบียนสหกรณ์ ข้อบังคับ และระเบียบของสหกรณ์ รวมถึงคำสั่งของส่วนราชการที่กำกับดูแลกำหนดให้ต้องปฏิบัติ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 1 จาก 8</div>
            </div>

            {/* ============================== PAGE 2 ============================== */}
            <div id="doc-page-2" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <div className="text-[16pt] text-justify leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0">2.1.4</span>
                      <span>ตรวจสอบและสอบทานระบบการควบคุม ดูแลรักษาทรัพย์สินของสหกรณ์ วิเคราะห์ และประเมินผลความมีประสิทธิภาพในการใช้ทรัพย์สินของสหกรณ์ เพื่อให้การใช้ทรัพย์สินเป็นไปอย่างเหมาะสมและคุ้มค่า</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="font-extrabold text-[16pt] border-b pb-0.5 inline-block">3.ผลการตรวจสอบและข้อเสนอแนะที่ควรแก้ไข</div>
                    
                    <div className="mt-2 space-y-3 text-[16pt]">
                      <div>
                        <div className="font-extrabold text-[16.5pt] text-slate-900">3.1 ด้านการเงินและการบัญชี</div>
                        <p className="indent-12 text-justify mt-1 text-[15pt] leading-relaxed">
                          <span className="font-bold">3.1.1</span> ตรวจสอบการจ่ายเงินตามสลิปรับ-จ่าย การเก็บรักษาเงินสดประจำวัน พบว่า สหกรณ์ได้เก็บรักษาเงินสดเป็นไปตามระเบียบว่าด้วยการรับจ่ายและเก็บและรักษาเงิน พ.ศ.2567 สหกรณ์ฯ เก็บรักษาเงินสดไว้ไม่เกินวงเงิน โดยสหกรณ์ฯ เก็บรักษาเงินสดไม่เกินวันละ 20,000.00 บาท (สองหมื่นบาทถ้วน) การบันทึกบัญชีถูกต้องตามที่ควรและเป็นปัจจุบัน
                        </p>
                        <p className="indent-12 text-justify mt-2 text-[15pt] leading-relaxed">
                          <span className="font-bold">3.1.2</span> สุ่มตรวจสอบบัญชีเงินฝากธนาคารเปรียบเทียบกับบัญชีแยกประเภทยอด คงเหลือตรงกัน การบันทึกบัญชีเป็นปัจจุบันและครบถ้วนตามที่ควร กรณียอดคงเหลือตามบัญชีไม่ตรงกับยอดธนาคาร สหกรณ์มีงบกระทบยอดเงินฝากธนาคารแนบ การบันทึกบัญชีถูกต้องและเป็นปัจจุบัน
                        </p>
                      </div>

                      <div>
                        <div className="font-extrabold text-[16.5pt] text-slate-900">3.2 ด้านสินเชื่อ</div>
                        <p className="text-[15.5pt] mt-0.5">การดำเนินการเกี่ยวกับเงินให้กู้เดือน{periodText} จ่ายเงินกู้ให้แก่สมาชิก ดังนี้</p>
                        
                        {/* Table 1: Loan Approved Stats */}
                        <table className="w-full border-collapse border border-black mt-2 text-[12pt] font-sans">
                          <thead>
                            <tr className="bg-slate-50 font-bold text-center">
                              <th rowSpan={3} className="border border-black py-1 px-1 font-thai font-bold">รายการ</th>
                              <th colSpan={4} className="border border-black py-0.5 px-1 font-thai font-bold">จำนวนสัญญาอนุมัติจ่าย</th>
                              <th colSpan={4} className="border border-black py-0.5 px-1 font-thai font-bold">จำนวนเงินอนุมัติจ่าย</th>
                            </tr>
                            <tr className="bg-slate-50 text-center text-[10.5pt]">
                              <th colSpan={2} className="border border-black py-0.5 px-1 font-thai">สัญญา</th>
                              <th colSpan={2} className="border border-black py-0.5 px-1 font-thai">เพิ่มขึ้น(ลดลง)</th>
                              <th colSpan={2} className="border border-black py-0.5 px-1 font-thai">หน่วย:บาท</th>
                              <th colSpan={2} className="border border-black py-0.5 px-1 font-thai">เพิ่มขึ้น(ลดลง)</th>
                            </tr>
                            <tr className="bg-slate-50 text-center text-[10pt] font-mono">
                              <th className="border border-black py-0.5 px-0.5">เมษายน</th>
                              <th className="border border-black py-0.5 px-0.5">พฤษภาคม</th>
                              <th className="border border-black py-0.5 px-0.5">สัญญา</th>
                              <th className="border border-black py-0.5 px-0.5">%</th>
                              <th className="border border-black py-0.5 px-0.5">เมษายน</th>
                              <th className="border border-black py-0.5 px-0.5">พฤษภาคม</th>
                              <th className="border border-black py-0.5 px-0.5">บาท</th>
                              <th className="border border-black py-0.5 px-0.5">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['emergency', 'regular', 'special'].map((key) => {
                              const k = key as 'emergency' | 'regular' | 'special';
                              const title = k === 'emergency' ? 'ฉุกเฉิน' : k === 'regular' ? 'สามัญ' : 'พิเศษ';
                              const d = getLoanDiff(k);
                              return (
                                <tr key={k} className="text-right text-[10.5pt] font-mono">
                                  <td className="border border-black py-0.5 px-1 text-left font-thai">{title}</td>
                                  <td className="border border-black py-0.5 px-1">{fInt(loanStats[k].aprQty)}</td>
                                  <td className="border border-black py-0.5 px-1">{fInt(loanStats[k].mayQty)}</td>
                                  <td className="border border-black py-0.5 px-1">{d.diffQty >= 0 ? fInt(d.diffQty) : `(${fInt(Math.abs(d.diffQty))})`}</td>
                                  <td className="border border-black py-0.5 px-1">{fPct(d.pctQty)}</td>
                                  <td className="border border-black py-0.5 px-1">{fCur(loanStats[k].aprAmt)}</td>
                                  <td className="border border-black py-0.5 px-1">{fCur(loanStats[k].mayAmt)}</td>
                                  <td className="border border-black py-0.5 px-1">{d.diffAmt >= 0 ? fCur(d.diffAmt) : `(${fCur(Math.abs(d.diffAmt))})`}</td>
                                  <td className="border border-black py-0.5 px-1">{fPct(d.pctAmt)}</td>
                                </tr>
                              );
                            })}
                            <tr className="text-right font-bold bg-slate-100 text-[10.5pt] font-mono">
                              <td className="border border-black py-0.5 px-1 text-left font-thai">รวม</td>
                              <td className="border border-black py-0.5 px-1">{fInt(loanTotals.aprQty)}</td>
                              <td className="border border-black py-0.5 px-1">{fInt(loanTotals.mayQty)}</td>
                              <td className="border border-black py-0.5 px-1">{loanTotalsDiff.diffQty >= 0 ? fInt(loanTotalsDiff.diffQty) : `(${fInt(Math.abs(loanTotalsDiff.diffQty))})`}</td>
                              <td className="border border-black py-0.5 px-1">{fPct(loanTotalsDiff.pctQty)}</td>
                              <td className="border border-black py-0.5 px-1">{fCur(loanTotals.aprAmt)}</td>
                              <td className="border border-black py-0.5 px-1">{fCur(loanTotals.mayAmt)}</td>
                              <td className="border border-black py-0.5 px-1">{loanTotalsDiff.diffAmt >= 0 ? fCur(loanTotalsDiff.diffAmt) : `(${fCur(Math.abs(loanTotalsDiff.diffAmt))})`}</td>
                              <td className="border border-black py-0.5 px-1">{fPct(loanTotalsDiff.pctAmt)}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="font-extrabold text-[15.5pt] mt-3">สุ่มตรวจสัญญาเงินกู้เดือน{periodText}</div>
                        
                        {/* Table 2: Audit Stats */}
                        <table className="w-full border-collapse border border-black text-[11.5pt] font-thai mt-1">
                          <tbody>
                            {['emergency', 'regular', 'special'].map((key) => {
                              const k = key as 'emergency' | 'regular' | 'special';
                              const title = k === 'emergency' ? 'ฉุกเฉิน' : k === 'regular' ? 'สามัญ' : 'พิเศษ';
                              return (
                                <tr key={k} className="border-b border-black">
                                  <td className="border-r border-black py-0.5 px-3 font-bold w-24">{title}</td>
                                  <td className="border-r border-black py-0.5 px-3 w-32">{fInt(loanAudit[k].qty)} สัญญา</td>
                                  <td className="border-r border-black py-0.5 px-3 w-20 text-center">จำนวน</td>
                                  <td className="border-r border-black py-0.5 px-3 text-right font-mono w-44">{fCur(loanAudit[k].amt)} บาท</td>
                                  <td className="py-0.5 px-3 text-right">สุ่มตรวจ {loanAudit[k].pct.toFixed(2)} %</td>
                                </tr>
                              );
                            })}
                            <tr className="font-bold bg-slate-100">
                              <td colSpan={3} className="border-r border-black py-0.5 px-3 text-right font-bold">รวม</td>
                              <td className="border-r border-black py-0.5 px-3 text-right font-mono">{fCur(loanAudit.emergency.amt + loanAudit.regular.amt + loanAudit.special.amt)} บาท</td>
                              <td className="py-0.5 px-3 text-right">เฉลี่ย 83.85 %</td>
                            </tr>
                          </tbody>
                        </table>

                        <p className="text-[14.5pt] leading-relaxed mt-2 text-justify indent-8">
                          สุ่มตรวจสอบเอกสารหลักฐานประกอบการให้กู้เงิน การชำระหนี้ การบันทึกบัญชีด้านสินเชื่อ การพิสูจน์ยอดลูกหนี้คงเหลือ การคำนวณดอกเบี้ยรับ และความครบถ้วนสมบูรณ์ของคำขอกู้ หนังสือสัญญาเงินกู้ และหนังสือค้ำประกัน พร้อมทั้งการลงลายมือชื่อของผู้มีอำนาจลงนาม สมาชิกผู้กู้และผู้ค้ำประกันรวมทั้ง คู่สมรส ครบถ้วนตามควร การบันทึกบัญชีลูกหนี้เงินให้กู้ยืมและบัญชีดอกเบี้ยรับ ถูกต้องตามที่ควร
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 2 จาก 8</div>
            </div>

            {/* ============================== PAGE 3 ============================== */}
            <div id="doc-page-3" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <div className="font-extrabold text-[16.5pt] text-slate-900">3.3 ด้านเงินรับฝาก</div>
                  <p className="indent-12 text-justify text-[14.5pt] leading-relaxed mt-1">
                    สุ่มตรวจสอบการบันทึกบัญชี การรับฝากเงินออมทรัพย์เงินฝากสหกรณ์อื่น ตรวจสอบการรับเงิน-ถอนเงิน รวมทั้งการเปิด - ถอนปิดบัญชีเงินฝาก การลงลายมือชื่อการฝากเงิน – ถอนเงิน การคำนวณดอกเบี้ยเงินรับฝาก รวมถึงการบันทึกบัญชีไปยังสมุดรายวันต่างๆที่เกี่ยวข้องถูกต้องตามที่ควร
                  </p>
                  <p className="text-[14.5pt] font-bold mt-2">รายการเคลื่อนไหวเงินรับฝาก และยอดเงินรับฝากคงเหลือ ณ วันที่ 31 {periodText} มีดังนี้</p>

                  {/* Table 3: Member Deposits */}
                  <table className="w-full border-collapse border border-black mt-2 text-[11.5pt] font-thai">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-center">
                        <th className="border border-black py-0.5 px-2 text-left">ประเภท</th>
                        <th className="border border-black py-0.5 px-2 w-20">อัตรา<br/>ดอกเบี้ย</th>
                        <th className="border border-black py-0.5 px-2 w-36">ยอดคงเหลือ<br/>ณ 30 เม.ย.69</th>
                        <th className="border border-black py-0.5 px-2 w-36">ยอดคงเหลือ<br/>ณ 31 พ.ค.69</th>
                        <th className="border border-black py-0.5 px-2 w-32">ดอกเบี้ยจ่าย<br/>ประจำเดือน</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-black py-0.5 px-2">เงินรับฝากจากสมาชิก</td>
                      </tr>
                      {memberDeposits.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-black py-0.5 px-4">{item.name}</td>
                          <td className="border border-black py-0.5 px-1 text-center font-mono">{item.rate}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.aprBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.mayBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.interest)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-right bg-slate-50">
                        <td colSpan={2} className="border border-black py-0.5 px-2 text-center">รวม</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(memberDepositsTotal.apr)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(memberDepositsTotal.may)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(memberDepositsTotal.interest)}</td>
                      </tr>

                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-black py-0.5 px-2">เงินรับฝากจากสหกรณ์อื่น</td>
                      </tr>
                      <tr className="italic font-semibold bg-slate-50/50">
                        <td colSpan={5} className="border border-black py-0.5 px-4 text-indigo-900">ออมทรัพย์พิเศษ</td>
                      </tr>
                      {otherCoopDeposits.map((item, i) => (
                        <tr key={i} className="text-[10.5pt]">
                          <td className="border border-black py-0.5 px-6">{item.name}</td>
                          <td className="border border-black py-0.5 px-1 text-center font-mono">{item.rate}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.aprBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.mayBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.interest)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-right bg-slate-100">
                        <td colSpan={2} className="border border-black py-0.5 px-2 text-center">รวม</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(otherCoopDepositsTotal.apr)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(otherCoopDepositsTotal.may)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(otherCoopDepositsTotal.interest)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="font-extrabold text-[16.5pt] text-slate-900 mt-4">3.4 ด้านหนี้สิน</div>
                  <p className="text-[14.5pt] font-bold mt-1">รายการเคลื่อนไหวเงินกู้ยืมสหกรณ์อื่น และตั๋วสัญญาใช้เงินเดือน{periodText} มีดังนี้</p>

                  {/* Table 4: Borrowing Movements */}
                  <table className="w-full border-collapse border border-black mt-2 text-[11.5pt] font-thai">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-center">
                        <th className="border border-black py-0.5 px-2 text-left">ประเภท</th>
                        <th className="border border-black py-0.5 px-2 w-20">อัตรา<br/>ดอกเบี้ย</th>
                        <th className="border border-black py-0.5 px-2 w-36">ยอดคงเหลือ<br/>ณ 30 เม.ย.69</th>
                        <th className="border border-black py-0.5 px-2 w-36">ยอดคงเหลือ<br/>ณ 31 พ.ค.69</th>
                        <th className="border border-black py-0.5 px-2 w-32">ดอกเบี้ยจ่าย<br/>ประจำเดือน</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-black py-0.5 px-2">ตั๋วสัญญาใช้เงิน</td>
                      </tr>
                      {promissoryNotes.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-black py-0.5 px-4">{item.name}</td>
                          <td className="border border-black py-0.5 px-1 text-center font-mono">{item.rate}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.aprBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.mayBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.interest)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={5} className="border border-black py-0.5 px-2">เงินกู้ยืมสหกรณ์อื่น</td>
                      </tr>
                      {otherCoopLoans.map((item, i) => (
                        <tr key={i} className="text-[10.5pt]">
                          <td className="border border-black py-0.5 px-4">{item.name}</td>
                          <td className="border border-black py-0.5 px-1 text-center font-mono">{item.rate}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.aprBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.mayBal)}</td>
                          <td className="border border-black py-0.5 px-2 text-right font-mono">{fCur(item.interest)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-right bg-slate-100">
                        <td colSpan={2} className="border border-black py-0.5 px-2 text-center">รวม</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(borrowingsTotal.apr)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(borrowingsTotal.may)}</td>
                        <td className="border border-black py-0.5 px-2 font-mono">{fCur(borrowingsTotal.interest)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 3 จาก 8</div>
            </div>

            {/* ============================== PAGE 4 ============================== */}
            <div id="doc-page-4" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <p className="text-[15.5pt] text-justify leading-relaxed text-slate-850">
                    สุ่มตรวจสอบการกู้เงินของสหกรณ์ การออกตั๋วสัญญาใช้เงินกับธนาคารพาณิชย์และเงินกู้สหกรณ์อื่น เพื่อนำเงินกู้มาบริหารกิจการสหกรณ์และการให้เงินกู้แก่สมาชิกตามวัตถุประสงค์ของสหกรณ์ วงเงินกู้ยืมและค้ำประกันประจำปีตามที่นายทะเบียนให้ความเห็นชอบ ที่ อย0010/6440 ลว.28 พฤศจิกายน 2568 เป็นจำนวนเงิน 2,169,047,653.06 บาท คงเหลือวงเงิน 876,047,853.06 บาท
                  </p>
                  <p className="text-[15.5pt] text-justify leading-relaxed mt-2 text-slate-850">
                    จากการตรวจสอบเอกสารการกู้ยืม สัญญาเงินกู้ เอกสารสัญญาครบถ้วนสมบูรณ์ ตรวจสอบการชำระเงินกู้พร้อมดอกเบี้ยของเงินกู้มีหลักฐานให้ตรวจสอบถูกต้องตามที่ควร การบันทึกบัญชีรายการดังกล่าวถูกต้องตามที่ควร
                  </p>

                  <div className="font-extrabold text-[16.5pt] text-slate-900 mt-4">3.5 ด้านทุนเรือนหุ้น</div>
                  <p className="indent-12 text-justify text-[15pt] leading-relaxed mt-1">
                    การรับเงินค่าหุ้นจากสมาชิก การจ่ายคืนทุนเรือนหุ้น และสมาชิกเข้าใหม่-ลาออก มีการอนุมัติโดยคณะกรรมการ การบันทึกบัญชีดังกล่าวถูกต้องตามที่ควร
                  </p>
                  <p className="text-[15pt] font-bold mt-2">การตรวจสอบรายละเอียดจำนวนสมาชิกเดือน{periodText} มีรายละเอียดดังนี้</p>

                  {/* Table 5: Member Statistics */}
                  <table className="w-full border-collapse border border-black text-center mt-2 text-[12pt] font-thai">
                    <thead>
                      <tr className="bg-slate-50 font-bold">
                        <th className="border border-black py-1 px-2 text-left">ประเภทสมาชิก</th>
                        <th className="border border-black py-1 px-2 w-28">ยอดยกมา</th>
                        <th className="border border-black py-1 px-2 w-28">เข้าใหม่</th>
                        <th className="border border-black py-1 px-2 w-28">ลาออก</th>
                        <th className="border border-black py-1 px-2 w-36">ถึงแก่กรรม / พ้นสภาพ</th>
                        <th className="border border-black py-1 px-2 w-28">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black py-1 px-4 text-left font-bold">สามัญ</td>
                        <td className="border border-black py-1 font-mono">{fInt(memberStats.regular.beg)}</td>
                        <td className="border border-black py-1 font-mono text-emerald-700 font-bold">+{fInt(memberStats.regular.add)}</td>
                        <td className="border border-black py-1 font-mono text-slate-400">-</td>
                        <td className="border border-black py-1 font-mono text-rose-600">-{fInt(memberStats.regular.dead)}</td>
                        <td className="border border-black py-1 font-mono font-bold bg-slate-50">{fInt(endRegular)}</td>
                      </tr>
                      <tr>
                        <td className="border border-black py-1 px-4 text-left font-bold">สมทบ</td>
                        <td className="border border-black py-1 font-mono">{fInt(memberStats.associate.beg)}</td>
                        <td className="border border-black py-1 font-mono text-emerald-700 font-bold">+{fInt(memberStats.associate.add)}</td>
                        <td className="border border-black py-1 font-mono text-rose-600">-{fInt(memberStats.associate.dec)}</td>
                        <td className="border border-black py-1 font-mono text-slate-400">-</td>
                        <td className="border border-black py-1 font-mono font-bold bg-slate-50">{fInt(endAssociate)}</td>
                      </tr>
                      <tr className="font-bold bg-slate-100 text-[12.5pt]">
                        <td className="border border-black py-1 px-2 text-center">รวมสมาชิกทั้งสิ้น</td>
                        <td className="border border-black py-1 font-mono">{fInt(totalBeg)}</td>
                        <td className="border border-black py-1 font-mono text-emerald-800">+{fInt(totalAdd)}</td>
                        <td className="border border-black py-1 font-mono text-rose-800">-{fInt(totalDec)}</td>
                        <td className="border border-black py-1 font-mono text-rose-800">-{fInt(totalDead)}</td>
                        <td className="border border-black py-1 font-mono text-indigo-900 font-extrabold">{fInt(totalEnd)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-3 text-[15pt] bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/50">
                    <span className="font-extrabold text-amber-900">สหกรณ์มีรายได้ค่าธรรมเนียมแรกเข้าดังนี้</span>
                    <p className="mt-1 font-semibold pl-4 text-slate-800">
                      สมาชิกสามัญ คนละ 100.00 บาท X {totalAdd} คน เป็นเงิน {fCur(totalAdd * 100)} บาท
                    </p>
                  </div>

                  <p className="text-[15pt] font-bold mt-4">ในเดือน{periodText} ทุนเรือนหุ้นมียอดเคลื่อนไหวและยอดคงเหลือ ดังนี้</p>

                  {/* Table 6: Share Capital Movements */}
                  <table className="w-full border-collapse border border-black mt-2 text-center text-[12.5pt] font-thai">
                    <thead>
                      <tr className="bg-slate-50 font-bold">
                        <th className="border border-black py-1 px-2">ยอดคงเหลือ ณ 30 เม.ย.69</th>
                        <th className="border border-black py-1 px-2">ยอดคงเหลือ ณ 31 พ.ค.69</th>
                        <th className="border border-black py-1 px-2">เพิ่มขึ้น / (ลดลง)</th>
                        <th className="border border-black py-1 px-2">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-mono">
                        <td className="border border-black py-1.5">{fCur(shareCapital.aprBal)}</td>
                        <td className="border border-black py-1.5 font-bold text-slate-900">{fCur(shareCapital.mayBal)}</td>
                        <td className="border border-black py-1.5 text-emerald-700 font-bold">+{fCur(shareCapital.mayBal - shareCapital.aprBal)}</td>
                        <td className="border border-black py-1.5 text-emerald-700 font-bold">{fPct(((shareCapital.mayBal - shareCapital.aprBal) / shareCapital.aprBal) * 100)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="font-extrabold text-[16.5pt] text-slate-900 mt-4">3.6 ด้านทุนสำรองและทุนสะสมฯ</div>
                  <p className="indent-12 text-justify text-[15pt] leading-relaxed mt-1 text-slate-800">
                    สุ่มตรวจสอบการใช้ทุนสะสมตามข้อบังคับ ระเบียบและอื่น ๆ การจ่ายเงินดังกล่าวเป็นไปตามวัตถุประสงค์และเป็นไปตามระเบียบแห่งทุนนั้น ๆ ตามที่สหกรณ์กำหนด การบันทึกบัญชีถูกต้องตามที่ควร
                  </p>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 4 จาก 8</div>
            </div>

            {/* ============================== PAGE 5 ============================== */}
            <div id="doc-page-5" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <p className="text-[15pt] font-bold mt-1">ในเดือน{periodText} มีรายการใช้ไปทุนสะสมและยอดคงเหลือ ดังนี้</p>

                  {/* Table 7: Reserves List */}
                  <table className="w-full border-collapse border border-black mt-2 text-[11pt] font-thai">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-center">
                        <th className="border border-black py-1 px-2 text-left">รายการ</th>
                        <th className="border border-black py-1 px-2 w-36">ยอดคงเหลือ<br/>ณ 30 เม.ย.69</th>
                        <th className="border border-black py-1 px-2 w-36">ยอดคงเหลือ<br/>ณ 31 พ.ค.69</th>
                        <th className="border border-black py-1 px-2 w-32">เพิ่มขึ้น /<br/>(ลดลง)</th>
                        <th className="border border-black py-1 px-2 w-20">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reserveFunds.map((item, i) => {
                        const diff = item.mayBal - item.aprBal;
                        const pct = item.aprBal === 0 ? 0 : (diff / item.aprBal) * 100;
                        return (
                          <tr key={i} className="text-slate-800">
                            <td className="border border-black py-1 px-3 text-left font-bold">{item.name}</td>
                            <td className="border border-black py-1 px-2 text-right font-mono">{fCur(item.aprBal)}</td>
                            <td className="border border-black py-1 px-2 text-right font-mono font-semibold">{fCur(item.mayBal)}</td>
                            <td className={`border border-black py-1 px-2 text-right font-mono ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-700 font-bold' : ''}`}>
                              {diff === 0 ? '0.00' : diff > 0 ? `+${fCur(diff)}` : `(${fCur(Math.abs(diff))})`}
                            </td>
                            <td className={`border border-black py-1 px-2 text-center font-mono ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-700 font-bold' : ''}`}>
                              {pct === 0 ? '0.00' : fPct(pct)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-extrabold text-right bg-slate-100 text-[11.5pt]">
                        <td className="border border-black py-1 px-3 text-left font-extrabold">รวม</td>
                        <td className="border border-black py-1 px-2 font-mono">{fCur(reservesTotal.apr)}</td>
                        <td className="border border-black py-1 px-2 font-mono">{fCur(reservesTotal.may)}</td>
                        <td className="border border-black py-1 px-2 font-mono text-rose-600">
                          {`(${fCur(Math.abs(reservesTotal.may - reservesTotal.apr))})`}
                        </td>
                        <td className="border border-black py-1 px-2 text-center font-mono text-rose-600">
                          {fPct(((reservesTotal.may - reservesTotal.apr) / reservesTotal.apr) * 100)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="font-extrabold text-[16pt] text-slate-900 mt-4">3.7 ด้านค่าใช้จ่าย</div>
                  <p className="indent-12 text-justify text-[15pt] leading-relaxed mt-1 text-slate-800">
                    สุ่มตรวจรายจ่ายต่างๆของสหกรณ์ฯ ได้จ่ายไปในกิจการของสหกรณ์ควรแก่เหตุผลและประมาณการเป็นไปตามระเบียบการจ่ายที่เกี่ยวข้องและมติที่ประชุม การบันทึกบัญชีครบถ้วนและเป็นปัจจุบัน
                  </p>

                  <div className="font-extrabold text-[16pt] text-slate-900 mt-3">3.8 รายงานติดตามผลการตรวจสอบ</div>
                  <p className="indent-12 text-justify text-[15pt] leading-relaxed mt-1 text-slate-800 font-semibold">
                    ตามเอกสารแนบ
                  </p>

                  <div className="text-center font-bold text-[16pt] mt-6 text-slate-900">จึงเรียนมาเพื่อโปรดทราบ</div>
                </div>
              </div>

              {/* Signoff block */}
              <div className="flex justify-end font-thai text-[16pt] mt-2 select-text no-print-signoff">
                <div className="text-center w-80 space-y-5">
                  <div className="font-medium">ขอแสดงความนับถือ</div>
                  <div className="pt-2">
                    <div>........................................................</div>
                    <div className="mt-1 font-bold">({inspectorsText})</div>
                    <div className="text-slate-500 text-[15pt] mt-0.5">ผู้ตรวจสอบกิจการ</div>
                    <div className="text-slate-400 text-[13.5pt] leading-tight">บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด</div>
                  </div>
                </div>
              </div>

              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 5 จาก 8</div>
            </div>

            {/* ============================== PAGE 6 ============================== */}
            <div id="doc-page-6" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div className="text-center font-extrabold text-[16pt] text-indigo-950 mb-2">ตารางติดตามผลการตรวจสอบกิจการ ข้อ 3.8</div>
                
                <table className="w-full border-collapse border border-black text-[11.5pt] font-thai">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black py-1 px-1 w-24">ตรวจพบเดือน</th>
                      <th className="border border-black py-1 px-2 w-44">สิ่งที่ตรวจพบ</th>
                      <th className="border border-black py-1 px-2 w-36">ผลกระทบที่สำคัญ</th>
                      <th className="border border-black py-1 px-2 w-36">แนวทางแก้ไขและข้อเสนอแนะ</th>
                      <th className="border border-black py-1 px-2">ติดตามผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUpRows.filter(r => r.id === 'oct-2568').map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="border border-black p-1.5 text-center font-bold bg-slate-50/50">{row.month}</td>
                        <td className="border border-black p-1.5 text-justify text-[10.5pt] leading-normal font-semibold text-slate-900">{row.topic}<p className="mt-1 text-[9.5pt] font-normal leading-tight text-slate-600">{row.detection}</p></td>
                        <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-700 whitespace-pre-line">{row.impact}</td>
                        <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-700 whitespace-pre-line">{row.resolution}</td>
                        <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-800 whitespace-pre-line bg-slate-50/20">{row.followup}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 6 จาก 8</div>
            </div>

            {/* ============================== PAGE 7 ============================== */}
            <div id="doc-page-7" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <div className="text-center font-extrabold text-[16pt] text-indigo-950 mb-2">ตารางติดตามผลการตรวจสอบกิจการ ข้อ 3.8</div>
                  
                  <table className="w-full border-collapse border border-black text-[11.5pt] font-thai">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black py-1 px-1 w-24">ตรวจพบเดือน</th>
                        <th className="border border-black py-1 px-2 w-44">สิ่งที่ตรวจพบ</th>
                        <th className="border border-black py-1 px-2 w-36">ผลกระทบที่สำคัญ</th>
                        <th className="border border-black py-1 px-2 w-36">แนวทางแก้ไขและข้อเสนอแนะ</th>
                        <th className="border border-black py-1 px-2">ติดตามผล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpRows.filter(r => r.id === 'jan-2569-1').map((row) => (
                        <tr key={row.id} className="align-top">
                          <td className="border border-black p-1.5 text-center font-bold bg-slate-50/50">{row.month}</td>
                          <td className="border border-black p-1.5 text-justify text-[10.5pt] leading-normal font-semibold text-slate-900">{row.topic}<p className="mt-1 text-[9.5pt] font-normal leading-tight text-slate-600">{row.detection}</p></td>
                          <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-700 whitespace-pre-line">{row.impact}</td>
                          <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-700 whitespace-pre-line">{row.resolution}</td>
                          <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-normal text-slate-800 whitespace-pre-line bg-slate-50/20">{row.followup}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 7 จาก 8</div>
            </div>

            {/* ============================== PAGE 8 ============================== */}
            <div id="doc-page-8" className="print-page w-[210mm] h-[297mm] p-[20mm_18mm_20mm_18mm] bg-white border border-slate-200 shadow-lg relative text-black font-thai text-[16pt] leading-relaxed flex flex-col justify-between overflow-hidden shrink-0">
              <div>
                <Letterhead />
                <div 
                  contentEditable={wordMode} 
                  suppressContentEditableWarning={true} 
                  className={`outline-none transition-all ${wordMode ? 'border-2 border-dashed border-blue-400 p-2 rounded bg-blue-50/5' : ''}`}
                >
                  <div className="text-center font-extrabold text-[16pt] text-indigo-950 mb-2">ตารางติดตามผลการตรวจสอบกิจการ ข้อ 3.8</div>
                  
                  <table className="w-full border-collapse border border-black text-[10.5pt] font-thai leading-snug">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center text-[11pt]">
                        <th className="border border-black py-1 px-1 w-24">ตรวจพบเดือน</th>
                        <th className="border border-black py-1 px-2 w-44">สิ่งที่ตรวจพบ</th>
                        <th className="border border-black py-1 px-2 w-36">ผลกระทบที่สำคัญ</th>
                        <th className="border border-black py-1 px-2 w-36">แนวทางแก้ไขและข้อเสนอแนะ</th>
                        <th className="border border-black py-1 px-2">ติดตามผล</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpRows.filter(r => r.id === 'mar-2569-1' || r.id === 'apr-2569-1').map((row) => (
                        <tr key={row.id} className="align-top border-b border-black">
                          <td className="border border-black p-1.5 text-center font-bold bg-slate-50/50">{row.month}</td>
                          <td className="border border-black p-1.5 text-justify text-[9.5pt] leading-tight font-semibold text-slate-900">{row.topic}<p className="mt-1 text-[8.5pt] font-normal leading-tight text-slate-600">{row.detection}</p></td>
                          <td className="border border-black p-1.5 text-justify text-[8.5pt] leading-tight text-slate-700 whitespace-pre-line">{row.impact}</td>
                          <td className="border border-black p-1.5 text-justify text-[8.5pt] leading-tight text-slate-700 whitespace-pre-line">{row.resolution}</td>
                          <td className="border border-black p-1.5 text-justify text-[8.5pt] leading-tight text-slate-800 whitespace-pre-line bg-slate-50/20">{row.followup}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-right text-[12pt] font-mono text-slate-400 border-t pt-1 no-print-footer">หน้า 8 จาก 8</div>
            </div>

          </div>

        </div>

      </div>

      {/* Iframe Print Warning Modal */}
      {showIframeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 text-left font-sans">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">ไม่สามารถพิมพ์หรือดาวน์โหลดจากพรีวิวได้</h3>
              <button onClick={() => setShowIframeModal(false)} className="text-slate-400 hover:text-slate-600 p-1 text-xs">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">เนื่องจากข้อจำกัดความปลอดภัยของเบราว์เซอร์ จะบล็อกการพิมพ์ผ่าน Iframe</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-800 space-y-1">
                <p className="font-bold">💡 วิธีแก้ไข:</p>
                <p>คลิกปุ่ม "เปิดแอปในแท็บใหม่" เพื่อเปิดแอปในหน้าต่างเต็มจอ จากนั้นคุณจะสั่งพิมพ์และเซฟเป็น PDF 8 หน้าได้อย่างรวดเร็วและเป็นระเบียบ 100%</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowIframeModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">ปิด</button>
              <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs text-center">เปิดแท็บใหม่ ↗</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
