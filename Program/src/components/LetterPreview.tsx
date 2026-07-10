import React, { useRef, useState, useEffect } from 'react';
import { CooperativeLetter } from '../types';
import { Printer, Copy, Check, FileText, ZoomIn, ZoomOut, RotateCcw, Download, AlertTriangle } from 'lucide-react';
// @ts-ignore
import tkLogo from '../assets/images/tk_logo_1782903136304.jpg';

interface LetterPreviewProps {
  letter: CooperativeLetter;
}

export default function LetterPreview({ letter }: LetterPreviewProps) {
  const [activeTab, setActiveTab] = useState<'letter' | 'checklist' | 'both'>('both');
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [dontShowPdfAgain, setDontShowPdfAgain] = useState(() => {
    return localStorage.getItem('skip_pdf_guide') === 'true';
  });
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const handlePrint = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else if (dontShowPdfAgain) {
      window.print();
    } else {
      setShowPdfModal(true);
    }
  };

  const proceedToPrint = () => {
    setShowPdfModal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleCopyText = () => {
    // Compile plain text version of the letter
    const inspectorsText = letter.inspectors
      .map((ins, i) => `${i + 1}.${ins.name}   ${ins.title}`)
      .join('\n');

    const plainText = `
บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด
TK Account & Associate CO.,Ltd.
110/404 ซอยรามคำแหง 188 ถนนรามคำแหง แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10230
เลขประจำตัวผู้เสียภาษีอากร 0105556199549 โทร 065-7192893 : E-mail- Thatikarn_sr@hotmail.com
---------------------------------------------------------------------------------

                                                        ${letter.letterDate}

เรื่อง แจ้งวันเข้าตรวจสอบกิจการ ประจำเดือน${letter.inspectionMonth}
เรียน ${letter.recipient}
สิ่งที่ส่งมาด้วย หนังสือแจ้งให้จัดเตรียมเอกสารประกอบการตรวจสอบ

      ตามที่ สหกรณ์ออมทรัพย์${letter.orgName.replace('สหกรณ์ออมทรัพย์', '')} ได้แจ้งให้บริษัทฯ ทราบว่าที่ประชุมใหญ่สามัญประจำปี ${letter.meetingYear} ได้มีมติเลือก บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด โดย${letter.repName} เป็นผู้ตรวจสอบกิจการประจำปีทางบัญชีสิ้นสุดวันที่ ${letter.fiscalYearEnd} นั้น
      บัดนี้ถึงกำหนดที่บริษัทฯ จะเข้าตรวจสอบกิจการของสหกรณ์ฯ ประจำเดือน${letter.inspectionMonth} แล้ว โดยกำหนดวันที่เข้าตรวจเป็นวันที่ ${letter.inspectionDatesText} ซึ่งขอบเขตของการตรวจสอบจะตรวจสอบรายการทางบัญชีที่เกิดขึ้น ตั้งแต่วันที่ ${letter.inspectionPeriod} รวมถึงการตรวจสอบเอกสารหลักฐานต่าง ๆ สำหรับงวดเดียวกัน บริษัทฯ จึงใคร่ขอแจ้งให้ทราบถึงคณะทำงานที่จะเข้าตรวจสอบดังนี้

${inspectorsText}

      จึงเรียนมาเพื่อทราบและบริษัทฯ หวังเป็นอย่างยิ่งว่าจะได้รับความร่วมมือจากท่านในการจัดเตรียมสมุดบัญชี ตลอดจนสรรพเอกสารต่าง ๆ มาเพื่อประกอบการตรวจสอบของผู้ตรวจสอบกิจการ

                                                        ขอแสดงความนับถือ


                                                       (${letter.signeeName})
                                                       ${letter.signeeTitle}
    `.trim();

    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 border-l border-slate-200/80">
      {isInIframe && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner no-print font-sans">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-white/20 shrink-0 animate-pulse">⚠️</span>
            <span>ระบบตรวจพบว่าคุณกำลังเปิดผ่านหน้าต่างพรีวิว (Iframe) ซึ่งเบราว์เซอร์จะบล็อกการสั่งพิมพ์และดาวน์โหลด PDF เป็นการป้องกันความปลอดภัย</span>
          </div>
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-white text-orange-700 font-bold rounded-lg hover:bg-orange-50 transition-all flex items-center gap-1 shadow hover:scale-[1.02] shrink-0"
          >
            เปิดในแท็บใหม่เพื่อสั่งพิมพ์/ดาวน์โหลด ↗
          </a>
        </div>
      )}
      {/* Document toolbar */}
      <div className="bg-white p-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Document Tab Toggles */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all font-sans ${
              activeTab === 'both' ? 'bg-white text-slate-800 doc-shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            แสดงทั้ง 2 หน้า
          </button>
          <button
            onClick={() => setActiveTab('letter')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all font-sans ${
              activeTab === 'letter' ? 'bg-white text-slate-800 doc-shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            หน้า 1: หนังสือแจ้ง
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all font-sans ${
              activeTab === 'checklist' ? 'bg-white text-slate-800 doc-shadow' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            หน้า 2: จัดเตรียมเอกสาร
          </button>
        </div>

        {/* Toolbar Zoom & Actions */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
            <button
              onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))}
              className="p-1 hover:bg-white rounded text-slate-600 transition-all"
              title="ย่อ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold px-1.5 text-slate-600 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(prev => Math.min(1.4, prev + 0.1))}
              className="p-1 hover:bg-white rounded text-slate-600 transition-all"
              title="ขยาย"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-1 hover:bg-white rounded text-slate-400 hover:text-slate-600 transition-all"
              title="รีเซ็ต"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all font-sans"
            title="คัดลอกข้อความในหนังสือ"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg text-xs font-bold transition-all font-sans doc-shadow cursor-pointer"
            title="ดาวน์โหลดและบันทึกเอกสารเป็นไฟล์ PDF"
          >
            <Download className="w-3.5 h-3.5" />
            ดาวน์โหลด PDF
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all font-sans doc-shadow cursor-pointer"
            title="พิมพ์เอกสารออกเป็นกระดาษ A4 หรือบันทึก PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            สั่งพิมพ์ (A4)
          </button>
        </div>
      </div>

      {/* Outer Preview Stage */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start gap-8 no-print select-text">
        <div 
          ref={printContainerRef} 
          className="flex flex-col gap-8 origin-top transition-transform"
          style={{ transform: `scale(${scale})`, width: '210mm' }}
        >
          {/* Page 1: Inspection Notification Letter */}
          {(activeTab === 'both' || activeTab === 'letter') && (
            <div className="print-page bg-white w-[210mm] min-h-[297mm] p-[20mm_18mm_20mm_18mm] doc-shadow relative flex flex-col justify-between overflow-hidden text-black text-left select-text">
              <div className="space-y-4">
                {/* Official Letterhead */}
                <div className="flex items-center pb-2 font-thai border-b-0">
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

                {/* Letter Metadata Date (Aligned Right) */}
                <div className="text-right font-thai text-[16pt] pt-4 pr-[20px] text-black">
                  {letter.letterDate}
                </div>

                {/* Meta block */}
                <div className="font-thai text-[16pt] space-y-1 pl-[10px] pt-2 text-black">
                  <div className="flex">
                    <span className="font-bold w-[95px] shrink-0">เรื่อง</span>
                    <span>แจ้งวันเข้าตรวจสอบกิจการ ประจำเดือน{letter.inspectionMonth}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-[95px] shrink-0">เรียน</span>
                    <span>{letter.recipient}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold w-[95px] shrink-0">สิ่งที่ส่งมาด้วย</span>
                    <span>หนังสือแจ้งให้จัดเตรียมเอกสารประกอบการตรวจสอบ</span>
                  </div>
                </div>

                {/* Body Paragraph 1 */}
                <div className="font-thai text-[16pt] text-justify pt-4 text-black" style={{ textIndent: '2.5em' }}>
                  ตามที่ <span className="font-semibold">{letter.orgName}</span> ได้แจ้งให้บริษัทฯ ทราบว่าที่ประชุมใหญ่สามัญประจำปี {letter.meetingYear} ได้มีมติเลือก บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด โดย<span className="font-semibold">{letter.repName}</span> เป็นผู้ตรวจสอบกิจการประจำปีทางบัญชีสิ้นสุดวันที่ {letter.fiscalYearEnd} นั้น
                </div>

                {/* Body Paragraph 2 */}
                <div className="font-thai text-[16pt] text-justify text-black" style={{ textIndent: '2.5em' }}>
                  บัดนี้ถึงกำหนดที่บริษัทฯ จะเข้าตรวจสอบกิจการของสหกรณ์ฯ ประจำเดือน{letter.inspectionMonth} แล้ว โดยกำหนดวันที่เข้าตรวจเป็นวันที่ <span className="font-extrabold text-black">{letter.inspectionDatesText}</span> ซึ่งขอบเขตของการตรวจสอบจะตรวจสอบรายการทางบัญชีที่เกิดขึ้น ตั้งแต่วันที่ {letter.inspectionPeriod} รวมถึงการตรวจสอบเอกสารหลักฐานต่าง ๆ สำหรับงวดเดียวกัน บริษัทฯ จึงใคร่ขอแจ้งให้ทราบถึงคณะทำงานที่จะเข้าตรวจสอบดังนี้
                </div>

                {/* Team list table/block */}
                <div className="pl-[3em] py-3 space-y-2 font-thai text-[16pt] text-black">
                  {letter.inspectors.map((ins, i) => (
                    <div key={ins.id} className="flex items-center">
                      <span className="w-[30px] font-mono text-slate-400">{i + 1}.</span>
                      <span className="w-[200px] font-semibold text-black">{ins.name}</span>
                      <span className="text-black">{ins.title}</span>
                    </div>
                  ))}
                </div>

                {/* Body Paragraph 3 */}
                <div className="font-thai text-[16pt] text-justify text-black" style={{ textIndent: '2.5em' }}>
                  จึงเรียนมาเพื่อทราบและบริษัทฯ หวังเป็นอย่างยิ่งว่าจะได้รับความร่วมมือจากท่านในการจัดเตรียมสมุดบัญชี ตลอดจนสรรพเอกสารต่าง ๆ มาเพื่อประกอบการตรวจสอบของผู้ตรวจสอบกิจการ
                </div>
              </div>

              {/* Sign-off Block */}
              <div className="mt-8 self-end w-[280px] font-thai text-[16pt] flex flex-col items-center space-y-1 text-center pr-[20px] text-black">
                <div>ขอแสดงความนับถือ</div>
                
                {/* Stylized custom handwritten signature for "เฉลิมรัตน์" */}
                <div className="h-16 py-1 flex items-center justify-center relative">
                  {letter.signeeName.includes('เฉลิมรัตน์') ? (
                    <svg className="w-36 h-12 text-blue-600/80 stroke-current opacity-90 select-none animate-fadeIn" viewBox="0 0 160 50" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {/* Artistic blue pen cursive mockup */}
                      <path d="M10 25 C30 10, 45 40, 50 20 C55 5, 60 5, 65 25 C70 45, 80 40, 90 20 C100 0, 115 15, 120 30 C125 45, 140 25, 155 25" />
                      <path d="M35 15 C45 20, 60 40, 75 35" strokeWidth="1.5" />
                    </svg>
                  ) : (
                    <div className="w-32 border-b border-dashed border-slate-300 h-8 mt-4"></div>
                  )}
                </div>

                <div className="font-bold">({letter.signeeName})</div>
                <div className="text-black text-[16pt]">{letter.signeeTitle}</div>
              </div>
            </div>
          )}

          {/* Page 2: Document Checklist */}
          {(activeTab === 'both' || activeTab === 'checklist') && (
            <div className="print-page bg-white w-[210mm] min-h-[297mm] p-[20mm_18mm_20mm_18mm] doc-shadow relative flex flex-col justify-between overflow-hidden text-black text-left select-text">
              <div className="space-y-4">
                {/* Official Letterhead */}
                <div className="flex items-center pb-2 font-thai border-b-0">
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

                {/* Checklist Title */}
                <div className="text-center font-thai text-[18pt] font-extrabold tracking-wide pt-4 pb-2 border-b border-black text-black">
                  <u>หนังสือแจ้งให้จัดเตรียมเอกสารประกอบการตรวจสอบ</u>
                </div>

                {/* 17 or 20 Items Table style list */}
                <div className="pt-2 font-thai text-[16pt] text-black grid grid-cols-1 gap-2.5">
                  {letter.checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-start">
                      <span className="w-[30px] font-mono text-slate-400 font-bold text-right pr-2 shrink-0">{idx + 1}.</span>
                      <span className="flex-1 text-justify text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page Number Indicator */}
              <div className="text-center text-xs font-mono text-slate-400 pt-8 mt-auto">
                หน้า 2 / 2
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styled Printed Output Container (invisible on screen, but used for print layout) */}
      <div className="hidden print:block print-container">
        {/* Print Letter page */}
        <div className="print-page text-black text-left">
          {/* Official Letterhead */}
          <div className="flex items-center pb-2 font-thai border-b-0">
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

          <div className="text-right font-thai text-[16pt] pt-6 pr-4">
            {letter.letterDate}
          </div>

          <div className="font-thai text-[16pt] space-y-1.5 pl-2 pt-4">
            <div className="flex">
              <span className="font-bold w-[110px] shrink-0">เรื่อง</span>
              <span>แจ้งวันเข้าตรวจสอบกิจการ ประจำเดือน{letter.inspectionMonth}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-[110px] shrink-0">เรียน</span>
              <span>{letter.recipient}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-[110px] shrink-0">สิ่งที่ส่งมาด้วย</span>
              <span>หนังสือแจ้งให้จัดเตรียมเอกสารประกอบการตรวจสอบ</span>
            </div>
          </div>

          <div className="font-thai text-[16pt] text-justify pt-6" style={{ textIndent: '2.5em' }}>
            ตามที่ <span className="font-semibold">{letter.orgName}</span> ได้แจ้งให้บริษัทฯ ทราบว่าที่ประชุมใหญ่สามัญประจำปี {letter.meetingYear} ได้มีมติเลือก บริษัท ทีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด โดย<span className="font-semibold">{letter.repName}</span> เป็นผู้ตรวจสอบกิจการประจำปีทางบัญชีสิ้นสุดวันที่ {letter.fiscalYearEnd} นั้น
          </div>

          <div className="font-thai text-[16pt] text-justify" style={{ textIndent: '2.5em' }}>
            บัดนี้ถึงกำหนดที่บริษัทฯ จะเข้าตรวจสอบกิจการของสหกรณ์ฯ ประจำเดือน{letter.inspectionMonth} แล้ว โดยกำหนดวันที่เข้าตรวจเป็นวันที่ <span className="font-extrabold">{letter.inspectionDatesText}</span> ซึ่งขอบเขตของการตรวจสอบจะตรวจสอบรายการทางบัญชีที่เกิดขึ้น ตั้งแต่วันที่ {letter.inspectionPeriod} รวมถึงการตรวจสอบเอกสารหลักฐานต่าง ๆ สำหรับงวดเดียวกัน บริษัทฯ จึงใคร่ขอแจ้งให้ทราบถึงคณะทำงานที่จะเข้าตรวจสอบดังนี้
          </div>

          <div className="pl-[3.5em] py-4 space-y-2.5 font-thai text-[16pt]">
            {letter.inspectors.map((ins, i) => (
              <div key={ins.id} className="flex items-center">
                <span className="w-[30px] font-mono">{i + 1}.</span>
                <span className="w-[220px] font-semibold">{ins.name}</span>
                <span>{ins.title}</span>
              </div>
            ))}
          </div>

          <div className="font-thai text-[16pt] text-justify pb-8" style={{ textIndent: '2.5em' }}>
            จึงเรียนมาเพื่อทราบและบริษัทฯ หวังเป็นอย่างยิ่งว่าจะได้รับความร่วมมือจากท่านในการจัดเตรียมสมุดบัญชี ตลอดจนสรรพเอกสารต่าง ๆ มาเพื่อประกอบการตรวจสอบของผู้ตรวจสอบกิจการ
          </div>

          <div className="mt-12 ml-auto w-[300px] font-thai text-[16pt] flex flex-col items-center space-y-1 text-center pr-4">
            <div>ขอแสดงความนับถือ</div>
            
            <div className="h-14 py-1 flex items-center justify-center relative">
              {letter.signeeName.includes('เฉลิมรัตน์') && (
                <svg className="w-36 h-12 text-blue-600 stroke-current fill-none" viewBox="0 0 160 50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 25 C30 10, 45 40, 50 20 C55 5, 60 5, 65 25 C70 45, 80 40, 90 20 C100 0, 115 15, 120 30 C125 45, 140 25, 155 25" />
                  <path d="M35 15 C45 20, 60 40, 75 35" strokeWidth="1.5" />
                </svg>
              )}
            </div>

            <div className="font-bold">({letter.signeeName})</div>
            <div>{letter.signeeTitle}</div>
          </div>
        </div>

        {/* Page Break for Document Checklist */}
        <div className="print-page text-black text-left">
          {/* Official Letterhead */}
          <div className="flex items-center pb-2 font-thai border-b-0">
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

          <div className="text-center font-thai text-[18pt] font-extrabold tracking-wide pt-6 pb-3 border-b border-black">
            <u>หนังสือแจ้งให้จัดเตรียมเอกสารประกอบการตรวจสอบ</u>
          </div>

          <div className="pt-6 font-thai text-[16pt] space-y-3">
            {letter.checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-start">
                <span className="w-[35px] text-right pr-2 shrink-0 font-bold">{idx + 1}.</span>
                <span className="flex-1 text-justify">{item}</span>
              </div>
            ))}
          </div>

          <div className="text-center text-xs font-mono text-slate-400 pt-8 mt-auto">
            หน้า 2 / 2
          </div>
        </div>
      </div>

      {/* PDF Download Instructions Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 doc-shadow border border-slate-100 flex flex-col gap-5 text-left animate-scaleIn">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <FileText className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-800 font-sans">
                  คำแนะนำในการบันทึกเป็นไฟล์ PDF
                </h3>
              </div>
              <button 
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 font-sans">
              <p className="text-[13px] text-slate-700 leading-relaxed font-semibold">
                ระบบใช้ฟังก์ชันการพิมพ์มาตรฐานของเบราว์เซอร์ เพื่อรักษาแบบอักษร (Sarabun) และสัดส่วนระยะขอบของเอกสารราชการให้คมชัดสมบูรณ์แบบ กรุณาทำตาม 3 ขั้นตอนดังนี้:
              </p>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 font-mono text-[10px]">1</span>
                  <div>
                    <strong className="text-slate-800 block text-xs">เลือกปลายทาง (Destination)</strong>
                    <span className="text-[11px] text-slate-500">เปลี่ยนจากรายชื่อเครื่องพิมพ์ของคุณ ให้เป็น <strong className="text-rose-600 font-bold">"บันทึกเป็น PDF" (Save as PDF)</strong></span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 font-mono text-[10px]">2</span>
                  <div>
                    <strong className="text-slate-800 block text-xs">ขนาดกระดาษ (Paper size)</strong>
                    <span className="text-[11px] text-slate-500">ตรวจสอบว่าเลือกขนาดเป็น <strong className="text-slate-800 font-bold">A4</strong> เพื่อความถูกต้องตามมาตรฐานจดหมาย</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0 font-mono text-[10px]">3</span>
                  <div>
                    <strong className="text-slate-800 block text-xs">เปิดใช้งานกราฟิกพื้นหลัง (Background graphics)</strong>
                    <span className="text-[11px] text-slate-500 leading-normal block">
                      คลิก <em className="text-slate-700 font-medium">"การตั้งค่าเพิ่มเติม" (More settings)</em> แล้วทำเครื่องหมายถูกที่ช่อง <strong className="text-slate-800 font-bold">"กราฟิกพื้นหลัง" (Background graphics)</strong> เพื่อให้ลายเซ็นต์สีน้ำเงินคมชัด
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* "Don't show again" Checkbox */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowPdfAgain}
                onChange={(e) => {
                  setDontShowPdfAgain(e.target.checked);
                  if (e.target.checked) {
                    localStorage.setItem('skip_pdf_guide', 'true');
                  } else {
                    localStorage.removeItem('skip_pdf_guide');
                  }
                }}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 transition-all cursor-pointer"
              />
              <label htmlFor="dontShowAgain" className="text-xs text-slate-500 cursor-pointer font-semibold select-none font-sans">
                ไม่ต้องแสดงคำแนะนำนี้อีกในครั้งต่อไป
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-1 font-sans">
              <button
                onClick={() => setShowPdfModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all text-center cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={proceedToPrint}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-lg text-xs transition-all text-center shadow-md shadow-red-200 cursor-pointer"
              >
                เปิดหน้าต่างบันทึก PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Restriction Warning Modal */}
      {showIframeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 doc-shadow border border-slate-100 flex flex-col gap-5 text-left animate-scaleIn font-sans">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-800">
                  ไม่สามารถพิมพ์หรือดาวน์โหลดได้โดยตรง
                </h3>
              </div>
              <button 
                onClick={() => setShowIframeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <p className="text-[13px] text-slate-700 leading-relaxed font-semibold">
                เนื่องจากเบราว์เซอร์รักษาความปลอดภัยโดยการ <strong className="text-amber-700">บล็อกฟังก์ชันพิมพ์และการจัดทำไฟล์ PDF จากในกรอบพรีวิว (iframe)</strong> ของ AI Studio
              </p>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2 text-amber-800">
                <p className="font-bold flex items-center gap-1.5">
                  💡 วิธีการเปิดการพิมพ์/ดาวน์โหลดไฟล์:
                </p>
                <p className="leading-relaxed">
                  คลิกปุ่ม <strong className="text-amber-900">"เปิดแอปในแท็บใหม่"</strong> ด้านล่าง เพื่อรันแบบเต็มจอ จากนั้นคุณจะสามารถกดดาวน์โหลดหรือสั่งพิมพ์ได้อย่างสะดวกสบายตามปกติ
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setShowIframeModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all text-center cursor-pointer"
              >
                ปิดหน้าต่างนี้
              </button>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowIframeModal(false)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg text-xs transition-all text-center shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                เปิดแอปในแท็บใหม่ ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
