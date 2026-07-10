import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CooperativeLetter, Inspector } from '../types';
import { INITIAL_LETTERS } from '../data';
import { 
  Presentation, Play, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  CheckCircle2, Compass, ShieldCheck, Users, TrendingUp, AlertTriangle,
  Layers, HelpCircle, Palette, RefreshCw, BarChart3, CreditCard
} from 'lucide-react';

interface PresentationSlidesProps {
  letters: CooperativeLetter[];
}

type ThemeType = 'slate' | 'mint' | 'navy';

export default function PresentationSlides({ letters }: PresentationSlidesProps) {
  const coopList = letters || INITIAL_LETTERS;
  const [selectedCoopId, setSelectedCoopId] = useState<string>(coopList[0]?.id || 'ayutthaya-police');
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<ThemeType>('slate');

  // Load and sync cooperative state
  const currentCoop = coopList.find(c => c.id === selectedCoopId) || coopList[0];

  // Financial status state (pulled from localStorage or standard defaults)
  const [financialData, setFinancialData] = useState({
    bankBalance: 110191093.92,
    debtorBalance: 3502596479.28,
    depositBalance: 275247242.88,
    shareBalance: 1258029470.00,
    reserveBalance: 9966434.06,
    bankDetail: { savings: 106541621.47, currents: 1000.00, coops: 3648472.45 },
    debtorDetail: { regular: 2180406915.88, special: 1277090349.81, emergency: 31320647.46, other: 13779566.13 },
    depositDetail: { savings: 275078242.88, savingDay: 169000.00 }
  });

  useEffect(() => {
    // Whenever coop changes, sync data & reset slide
    setCurrentSlide(0);
    const savedWP = localStorage.getItem(`wp_state_${selectedCoopId}`);
    if (savedWP) {
      try {
        const parsed = JSON.parse(savedWP);
        
        let bankSum = 0;
        let savingsSum = 106541621.47;
        let currentsSum = 1000.00;
        let coopsSum = 3648472.45;
        if (parsed.bankData) {
          savingsSum = (parsed.bankData.savings || []).reduce((acc: number, r: any) => acc + (Number(r.bookBalance) || 0), 0);
          currentsSum = (parsed.bankData.currents || []).reduce((acc: number, r: any) => acc + (Number(r.bookBalance) || 0), 0);
          coopsSum = (parsed.bankData.coops || []).reduce((acc: number, r: any) => acc + (Number(r.bookBalance) || 0), 0);
          bankSum = savingsSum + currentsSum + coopsSum;
        }

        let debtorSum = 0;
        let regDebtor = 2180406915.88;
        let speDebtor = 1277090349.81;
        let emeDebtor = 31320647.46;
        let othDebtor = 13779566.13;
        if (parsed.debtorData?.rows) {
          regDebtor = Number(parsed.debtorData.rows.regular?.endBal) || 0;
          speDebtor = Number(parsed.debtorData.rows.special?.endBal) || 0;
          emeDebtor = Number(parsed.debtorData.rows.emergency?.endBal) || 0;
          othDebtor = Number(parsed.debtorData.rows.other?.endBal) || 0;
          debtorSum = regDebtor + speDebtor + emeDebtor + othDebtor;
        }

        let depositSum = 0;
        let savDeposit = 275078242.88;
        let dayDeposit = 169000.00;
        if (parsed.depositData?.rows) {
          savDeposit = Number(parsed.depositData.rows.savings?.endBal) || 0;
          dayDeposit = Number(parsed.depositData.rows.savingDay?.endBal) || 0;
          depositSum = savDeposit + dayDeposit;
        }

        let shareSum = 0;
        if (parsed.shareData) {
          shareSum = Number(parsed.shareData.endBal) || 0;
        }

        let reserveSum = 0;
        if (parsed.reserveData?.rows) {
          reserveSum = (parsed.reserveData.rows || []).reduce((acc: number, r: any) => acc + (Number(r.endBal) || 0), 0);
        }

        setFinancialData({
          bankBalance: bankSum || 110191093.92,
          debtorBalance: debtorSum || 3502596479.28,
          depositBalance: depositSum || 275247242.88,
          shareBalance: shareSum || 1258029470.00,
          reserveBalance: reserveSum || 9966434.06,
          bankDetail: { savings: savingsSum, currents: currentsSum, coops: coopsSum },
          debtorDetail: { regular: regDebtor, special: speDebtor, emergency: emeDebtor, other: othDebtor },
          depositDetail: { savings: savDeposit, savingDay: dayDeposit }
        });
      } catch (err) {
        console.error('Failed to parse WP for presentation', err);
        useDefaultData(selectedCoopId);
      }
    } else {
      useDefaultData(selectedCoopId);
    }
  }, [selectedCoopId, letters]);

  const useDefaultData = (coopId: string) => {
    if (coopId === 'ayutthaya-police') {
      setFinancialData({
        bankBalance: 110191093.92,
        debtorBalance: 3502596479.28,
        depositBalance: 275247242.88,
        shareBalance: 1258029470.00,
        reserveBalance: 9966434.06,
        bankDetail: { savings: 106541621.47, currents: 1000.00, coops: 3648472.45 },
        debtorDetail: { regular: 2180406915.88, special: 1277090349.81, emergency: 31320647.46, other: 13779566.13 },
        depositDetail: { savings: 275078242.88, savingDay: 169000.00 }
      });
    } else if (coopId === 'community-dev') {
      setFinancialData({
        bankBalance: 42350610.15,
        debtorBalance: 1450285900.00,
        depositBalance: 92451800.00,
        shareBalance: 815462000.00,
        reserveBalance: 3245180.00,
        bankDetail: { savings: 40150200.15, currents: 150000.00, coops: 2050410.00 },
        debtorDetail: { regular: 1120150400.00, special: 310135500.00, emergency: 20000000.00, other: 0 },
        depositDetail: { savings: 91451800.00, savingDay: 1000000.00 }
      });
    } else {
      setFinancialData({
        bankBalance: 25140300.50,
        debtorBalance: 820150400.00,
        depositBalance: 114500900.00,
        shareBalance: 615020400.00,
        reserveBalance: 1980350.25,
        bankDetail: { savings: 24140300.50, currents: 0, coops: 1000000.00 },
        debtorDetail: { regular: 610150400.00, special: 190000000.00, emergency: 20000000.00, other: 0 },
        depositDetail: { savings: 114500900.00, savingDay: 0 }
      });
    }
  };

  // Slides Data Structure
  const slides = [
    {
      title: 'รายงานผลการตรวจสอบกิจการ',
      subtitle: `งวดประจำเดือน ${currentCoop?.inspectionMonth || 'มิถุนายน 2569'}`,
      type: 'cover',
      content: (
        <div className="flex flex-col items-center text-center justify-center h-full space-y-6 px-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center text-white"
          >
            <Compass className="w-10 h-10 text-emerald-400" />
          </motion.div>
          
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-md">
              {currentCoop?.orgName}
            </h2>
            <p className="text-lg md:text-xl text-emerald-300 font-semibold uppercase tracking-wider">
              รายงานนำเสนอต่อคณะกรรมการดำเนินการ
            </p>
          </div>

          <div className="w-48 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>

          <div className="space-y-1.5 text-sm font-medium text-slate-300">
            <div>รอบตรวจบัญชี: {currentCoop?.inspectionPeriod}</div>
            <div>
              วันที่เข้าตรวจ: <span className="font-bold text-white">{currentCoop?.inspectionDatesText}</span>
            </div>
            <div className="text-[12px] opacity-75 mt-3">
              จัดทำโดย: บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'ขอบเขตและรายชื่อผู้ตรวจสอบ',
      subtitle: 'รายละเอียดคณะทำงานและรูปแบบรายการตรวจสอบหลัก',
      type: 'scope',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-6 text-white">
          <div className="space-y-5 bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
              <Users className="w-5 h-5" />
              คณะผู้ตรวจสอบกิจการ
            </h3>
            
            <div className="space-y-3">
              {currentCoop?.inspectors.map((ins, idx) => (
                <div key={ins.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-none">
                  <span className="w-7 h-7 bg-emerald-500/20 text-emerald-300 rounded-full flex items-center justify-center font-bold font-mono text-xs">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-sm text-white">{ins.name}</div>
                    <div className="text-[11px] text-slate-300">{ins.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-emerald-300 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              ขอบเขตเอกสารตรวจสอบ
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="text-xs text-slate-300">รูปแบบรายการจัดเก็บ (Checklist):</div>
                <div className="text-base font-extrabold text-emerald-400 mt-1 uppercase">
                  {currentCoop?.checklistStyle === '17-items' ? 'สไตล์ 17 รายการคัดเลือก (มาตรฐาน)' : 'สไตล์ 20 รายการละเอียด (แบบลึก)'}
                </div>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="text-xs text-slate-300">งวดผลต่างงบทดลอง:</div>
                <div className="text-sm font-semibold text-white mt-1">
                  วิเคราะห์ข้อมูลเปรียบเทียบงบรับ-จ่าย คณะกรรมการและรายงานสมาชิก
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed italic">
                * ผู้ตรวจสอบได้ประเมินประสิทธิภาพการควบคุมภายในระบบเงินฝากและสินเชื่อในระดับพึงพอใจสูง
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '๑. ตรวจสอบยอดเงินฝากธนาคาร',
      subtitle: 'ความถูกต้องครบถ้วนของบัญชีออมทรัพย์และกระแสรายวัน',
      type: 'detail',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-6 text-white">
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl flex items-center gap-4">
              <span className="p-3 bg-emerald-500 text-white rounded-xl">
                <BarChart3 className="w-6 h-6" />
              </span>
              <div>
                <div className="text-xs text-slate-300">รวมเงินฝากธนาคารสุทธิ</div>
                <div className="text-2xl md:text-3xl font-black text-white font-mono mt-1">
                  {financialData.bankBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ข้อสรุปการตรวจยอดเงินฝาก:
              </div>
              <p>ยอดเงินฝากในบัญชีธนาคารกรุงไทย, ธนาคารสงเคราะห์อาคาร (ธอส.) และเงินฝากชุมนุมสหกรณ์ มีหลักฐานใบรับรองสมุดคู่ฝากตรงตามยอดงบทดลองและใบแยกประเภททุกประการ</p>
            </div>
          </div>

          <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
            <h4 className="text-sm font-bold text-emerald-300 border-b border-white/10 pb-2 mb-3">จำแนกตามประเภทเงินฝาก:</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-none">
                <span className="text-slate-200 font-medium">บัญชีเงินฝากออมทรัพย์ (Savings)</span>
                <span className="font-bold font-mono">{financialData.bankDetail.savings.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-none">
                <span className="text-slate-200 font-medium">บัญชีเงินฝากกระแสรายวัน (Currents)</span>
                <span className="font-bold font-mono">{financialData.bankDetail.currents.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-none">
                <span className="text-slate-200 font-medium">เงินฝากชุมนุมสหกรณ์/ชสอ. (Coops)</span>
                <span className="font-bold font-mono">{financialData.bankDetail.coops.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '๒. ตรวจสอบลูกหนี้เงินกู้แก่สมาชิก',
      subtitle: 'ลูกหนี้สามัญ พิเศษ ฉุกเฉิน และเอกสารสัญญาคุมยอด',
      type: 'detail',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-6 text-white">
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl flex items-center gap-4">
              <span className="p-3 bg-amber-500 text-white rounded-xl">
                <CreditCard className="w-6 h-6" />
              </span>
              <div>
                <div className="text-xs text-slate-300">รวมลูกหนี้เงินกู้ปลายงวดสะสม</div>
                <div className="text-2xl md:text-3xl font-black text-white font-mono mt-1">
                  {financialData.debtorBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                สถานภาพและการชำระคืนหนี้:
              </div>
              <p>ลูกหนี้หลักได้รับการตรวจสอบความมีอยู่จริงของสัญญากู้และการชำระคืนครบถ้วน สัดส่วนหนี้ค้างชำระไม่เกินเกณฑ์ความเสี่ยง ระบบหักหนี้หน้าซองเงินเดือนทำงานได้ปกติ</p>
            </div>
          </div>

          <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
            <h4 className="text-sm font-bold text-amber-300 border-b border-white/10 pb-2 mb-3">จำแนกตามประเภทสัญญาเงินกู้:</h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-200">ลูกหนี้สามัญ (Regular)</span>
                <span className="font-bold font-mono text-amber-200">{financialData.debtorDetail.regular.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-200">ลูกหนี้พิเศษ (Special)</span>
                <span className="font-bold font-mono text-amber-200">{financialData.debtorDetail.special.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-slate-200">ลูกหนี้ฉุกเฉิน (Emergency)</span>
                <span className="font-bold font-mono text-amber-200">{financialData.debtorDetail.emergency.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className="flex justify-between items-center py-1.5 last:border-none">
                <span className="text-slate-200">ลูกหนี้อื่น/ฟ้องร้อง (Others)</span>
                <span className="font-bold font-mono text-amber-200">{financialData.debtorDetail.other.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '๓. เงินรับฝากและทุนเรือนหุ้น',
      subtitle: 'วิเคราะห์โครงสร้างเงินฝากของสมาชิก และสัดส่วนทุนเรือนหุ้น',
      type: 'detail',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center p-6 text-white">
          <div className="space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-xl">
              <div className="text-xs text-slate-300">ทุนเรือนหุ้นสะสม (Share Capital)</div>
              <div className="text-xl md:text-2xl font-bold text-sky-300 font-mono mt-1">
                {financialData.shareBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
              <div className="text-xs text-slate-300">เงินรับฝากรวมจากสมาชิก (Member Deposits)</div>
              <div className="text-xl md:text-2xl font-bold text-blue-300 font-mono mt-1">
                {financialData.depositBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10 text-xs">
            <h4 className="text-sm font-bold text-sky-300 border-b border-white/10 pb-2">ความมั่นคงในโครงสร้างทุนสะสม:</h4>
            
            <p className="leading-relaxed text-slate-300">
              โครงสร้างเงินทุนส่วนใหญ่ของสหกรณ์ประกอบด้วยทุนเรือนหุ้นสะสมจากสมาชิกสูง แสดงให้เห็นถึงระดับความเสถียรทางการเงินที่แข็งแกร่ง มีความเสี่ยงต่อการขาดสภาพคล่องอยู่ในเกณฑ์ต่ำมาก
            </p>

            <div className="flex justify-between items-center py-2 bg-white/5 px-3 rounded-lg">
              <span className="font-medium">เงินออมทรัพย์สมาชิกสะสม:</span>
              <span className="font-bold font-mono text-emerald-400">
                {financialData.depositDetail.savings.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '๔. ข้อสังเกตและคำแนะนำจากสายตรวจ',
      subtitle: 'สรุปประเด็นหลักและข้อเสนอแนะเพื่อให้การดำเนินงานรัดกุมขึ้น',
      type: 'observations',
      content: (
        <div className="space-y-4 text-white p-4 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                จุดแข็งและประเด็นที่ดี (Strengths)
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1 leading-relaxed">
                <li>การกระทบยอดทะเบียนลูกหนี้รายบุคคลตรงงบใหญ่</li>
                <li>เอกสารใบเสร็จประกอบสัญญากู้มีครบถ้วน 100%</li>
                <li>ทะเบียนหุ้นสมาชิกระบบคอมพิวเตอร์ ทำงานมีประสิทธิภาพ</li>
              </ul>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
              <div className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                จุดที่ควรระวังและปรับปรุง (Improvement)
              </div>
              <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 pl-1 leading-relaxed">
                <li>ควรปรับปรุงสรุปกระทบยอดธนาคารทุกสิ้นสัปดาห์</li>
                <li>จำแนกและติดตามทวงถามลูกหนี้ผิดนัดชำระอย่างรัดกุม</li>
                <li>จัดทำรายงานเงินกองทุนสะสมประเภทต่างๆ ให้แยกบัญชี</li>
              </ul>
            </div>

          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-slate-200 leading-relaxed text-center font-medium">
            "โดยรวม สหกรณ์ออมทรัพย์มีระบบควบคุมภายในและการทำบัญชีที่โปร่งใส คณะผู้ตรวจสอบขอขอบคุณผู้จัดการและเจ้าหน้าที่สหกรณ์ที่อำนวยความสะดวกในการตรวจสอบครั้งนี้"
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, isFullscreen]);

  // CSS themes
  const themeClasses = {
    slate: {
      bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950',
      text: 'text-slate-100',
      accent: 'text-emerald-400',
      border: 'border-slate-700'
    },
    mint: {
      bg: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-zinc-950',
      text: 'text-emerald-50',
      accent: 'text-teal-400',
      border: 'border-teal-800'
    },
    navy: {
      bg: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950',
      text: 'text-blue-50',
      accent: 'text-sky-300',
      border: 'border-blue-900'
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto no-print">
      
      {/* Settings bar (not shown when fullscreen is activated) */}
      {!isFullscreen && (
        <div className="bg-white p-4 rounded-xl border border-slate-100 doc-shadow flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl">
              <Presentation className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">งานนำเสนอรายงานตรวจกิจการ</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">บอร์ดสไลด์สรุปสำหรับการรายงานผลในที่ประชุมกรรมการสหกรณ์</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Coop Selection */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <span>สหกรณ์:</span>
              <select
                value={selectedCoopId}
                onChange={(e) => setSelectedCoopId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {coopList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.orgName.replace('สหกรณ์ออมทรัพย์', 'สอ.')}
                  </option>
                ))}
              </select>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              <button
                onClick={() => setActiveTheme('slate')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTheme === 'slate' ? 'bg-slate-800 text-white' : 'text-slate-500'
                }`}
              >
                Slate
              </button>
              <button
                onClick={() => setActiveTheme('mint')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTheme === 'mint' ? 'bg-emerald-800 text-white' : 'text-slate-500'
                }`}
              >
                Mint
              </button>
              <button
                onClick={() => setActiveTheme('navy')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                  activeTheme === 'navy' ? 'bg-blue-800 text-white' : 'text-slate-500'
                }`}
              >
                Navy
              </button>
            </div>

            {/* Present button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              เริ่มนำเสนอ (เต็มจอ)
            </button>

          </div>
        </div>
      )}

      {/* SLIDE DECK VIEW FRAME */}
      <div 
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 shadow-2xl flex flex-col justify-between ${
          themeClasses[activeTheme].bg
        } ${
          isFullscreen 
            ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' 
            : 'aspect-[16/9] w-full min-h-[480px]'
        }`}
      >
        
        {/* Fullscreen control top bar */}
        <div className="p-5 flex items-center justify-between border-b border-white/5 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-white">
            <span className="px-2 py-0.5 bg-emerald-500 text-slate-900 text-[10px] font-black rounded font-mono">
              TK AUDIT DECK
            </span>
            <span className="text-xs font-bold opacity-80 text-slate-200">
              {currentCoop?.orgName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono font-bold text-white/50">
              สไลด์ที่ {currentSlide + 1} / {slides.length}
            </span>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
              title="สลับโหมดเต็มจอ"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic slide core block */}
        <div className="flex-1 w-full flex flex-col justify-center px-8 md:px-16 overflow-y-auto py-6">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -80, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full flex flex-col justify-center h-full"
            >
              {/* Slide Title */}
              {slides[currentSlide].type !== 'cover' && (
                <div className="mb-6 space-y-1">
                  <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    {slides[currentSlide].title}
                  </h3>
                  <p className="text-xs md:text-sm text-emerald-400 font-bold tracking-wide">
                    {slides[currentSlide].subtitle}
                  </p>
                  <div className="w-24 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent mt-1.5"></div>
                </div>
              )}

              {/* Slide Core Content */}
              <div className="flex-1 flex flex-col justify-center min-h-[250px]">
                {slides[currentSlide].content}
              </div>
            </motion.div>
          </AnimatePresence>

        </div>

        {/* Presentation bottom controllers */}
        <div className="p-5 flex items-center justify-between border-t border-white/5 backdrop-blur-sm z-10">
          <div className="flex gap-1">
            {slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  currentSlide === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                currentSlide === 0 
                  ? 'border-white/5 text-white/20 cursor-not-allowed' 
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/15'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentSlide === slides.length - 1}
              className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer border ${
                currentSlide === slides.length - 1 
                  ? 'border-white/5 text-white/20 cursor-not-allowed' 
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/15'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

      {/* Guide/Keyboard Info section (not shown when fullscreen is activated) */}
      {!isFullscreen && (
        <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl flex items-center gap-3 text-slate-500 text-xs font-medium">
          <HelpCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p>
            <strong>คีย์บอร์ดลัดเพื่อความสะดวก:</strong> คุณสามารถกดปุ่มลูกศร <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">←</kbd> และ <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">→</kbd> บนคีย์บอร์ดเพื่อเปลี่ยนหน้าสไลด์ หรือปุ่ม <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold font-mono">Esc</kbd> เพื่อออกจากโหมดนำเสนอเต็มจอได้ตลอดเวลา
          </p>
        </div>
      )}

    </div>
  );
}
