import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, Upload, Download, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle,
  HelpCircle, Edit3, CheckSquare, Square, Info, ShieldCheck, ChevronRight,
  Sliders, Plus, Trash2, Printer, FileJson, FolderOpen, Save, ListChecks, Eye, EyeOff
} from 'lucide-react';
import { INITIAL_LETTERS } from '../data';

// Define the types for our parsed Trial Balance accounts
interface TBAccount {
  code: string;
  name: string;
  begDebit: number;
  begCredit: number;
  trxDebit: number;
  trxCredit: number;
  endDebit: number;
  endCredit: number;
  numbers?: number[];
}

interface LedgerAccount {
  code: string;
  name: string;
  balance: number;
}

// Helper to determine the bank balance, considering Credit balance as negative
// 1. ดึงยอดเงินฝากธนาคารจากงบทดลอง (เฉพาะเงินฝากธนาคาร&สหกรณ์อื่น) โดยใช้ข้อมูลจากคอลัมน์เดบิตยกไป, เครดิตยกไป
// 1.1 แสดงยอดเป็นบวก (+): หากคอลัมน์เดบิตยกไป (คอลัมน์ที่ 7 นับจากคอลัมน์ชื่อบัญชี) นำข้อมูลตัวเลขในรหัสบัญชีที่อ้างนั้นมีจำนวนตัวเลข ให้แสดงยอดตามจำนวนตัวเลขนั้นๆ
// 1.2 แสดงยอดเป็นลบ (-): หากคอลัมน์เครบิตยกไป (คอลัมน์ที่ 8 นับจากคอลัมน์ชื่อบัญชี) นำข้อมูลตัวเลขในรหัสบัญชีที่อ้างนั้นมีจำนวนตัวเลข ให้แสดงยอดตามจำนวนตัวเลขนั้นๆ เป็นลบ
// 1.3 แสดงยอดเป็น 0 หากคอลัมน์เดบิตยกไป และคอลัมน์เครบิตยกไป ไม่แสดงจำนวนตัวเลขหรือแสดงเป็น 0
function getBalanceForBank(account: TBAccount | undefined): number {
  if (!account) return 0;

  // ตรวจสอบจาก numbers หากมีอย่างน้อย 8 คอลัมน์ (นับคอลัมน์ตัวเลขหลังจากชื่อบัญชี)
  if (account.numbers && account.numbers.length >= 8) {
    const debitVal = account.numbers[6];  // คอลัมน์ที่ 7 นับจากคอลัมน์ชื่อบัญชี
    const creditVal = account.numbers[7]; // คอลัมน์ที่ 8 นับจากคอลัมน์ชื่อบัญชี

    if (creditVal !== undefined && creditVal !== 0) {
      return -Math.abs(creditVal);
    }
    if (debitVal !== undefined && debitVal !== 0) {
      return Math.abs(debitVal);
    }
    return 0;
  }

  // กรณีมีจำนวนคอลัมน์ 6-7 คอลัมน์ (เช่น ไม่มีคอลัมน์ปรับปรุง)
  if (account.numbers && account.numbers.length >= 6) {
    const debitVal = account.numbers[4];
    const creditVal = account.numbers[5];

    if (creditVal !== undefined && creditVal !== 0) {
      return -Math.abs(creditVal);
    }
    if (debitVal !== undefined && debitVal !== 0) {
      return Math.abs(debitVal);
    }
    return 0;
  }

  // ทรานสเลตทั่วไปจากฟิลด์เดบิต/เครดิตยกไป (endDebit, endCredit)
  if (account.endCredit !== undefined && account.endCredit !== 0) {
    return -Math.abs(account.endCredit);
  }
  if (account.endDebit !== undefined && account.endDebit !== 0) {
    return Math.abs(account.endDebit);
  }

  return 0;
}

// Dynamic Loader for PDF.js to support parsing PDF files client-side
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => {
      reject(new Error('ไม่สามารถโหลดระบบอ่านไฟล์ PDF ได้ กรุณาเชื่อมต่ออินเทอร์เน็ต'));
    };
    document.head.appendChild(script);
  });
};

// Reconstruct PDF lines by grouping text items by their baseline Y-coordinates and sorting by X-coordinates
// Also intelligently clusters numeric column X-positions to prevent index shift on empty cells
const extractTextRowsFromPdf = async (file: File): Promise<string[][]> => {
  const pdfjs = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const rows: string[][] = [];

  const isNumericStr = (str: string) => {
    const s = str.trim();
    return /^-?[\d,]+\.?\d*$/.test(s) || s === '-';
  };

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items: any[] = textContent.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      height: item.transform[0],
    }));

    // Group items by y-coordinate with a 5-pixel tolerance to align row elements
    const tolerance = 5;
    const linesMap: { [key: number]: any[] } = {};
    
    items.forEach(item => {
      const matchedY = Object.keys(linesMap).find(yStr => {
        const y = parseFloat(yStr);
        return Math.abs(y - item.y) <= tolerance;
      });
      
      if (matchedY) {
        linesMap[parseFloat(matchedY)].push(item);
      } else {
        linesMap[item.y] = [item];
      }
    });

    // Cluster X coordinates of numeric items on this page to identify main columns
    const pageNumericItems = items.filter(item => isNumericStr(item.str));
    let columnCenters: number[] = [];
    if (pageNumericItems.length > 0) {
      const xs = pageNumericItems.map(item => item.x).sort((a, b) => a - b);
      const clusters: number[][] = [];
      xs.forEach(x => {
        let added = false;
        for (const cluster of clusters) {
          const avg = cluster.reduce((sum, val) => sum + val, 0) / cluster.length;
          if (Math.abs(x - avg) < 22) { // 22 pixel tolerance
            cluster.push(x);
            added = true;
            break;
          }
        }
        if (!added) {
          clusters.push([x]);
        }
      });
      columnCenters = clusters
        .map(cluster => cluster.reduce((sum, val) => sum + val, 0) / cluster.length)
        .sort((a, b) => a - b);
    }

    // Sort each line top-to-bottom and left-to-right
    const sortedY = Object.keys(linesMap)
      .map(Number)
      .sort((a, b) => b - a); // PDF coordinates start from bottom-left, so high Y is top

    sortedY.forEach(y => {
      const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
      
      // Check if this line looks like a trial balance line (contains a 5-10 digit account code)
      let hasCode = false;
      let codeIdx = -1;
      for (let j = 0; j < lineItems.length; j++) {
        const item = lineItems[j];
        if (/^\d{5,10}$/.test(item.str.trim())) {
          hasCode = true;
          codeIdx = j;
          break;
        }
      }

      if (hasCode && columnCenters.length > 0) {
        const c1 = columnCenters[0];
        
        // Split items: left of first column center (with 15px margin) are text/code
        const leftItems = lineItems.filter(item => item.x < c1 - 15);
        const rightItems = lineItems.filter(item => item.x >= c1 - 15);

        const leftStrings = leftItems.map(item => item.str.trim()).filter(Boolean);

        // Align right items to the column centers
        const alignedNumericStrings = Array(columnCenters.length).fill('-');
        
        rightItems.forEach(item => {
          if (isNumericStr(item.str)) {
            let closestIdx = 0;
            let minDiff = Infinity;
            columnCenters.forEach((center, idx) => {
              const diff = Math.abs(item.x - center);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });
            if (minDiff < 30) {
              alignedNumericStrings[closestIdx] = item.str.trim();
            }
          }
        });

        const rowValues = [...leftStrings, ...alignedNumericStrings];
        if (rowValues.length > 0) {
          rows.push(rowValues);
        }
      } else {
        const rowValues = lineItems.map(item => item.str.trim()).filter(Boolean);
        if (rowValues.length > 0) {
          rows.push(rowValues);
        }
      }
    });
  }
  return rows;
};

const parseTBFromRows = (rows: string[][]): TBAccount[] => {
  const accounts: TBAccount[] = [];
  
  const parseNum = (val: string) => {
    if (!val || val === '-') return 0;
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  rows.forEach(row => {
    let code = '';
    let name = '';
    let codeIdx = -1;

    // Detect cell containing account code (5-10 digits)
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      const match = cell.match(/^(\d{5,10})\s+(.+)$/);
      if (match) {
        code = match[1];
        name = match[2];
        codeIdx = i;
        break;
      } else if (/^\d{5,10}$/.test(cell)) {
        code = cell;
        codeIdx = i;
        break;
      }
    }

    if (!code) return;

    // Search for name if not found in the code cell
    if (!name) {
      for (let i = codeIdx + 1; i < row.length; i++) {
        if (row[i] && !/^-?[\d,]+\.?\d*$/.test(row[i]) && row[i] !== '-') {
          name = row[i];
          break;
        }
      }
    }
    if (!name) name = 'บัญชีงบทดลอง';

    // Get numbers from the row (excluding the code cell)
    const numbers: number[] = [];
    row.forEach((cell, idx) => {
      if (idx === codeIdx) return;
      if (/^-?[\d,]+\.?\d*$/.test(cell) || cell === '-') {
        numbers.push(cell === '-' ? 0 : parseNum(cell));
      }
    });

    if (numbers.length >= 2) {
      const endCredit = numbers[numbers.length - 1];
      const endDebit = numbers[numbers.length - 2];
      
      const begDebit = numbers[0] || 0;
      const begCredit = numbers[1] || 0;
      const trxDebit = numbers[2] || 0;
      const trxCredit = numbers[3] || 0;

      accounts.push({
        code,
        name,
        begDebit,
        begCredit,
        trxDebit,
        trxCredit,
        endDebit,
        endCredit,
        numbers
      });
    }
  });

  return accounts;
};

const parseLedgerFromRows = (rows: string[][]): LedgerAccount[] => {
  const accounts: LedgerAccount[] = [];
  
  const parseNum = (val: string) => {
    if (!val || val === '-') return 0;
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  let currentCode = '';
  let currentName = '';
  let lastRowWithBalance: string[] | null = null;

  rows.forEach(row => {
    const rowText = row.join(' ');
    
    // Look for account code indicators e.g., "รหัสบัญชี : 11030101"
    const codeMatch = rowText.match(/(?:รหัสบัญชี|รหัส|Account|Code)\s*[:\-\s]\s*(\d{5,10})/i) || rowText.match(/\b(\d{5,10})\b/);
    
    if (codeMatch && !rowText.includes('หน้า') && !rowText.includes('Page')) {
      const newCode = codeMatch[1];
      
      // Save previous account's balance
      if (currentCode && lastRowWithBalance) {
        const balance = extractBalanceFromPdfRow(lastRowWithBalance);
        const existingIdx = accounts.findIndex(a => a.code === currentCode);
        if (existingIdx >= 0) {
          accounts[existingIdx].balance = balance !== 0 ? balance : accounts[existingIdx].balance;
        } else {
          accounts.push({ code: currentCode, name: currentName, balance });
        }
      }

      currentCode = newCode;
      const nameMatch = rowText.match(/(?:ชื่อบัญชี|ชื่อ|Name)\s*[:\-\s]\s*([^\s\d\:\-]+[^\s\:\-]*)/i);
      if (nameMatch) {
        currentName = nameMatch[1].trim();
      } else {
        const nonNumCell = row.find(cell => cell && cell.length > 3 && !cell.match(/^\d+$/) && !cell.includes('รหัสบัญชี'));
        currentName = nonNumCell ? nonNumCell.trim() : 'บัญชีแยกประเภท';
      }
      lastRowWithBalance = null;
      return;
    }

    if (currentCode) {
      const isBalanceRow = rowText.includes('ยอดยกไป') || 
                           rowText.includes('คงเหลือ') || 
                           rowText.includes('ยอดสะสม') || 
                           rowText.includes('ยอดยกไปสิ้นงวด') ||
                           rowText.includes('ยอดคงเหลือ') ||
                           rowText.includes('ยอดยกไปงวดหน้า') ||
                           rowText.includes('Balance') ||
                           rowText.includes('รวม');

      if (isBalanceRow) {
        lastRowWithBalance = row;
      } else {
        const hasNumbers = row.some((cell, idx) => idx > 1 && parseNum(cell) !== 0);
        if (hasNumbers) {
          lastRowWithBalance = row;
        }
      }
    }
  });

  // Save the last account
  if (currentCode && lastRowWithBalance) {
    const balance = extractBalanceFromPdfRow(lastRowWithBalance);
    const existingIdx = accounts.findIndex(a => a.code === currentCode);
    if (existingIdx >= 0) {
      accounts[existingIdx].balance = balance !== 0 ? balance : accounts[existingIdx].balance;
    } else {
      accounts.push({ code: currentCode, name: currentName, balance });
    }
  }

  return accounts;
};

const extractBalanceFromPdfRow = (row: string[]): number => {
  const parseNum = (val: string) => {
    if (!val || val === '-') return null;
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? null : num;
  };

  for (let i = row.length - 1; i >= 0; i--) {
    const val = parseNum(row[i]);
    if (val !== null && val !== 0) {
      return val;
    }
  }
  return 0;
};

// Helper to extract the first day of inspection (e.g. "6 - 7 กรกฎาคม 2569" -> "6 กรกฎาคม 2569")
function getFirstInspectionDate(datesText: string): string {
  if (!datesText) return '';
  const cleanText = datesText.replace(/\s+/g, ' ').trim();
  
  // Look for something like "6 - 7 กรกฎาคม 2569" or "6-7 กรกฎาคม 2569"
  const dashRegex = /^(\d+)\s*-\s*(\d+)\s+(.+)$/;
  const matchDash = cleanText.match(dashRegex);
  if (matchDash) {
    const firstDay = matchDash[1];
    const monthYear = matchDash[3];
    return `${firstDay} ${monthYear}`;
  }
  
  const dashNoSpaceRegex = /^(\d+)-(\d+)\s+(.+)$/;
  const matchNoSpace = cleanText.match(dashNoSpaceRegex);
  if (matchNoSpace) {
    const firstDay = matchNoSpace[1];
    const monthYear = matchNoSpace[3];
    return `${firstDay} ${monthYear}`;
  }

  return cleanText;
}

// Helper to calculate review date 2 days after the inspection date
function getReviewDateText(inspectDateText: string): string {
  if (!inspectDateText) return '';
  
  const cleanText = inspectDateText.replace(/\s+/g, ' ').trim();
  const match = cleanText.match(/(\d+)/);
  if (!match) return inspectDateText;
  
  const dayStr = match[1];
  const dayNum = parseInt(dayStr, 10);
  
  const monthsFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const monthsAbbr = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  
  let monthIdx = -1;
  let isAbbr = false;
  
  for (let i = 0; i < 12; i++) {
    if (cleanText.includes(monthsFull[i])) {
      monthIdx = i;
      break;
    }
  }
  
  if (monthIdx === -1) {
    for (let i = 0; i < 12; i++) {
      if (cleanText.includes(monthsAbbr[i])) {
        monthIdx = i;
        isAbbr = true;
        break;
      }
    }
  }
  
  const allNumbers = cleanText.match(/\d+/g);
  let yearNum = 2569;
  if (allNumbers && allNumbers.length >= 2) {
    const lastNumStr = allNumbers[allNumbers.length - 1];
    let parsedYear = parseInt(lastNumStr, 10);
    if (parsedYear < 100) {
      parsedYear += 2500;
    }
    yearNum = parsedYear;
  }
  
  if (monthIdx !== -1) {
    const adYear = yearNum - 543;
    const dateObj = new Date(adYear, monthIdx, dayNum);
    
    // Add 2 days
    dateObj.setDate(dateObj.getDate() + 2);
    
    const newDay = dateObj.getDate();
    const newMonthIdx = dateObj.getMonth();
    const newAdYear = dateObj.getFullYear();
    const newBeYear = newAdYear + 543;
    
    const newMonthStr = isAbbr ? monthsAbbr[newMonthIdx] : monthsFull[newMonthIdx];
    
    let yearStr = String(newBeYear);
    if (allNumbers && allNumbers.length >= 2) {
      const lastNumStr = allNumbers[allNumbers.length - 1];
      if (lastNumStr.length === 2) {
        yearStr = String(newBeYear).slice(-2);
      }
    }
    
    if (cleanText.includes("เข้าตรวจวท.")) {
      return `เข้าตรวจวท. ${newDay} ${newMonthStr}${yearStr}`;
    }
    
    const prefix = cleanText.split(dayStr)[0] || '';
    const hasSpaceAfterMonth = cleanText.includes(isAbbr ? monthsAbbr[monthIdx] + " " : monthsFull[monthIdx] + " ");
    const separator = hasSpaceAfterMonth ? " " : "";
    return `${prefix}${newDay} ${newMonthStr}${separator}${yearStr}`;
  }
  
  const newDayNum = dayNum + 2;
  return cleanText.replace(dayStr, String(newDayNum));
}

function getLastDayOfMonthText(inspectMonth: string): string {
  if (!inspectMonth) return '31 พฤษภาคม 2569';
  const parts = inspectMonth.trim().split(/\s+/);
  const monthName = parts[0];
  const yearPart = parts[1] || '';
  
  let days = '31';
  if (["เมษายน", "มิถุนายน", "กันยายน", "พฤศจิกายน"].includes(monthName)) {
    days = '30';
  } else if (monthName === "กุมภาพันธ์") {
    const yearAD = (parseInt(yearPart, 10) || 2569) - 543;
    const isLeap = (yearAD % 4 === 0 && yearAD % 100 !== 0) || (yearAD % 400 === 0);
    days = isLeap ? '29' : '28';
  }
  
  return `${days} ${monthName} ${yearPart}`;
}

interface WorkingPaperGeneratorProps {
  letters?: any[];
  activeTabProp?: 'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve';
  onTabChangeProp?: (tab: 'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve') => void;
}

// Custom reusable number input component to display commas and 2 decimals when blurred
interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  allowBlankZero?: boolean;
}

function NumberInput({ value, onChange, className = '', placeholder = '0.00', style, allowBlankZero }: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(value === 0 ? '' : value.toString());
  };

  if (isFocused) {
    return (
      <input
        type="number"
        step="any"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} outline-none`}
        style={style}
        autoFocus
      />
    );
  }

  if (allowBlankZero && value === 0) {
    return (
      <div
        onClick={handleFocus}
        className={`${className} cursor-text select-all min-h-[1.5em] w-full`}
        style={style}
      >
        &nbsp;
      </div>
    );
  }

  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

  return (
    <div
      onClick={handleFocus}
      className={`${className} cursor-text select-all`}
      style={style}
    >
      {formatted}
    </div>
  );
}

interface CoopNumericInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  isBold?: boolean;
}

function CoopNumericInput({
  value,
  onChange,
  className = "",
  placeholder = "0.00",
  isBold = false
}: CoopNumericInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isFocused) {
      setInputValue(value === 0 ? "" : value.toString());
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setInputValue(value === 0 ? "" : value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = inputValue.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    const finalVal = isNaN(parsed) ? 0 : parsed;
    onChange(finalVal);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (/^[0-9.,-]*$/.test(rawValue)) {
      setInputValue(rawValue);
      const cleaned = rawValue.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        onChange(parsed);
      } else {
        onChange(0);
      }
    }
  };

  const displayValue = isFocused
    ? inputValue
    : (value === 0 ? "0.00" : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value));

  return (
    <input
      type="text"
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={`w-full bg-transparent text-right outline-none font-mono py-1 focus:bg-emerald-50 rounded px-1 transition-all ${value === 0 && !isFocused ? 'text-slate-300 font-normal' : className} ${isBold ? 'font-bold' : ''}`}
      placeholder={placeholder}
    />
  );
}

interface NameSelectorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

function NameSelector({ value, onChange, placeholder }: NameSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [poolNames, setPoolNames] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('inspector_pool');
    const pool = saved ? JSON.parse(saved) : [];
    const defaultPool = [
      'นางสาวเฉลิมรัตน์ ใจดี',
      'นายปรีดี ศรีเหมือนทอง',
      'นายเจษฎา พูลสุข',
      'นางสาวปรางทิพย์ เอียดเหตุ',
      'นายกิตติพิชญ์ ยอดเพชร',
      'นางสาวคณพิชญ์ ศรีสง่า'
    ];
    const names = pool.map((ins: any) => ins.name).filter(Boolean);
    const combined = Array.from(new Set([...names, ...defaultPool]));
    setPoolNames(combined);
  }, []);

  useEffect(() => {
    if (value) {
      if (poolNames.length > 0 && !poolNames.includes(value)) {
        setIsCustom(true);
        setCustomValue(value);
      } else {
        setIsCustom(false);
      }
    } else {
      setIsCustom(false);
    }
  }, [value, poolNames]);

  if (isCustom) {
    return (
      <div className="flex items-center gap-1 w-full justify-center">
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full text-center bg-transparent border-b border-dashed border-slate-300 outline-none font-bold text-slate-800 text-[11pt]"
        />
        <button
          onClick={() => {
            setIsCustom(false);
            onChange('');
          }}
          className="text-[10px] text-rose-500 hover:text-rose-700 font-sans font-bold no-print leading-none p-1"
          title="กลับไปเลือกชื่อหลัก"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '__custom__') {
          setIsCustom(true);
          setCustomValue('');
          onChange('');
        } else {
          onChange(val);
        }
      }}
      className="w-full text-center bg-transparent border-0 outline-none font-bold text-slate-800 text-[11pt] focus:bg-emerald-50 rounded cursor-pointer"
    >
      <option value="">-- เลือก --</option>
      {poolNames.map((name, idx) => (
        <option key={idx} value={name}>{name}</option>
      ))}
      <option value="__custom__">✍️ พิมพ์ชื่ออื่นๆ...</option>
    </select>
  );
}

export default function WorkingPaperGenerator({ 
  letters, 
  activeTabProp, 
  onTabChangeProp 
}: WorkingPaperGeneratorProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve'>('bank');
  
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;
  const setActiveTab = (tab: 'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve') => {
    if (onTabChangeProp) {
      onTabChangeProp(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [fileName, setFileName] = useState<string>('');
  const getDaysInMonthGlobal = (monthName: string): number => {
    if (!monthName) return 31;
    const name = monthName.trim();
    if (name.includes('คม')) return 31;
    if (name.includes('ยน')) return 30;
    if (name.includes('กุมภาพันธ์')) {
      const match = name.match(/\d+/);
      if (match) {
        const year = parseInt(match[0]);
        const westernYear = year > 2400 ? year - 543 : year;
        const isLeap = (westernYear % 4 === 0 && westernYear % 100 !== 0) || westernYear % 400 === 0;
        return isLeap ? 29 : 28;
      }
      return 28;
    }
    return 31;
  };
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isParsingTB, setIsParsingTB] = useState<boolean>(false);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const [tbAccounts, setTbAccounts] = useState<TBAccount[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ledgerFileName, setLedgerFileName] = useState<string>('');
  const [ledgerUploadStatus, setLedgerUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isParsingLedger, setIsParsingLedger] = useState<boolean>(false);
  const [ledgerParsedCount, setLedgerParsedCount] = useState<number>(0);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const ledgerInputRef = useRef<HTMLInputElement>(null);

  const [selectedCoopId, setSelectedCoopId] = useState<string>('ayutthaya-police');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [showIframeModal, setShowIframeModal] = useState<boolean>(false);
  const [isInIframe, setIsInIframe] = useState<boolean>(false);
  const [printScope, setPrintScope] = useState<'current' | 'all'>('current');
  const [activeInputId, setActiveInputId] = useState<string | null>(null);

  const getTabClass = (tabName: 'bank' | 'debtor' | 'deposit' | 'deposit_other' | 'loan' | 'share' | 'reserve') => {
    const isActive = activeTab === tabName;
    if (isActive) {
      return "block print:block page-break-after-always";
    } else {
      if (printScope === 'all') {
        return "hidden print:block page-break-after-always";
      } else {
        return "hidden";
      }
    }
  };

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  // Dynamic spacing & styling state for all working paper tables
  const [tableStyles, setTableStyles] = useState({
    rowHeight: 6,       // padding-y in px
    cellPaddingX: 8,    // padding-x in px
    fontSize: 11,       // font-size in pt
  });

  const cellStyle = {
    paddingTop: `${tableStyles.rowHeight}px`,
    paddingBottom: `${tableStyles.rowHeight}px`,
    paddingLeft: `${tableStyles.cellPaddingX}px`,
    paddingRight: `${tableStyles.cellPaddingX}px`,
    fontSize: `${tableStyles.fontSize}pt`,
  };

  const fileInputConfigRef = useRef<HTMLInputElement>(null);

  const handleExportConfig = () => {
    const config = {
      bankData,
      debtorData,
      depositData,
      depositOtherData,
      loanData,
      shareData,
      reserveData,
      tableStyles,
      tbAccounts
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    const coopName = bankData.cooperativeName || 'สหกรณ์';
    const month = bankData.inspectMonth || 'พฤษภาคม_2569';
    downloadAnchor.setAttribute('download', `ต้นฉบับ_กระดาษทำการ_${coopName.replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.bankData) setBankData(parsed.bankData);
        if (parsed.debtorData) setDebtorData(parsed.debtorData);
        if (parsed.depositData) setDepositData(parsed.depositData);
        if (parsed.depositOtherData) setDepositOtherData(parsed.depositOtherData);
        if (parsed.loanData) setLoanData(parsed.loanData);
        if (parsed.shareData) setShareData(parsed.shareData);
        if (parsed.reserveData) setReserveData(parsed.reserveData);
        if (parsed.tableStyles) setTableStyles(parsed.tableStyles);
        if (parsed.tbAccounts) setTbAccounts(parsed.tbAccounts);
        
        setSelectedCoopId('imported');
        alert('นำเข้าไฟล์ต้นฉบับเสร็จสมบูรณ์!');
      } catch (err) {
        alert('การนำเข้าไฟล์ล้มเหลว กรุณาตรวจสอบไฟล์ต้นฉบับว่าเป็นไฟล์กระดาษทำการที่ถูกต้องหรือไม่');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handlePrint = () => {
    if (isInIframe) {
      setShowIframeModal(true);
    } else {
      window.print();
    }
  };

  // Helper functions for dynamic row management
  const addSavingRow = () => {
    setBankData(prev => ({
      ...prev,
      savings: [
        ...prev.savings,
        { id: Date.now().toString(), bank: 'ธนาคารกรุงไทย', branch: 'สาขาใหม่', accountNo: 'xxx-x-xxxxx-x', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
      ]
    }));
  };

  const deleteSavingRow = (id: string) => {
    setBankData(prev => ({
      ...prev,
      savings: prev.savings.filter(item => item.id !== id)
    }));
  };

  const addCurrentRow = () => {
    setBankData(prev => ({
      ...prev,
      currents: [
        ...prev.currents,
        { id: Date.now().toString(), bank: 'ธนาคารกรุงไทย', branch: 'สาขาใหม่', accountNo: 'xxx-x-xxxxx-x', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
      ]
    }));
  };

  const deleteCurrentRow = (id: string) => {
    setBankData(prev => ({
      ...prev,
      currents: prev.currents.filter(item => item.id !== id)
    }));
  };

  const addCoopRow = () => {
    setBankData(prev => ({
      ...prev,
      coops: [
        ...prev.coops,
        { id: Date.now().toString(), name: 'เงินฝากชุมนุมใหม่', rate: '-', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
      ]
    }));
  };

  const deleteCoopRow = (id: string) => {
    setBankData(prev => ({
      ...prev,
      coops: prev.coops.filter(item => item.id !== id)
    }));
  };

  const addReserveRow = () => {
    setReserveData(prev => ({
      ...prev,
      rows: [
        ...prev.rows,
        { code: '33xxx', name: 'ทุนใหม่', begBal: 0, addAmt: 0, decAmt: 0, endBal: 0, remarks: '' }
      ]
    }));
  };

  const deleteReserveRow = (idx: number) => {
    setReserveData(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== idx)
    }));
  };



  // 1. Storage for editable data of all 5 working papers
  // BANK DEPOSITS WORKING PAPER STATE
  const [bankData, setBankData] = useState({
    cooperativeName: '',
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    
    // Savings rows
    savings: [
      { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101', bookBalance: 84855098.98, bankBalance: 0, glAccount: '11131', remarks: '' },
      { id: '2', bank: 'ธนาคารธอส.', branch: 'พระนครศรีอยุธยา', accountNo: '100', bookBalance: 1996023.70, bankBalance: 0, glAccount: '11132', remarks: '' },
      { id: '3', bank: 'ธนาคาร ธกส.', branch: 'สายเอเชีย', accountNo: 'xxx', bookBalance: 18500.00, bankBalance: 0, glAccount: '11135', remarks: '' }
    ],
    // Current rows
    currents: [
      { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101-6', bookBalance: -5796.00, bankBalance: 0, glAccount: '11121', remarks: '' },
      { id: '2', bank: 'ธนาคาร ธส.', branch: 'พระนครศรีอยุธยา', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
    ],
    // Other coops rows
    coops: [
      { id: '1', name: 'เงินฝากชุมนุมสอ.ตำรวจแห่งชาติ', rate: '-', accountNo: '-', bookBalance: 1581875.73, bankBalance: 0, glAccount: '11210', remarks: '' },
      { id: '2', name: 'เงินฝาก ชสอ.รุ่นสถาพร(2.35ตัวสัญญาใช้เงิน)', rate: '2.35', accountNo: '-', bookBalance: 3658596.71, bankBalance: 0, glAccount: '11212', remarks: '' },
      { id: '3', name: 'เงินฝาก ชสอ.รุ่นสถาพร2 (2.75ตัวสัญญาใช้เงิน)', rate: '2.75', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '11213', remarks: '' },
      { id: '4', name: 'เงินฝาก ชสอ.รุ่นสถาพร3 (สัญญาอื่นๆ)', rate: '-', accountNo: '-', bookBalance: 3658596.72, bankBalance: 0, glAccount: '11214', remarks: '' }
    ],
    // Checks & conclusions
    methods: [
      { checked: true, text: 'ตรวจใบแจ้งยอดเงินฝากธนาคารและสมุดคู่ฝากเปรียบเทียบกับยอดคงเหลือตามบัญชีแยกประเภท' },
      { checked: true, text: 'ตรวจสอบทะเบียนจ่ายเช็ค เปรียบเทียบกับต้นขั้วเช็ค เพื่อดูจำนวนเงิน การอนุมัติจ่าย การลงชื่อรับเงิน การเรียงเลขที่เช็ค การยกเลิกเช็ค' },
      { checked: true, text: 'ตรวจสอบงบกระทบยอดเงินฝากธนาคารที่สหกรณ์จัดทำขึ้นเมื่อเกิดผลต่างระหว่างบัญชีกับหลักฐานของธนาคาร' },
      { checked: true, text: 'ตรวจสอบการอนุมัติจ่ายเงินฝากธนาคาร' }
    ],
    marks: [
      { checked: true, text: 'ทดสอบการคำนวณในแนวตั้ง' },
      { checked: true, text: 'ทดสอบการคำนวณในแนวนอน' },
      { checked: true, text: 'ตรวจสอบยอดคงเหลือตามบัญชีเปรียบเทียบกับบัญชีแยกประเภท' },
      { checked: true, text: 'ตรวจสอบยอดคงเหลือตามบัญชีเปรียบเทียบกับสมุดบัญชีธนาคาร ใบแจ้งยอดเงินฝากธนาคาร งบพิสูจน์ยอดเงินฝาก' }
    ],
    conclusionNotes: 'ยอดเงินฝากธนาคารและสมุดคู่ฝากเปรียบเทียบกับยอดคงเหลือตามบัญชีแยกประเภท ถูกต้องตรงกัน',
    conclusionStatus: {
      item1: true, // ยอดตรงกับหลักฐาน
      item2: true, // อนุมัติโดยผู้มีอำนาจ
      item3: true, // ลงลายมือชื่อตรงกับต้นขั้ว
      item4: true, // รับจ่ายเป็นไปตามระเบียบ
      item5: true, // ผ่านรายการถูกต้อง
      item6: true  // จัดทำงบกระทบยอด
    }
  });

  // ACCOUNTS RECEIVABLE WORKING PAPER STATE
  const [debtorData, setDebtorData] = useState({
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    regularGlAccount: '11533',
    specialGlAccount: '113*',
    emergencyGlAccount: '11531 + 11538',
    otherGlAccount: '11556 + 11567 + 11568 + 11580',
    hideGlAccountLine: false,
    
    // Core summary table values
    rows: {
      regular: { name: 'สามัญ', begBal: 2191019318.54, addAmt: 0.00, trxDebit: 12150000.00, otherAddAmt: 12150000.00, addQty: '8', decAmt: 22762402.66, endBal: 2180406915.88, endQty: '1,529', summaryAmt: 2076915004.36, difference: 103491911.52, comment: '' },
      special: { name: 'พิเศษ', begBal: 1276519051.85, addAmt: 0.00, trxDebit: 9130000.00, otherAddAmt: 9130000.00, addQty: '11', decAmt: 8558702.04, endBal: 1277090349.81, endQty: '1,337', summaryAmt: 1298929689.28, difference: -21839339.47, comment: '' },
      emergency: { name: 'ฉุกเฉิน', begBal: 29551867.98, addAmt: 0.00, trxDebit: 6770500.00, otherAddAmt: 6770500.00, addQty: '129', decAmt: 5001720.52, endBal: 31320647.46, endQty: '1,205', summaryAmt: 126752785.64, difference: -95432138.18, comment: '' },
      other: { name: 'ลูกหนี้อื่น (ดำเนินคดี,ตามคำพิพากษา)', begBal: 13883330.47, addAmt: 0.00, trxDebit: 0.00, otherAddAmt: 0.00, addQty: '-', decAmt: 103764.34, endBal: 13779566.13, endQty: '-', summaryAmt: 0, difference: 13779566.13, comment: '' }
    },
    memberCounts: {
      regular: '2,289.00',
      emergency: '104.00',
      special: '1,337.00',
      otherDebtor: '0.00',
      total: '3,730'
    },
    methods: [
      { checked: true, text: 'ตรวจสรุปยอดคงเหลือกับบัญชีแยกประเภทและสุ่มตรวจสรุปยอดคงเหลือกับ การ์ดรายตัวสมาชิก' },
      { checked: true, text: 'ตรวจรายงานการจ่ายเงินกู้เปรียบเทียบกับสัญญาเงินกู้โดยการสุ่มและตรวจสอบการผ่านรายการลูกหนี้เงินกู้ในบัญชีแยกประเภท' },
      { checked: true, text: 'ตรวจสอบงบหน้าเรียกเก็บเงินประจำเดือน เปรียบเทียบกับรายงานการยกเลิกใบเสร็จ ตรวจสอบการชำระหนี้รายวันและรายงานการหักกลบหนี้โดยการกู้สัญญาใหม่' },
      { checked: true, text: 'ทดสอบการคำนวณดอกเบี้ยเงินให้กู้ในการ์ดรายตัวสมาชิกเปรียบเทียบกับรายงานงบหน้าเก็บเงินที่เรียกเก็บจากสมาชิก' },
      { checked: true, text: 'ตรวจสอบการผ่านรายการลูกหนี้เงินกู้ และดอกเบี้ยรับ การผ่านรายการไปบัญชีแยกประเภท' }
    ],
    conclusions: [
      { checked: true, text: 'ยอดคงเหลือในบัญชีแยกประเภทถูกต้องตรงกันกับทะเบียนลูกหนี้รายตัวสมาชิก (สอ.4) ทุกประการ' },
      { checked: true, text: 'การจ่ายเงินกู้และการจัดทำหนังสือสัญญาเงินกู้มีเอกสารหลักฐานครบถ้วนและผ่านการอนุมัติโดยผู้มีอำนาจ' },
      { checked: true, text: 'การรับชำระคืนต้นเงินกู้และดอกเบี้ยรับมีความถูกต้องเป็นไปตามสัญญาและระเบียบของสหกรณ์' },
      { checked: true, text: 'มีการจัดส่งหนังสือยืนยันยอดเงินกู้คงเหลือของสมาชิกและสรุปผลการตอบรับได้อย่างถูกต้อง' },
      { checked: true, text: 'การตั้งค่าเผื่อหนี้สงสัยจะสูญและการจัดชั้นหนี้เป็นไปตามเกณฑ์ที่กฎหมายและนายทะเบียนกำหนด' }
    ],
    conclusionStatus: {
      item1: true, // ทุนตรงตามยอด
      item2: true, // ค่าธรรมเนียมแรกเข้าสัมพันธ์
      item3: true, // อนุมัติโดยกรรมการ
      item4: true  // บันทึกบัญชีถูกต้อง
    },
    conclusionNotes: 'การบันทึกบัญชีลูกหนี้และดอกเบี้ยรับเป็นไปตามมาตรฐานการบัญชีและระเบียบที่เกี่ยวข้อง สุ่มตรวจพบว่าถูกต้องตรงกันในสาระสำคัญ'
  });

  // Computed debtor total member counts (regular + emergency + special + otherDebtor)
  const computedTotal = (() => {
    const reg = parseFloat((debtorData.memberCounts.regular || '').replace(/,/g, '')) || 0;
    const emer = parseFloat((debtorData.memberCounts.emergency || '').replace(/,/g, '')) || 0;
    const spec = parseFloat((debtorData.memberCounts.special !== undefined ? debtorData.memberCounts.special : '1,337.00').replace(/,/g, '')) || 0;
    const other = parseFloat((debtorData.memberCounts.otherDebtor !== undefined ? debtorData.memberCounts.otherDebtor : '0.00').replace(/,/g, '')) || 0;
    const sum = reg + emer + spec + other;
    
    // Check if any input has a decimal point to decide if we should format with decimals
    const hasDecimals = (debtorData.memberCounts.regular || '').includes('.') || 
                        (debtorData.memberCounts.emergency || '').includes('.') || 
                        (debtorData.memberCounts.special !== undefined ? debtorData.memberCounts.special : '1,337.00').includes('.') ||
                        (debtorData.memberCounts.otherDebtor !== undefined ? debtorData.memberCounts.otherDebtor : '0.00').includes('.');
                        
    if (hasDecimals) {
      return sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return sum.toLocaleString('en-US');
  })();

  // DEPOSITS RECEIVED WORKING PAPER STATE
  const [depositData, setDepositData] = useState({
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    auditorDate: '',
    reviewerDate: '',
    savingsGlAccount: '21410',
    savingDayGlAccount: '21414',
    hideGlAccountLine: false,
    
    // Core table values
    rows: {
      savings: { name: 'ออมทรัพย์', begBal: 271921548.87, addAmt: 8402707.17, otherAddAmt: 0, decAmt: 5246013.16, endBal: 275078242.88, qty: '2,293', mQty: '2,291', summaryAmt: 275078241.88, difference: 1.00, comment: '**บัญชีเงินฝาก บ.ไทยประกันชีวิต' },
      savingDay: { name: 'โครงการวันออม ปี2569', begBal: 141000.00, addAmt: 28000.00, otherAddAmt: 0, decAmt: 0.00, endBal: 169000.00, qty: '12', mQty: '12', summaryAmt: 169000.00, difference: 0.00, comment: 'ขาดการติดต่อ ไม่มีรายการเคลื่อนไหวตั้งแต่ปี2561' }
    },
    totalQty: '2,305',
    methods: [
      { checked: true, text: 'ตรวจสอบการรับเงิน รวมทั้งการเปิดบัญชีเงินรับฝากว่าปฎิบัติตามระเบียบหรือไม่' },
      { checked: true, text: 'ตรวจสอบการจ่ายคืนเงินฝาก และการคำนวณดอกเบี้ยจ่ายว่าเป็นไปตามระเบียบหรือไม่' },
      { checked: true, text: 'ตรวจสอบการบันทึกบัญชีและการผ่านรายการไปสมุดรวมบัญชีทั่วไปและบัญชีย่อย' },
      { checked: true, text: 'ตรวจสอบยอดรวมของรายละเอียดบัญชีแยกประเภทเงินรับฝากเปรียบเทียบกับยอดคงเหลือในสรุปยอดคงเหลือเงินรับฝาก' },
      { checked: true, text: 'ตรวจสอบยอดคงเหลือเงินรับฝากรายตัวเปรียบเทียบกับสรุปยอดคงเหลือเงินรับฝากรายตัว' }
    ],
    conclusionStatus: {
      item1: true, // ฝากถอนมีการอนุมัติ
      item2: true, // ดอกเบี้ยคิดถูกต้อง
      item3: true, // การบันทึกในการ์ดถูกต้องและปัจจุบัน
      item4: true  // ยอดคงเหลือถูกต้องตรงกัน
    },
    conclusionNotes: 'ยอดรวมของบัญชีแยกประเภทเงินรับฝากเปรียบเทียบกับยอดคงเหลือในสรุปยอดคงเหลือเงินรับฝาก ถูกต้องตรงกัน'
  });

  // SHARE CAPITAL WORKING PAPER STATE
  const [shareData, setShareData] = useState({
    cooperativeName: '',
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    hideGlAccount: false,

    // GL Accounts
    begBalGlAccount: '31000',
    newMemberGlAccount: '',
    entranceFeeGlAccount: '42050',
    otherAdditionsGlAccount: '31000',
    resignedAmtGlAccount: '31000',

    // Capital values
    begBal: 1256997840.00,
    newMemberAmt: 0.00,
    newMemberQty: '11.00',
    entranceFee: 1100.00,
    entranceFeePerPerson: 100.00,
    otherAdditions: 4316790.00,
    resignedAmt: 3285160.00,
    resignedQty: '-',
    endBal: 1258029470.00,
    
    // Additional details texts
    begBalDetails: 'ยอดยกมาจากงวดก่อน',
    entranceFeeDetails: 'ค่าธรรมเนียมแรกเข้ารับจริง',
    otherAdditionsDetails: 'รายการรับชำระค่าหุ้นรายเดือน',
    
    // Summary comparison values
    summaryAmt: 1258029470.00,
    difference: 0.00,
    
    members: {
      general: '2,289.00',
      associate: '104.00',
      total: '2,393'
    },
    begMembersGeneral: 2280,
    begMembersAssociate: 103,
    newMembersGeneral: 10,
    newMembersAssociate: 1,
    resignedMembersGeneral: 1,
    resignedMembersAssociate: 0,
    methods: [
      { checked: true, text: 'ตรวจสรุปยอดคงเหลือกับบัญชีแยกประเภทและสุ่มตรวจสรุปยอดคงเหลือกับ การ์ดรายตัวสมาชิก' },
      { checked: true, text: 'ตรวจรายงานสมาชิกเข้าใหม่-ลาออก และการอนุมัติ' },
      { checked: true, text: 'เปรียบเทียบค่าธรรมเนียมแรกเข้ากับจำนวนสมาชิกเข้าใหม่ระหว่างปี' },
      { checked: true, text: 'ตรวจสอบการผ่านรายการทุนเรือนหุ้น และการผ่านรายการไปบัญชีแยกประเภท' }
    ],
    conclusionStatus: {
      item1: true, // ทุนตรงตามบัญชี
      item2: true, // ค่าธรรมเนียมแรกเข้าสัมพันธ์
      item3: true, // มีการอนุมัติโดยคณะกรรมการ
      item4: true  // ผ่านรายการไปบัญชีแยกประเภทถูกต้อง
    },
    conclusionNotes: 'ทุนเรือนหุ้นตามบัญชีตรงตามสรุปยอดคงเหลือ ณ วันเดียวกัน ค่าธรรมเนียมแรกเข้าจำนวน 1,100 บาท สัมพันธ์กับจำนวนสมาชิกเข้าใหม่จำนวน 11 คน สมาชิกเข้าใหม่-ลาออกมีการอนุมัติโดยคณะกรรมการ การผ่านรายการไปบัญชีแยกประเภทถูกต้อง'
  });

  // ACCUMULATED CAPITAL RESERVES WORKING PAPER STATE
  const [reserveData, setReserveData] = useState({
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    
    // Table rows
    rows: [
      { code: '33100', name: 'ทุนสาธารณประโยชน์', begBal: 465228.23, addAmt: 0.00, decAmt: 26000.00, endBal: 439228.23, remarks: '' },
      { code: '33300', name: 'ทุนรักษาระดับอัตราเงินปันผล', begBal: 1149922.03, addAmt: 0.00, decAmt: 0.00, endBal: 1149922.03, remarks: '' },
      { code: '33700', name: 'ทุนเพื่อการศึกษาอบรมทางสหกรณ์', begBal: 2309007.00, addAmt: 0.00, decAmt: 98895.00, endBal: 2210112.00, remarks: '' },
      { code: '34300', name: 'ทุนเพื่อจัดตั้งสำนักงาน', begBal: 6167271.40, addAmt: 0.00, decAmt: 0.00, endBal: 6167271.40, remarks: '' }
    ],
    methods: [
      { checked: true, text: 'ตรวจสอบกับกระดาษทำการปีก่อน' },
      { checked: true, text: 'ตรวจสอบการจัดสรรกำไรสุทธิเข้าทุนสะสมตามข้อบังคับฯตามมติที่ประชุมใหญ่ประจำปี' },
      { checked: true, text: 'ตรวจสอบการอนุมัติจ่ายทุนสะสมตามข้อบังคับฯ ตรวจสอบเอกสารประกอบการบันทึกบัญชี' }
    ],
    marks: [
      { checked: true, text: 'ตรวจสอบยอดคงเหลือเทียบกับกระดาษทำการปีก่อน' },
      { checked: true, text: 'ตรวจสอบการจัดสรรกำไรสุทธิเข้าทุนสะสม' },
      { checked: true, text: 'สุ่มตรวจสมุดบัญชีแยกประเภทกับ slip พร้อมการอนุมัติ' },
      { checked: true, text: 'ทดสอบการคำนวณในแนวตั้ง' }
    ],
    conclusionStatus: {
      item1: true, // การจ่ายทุนเป็นไปตามมติกรรมการ
      item2: true  // การบันทึกบัญชีมีเอกสารประกอบครบถ้วน ถูกต้อง
    },
    conclusionNotes: 'ตั้งแต่วันที่ 1 - 31 พฤษภาคม 2569 มีการจ่ายเงินทุนต่างๆ ดังนี้: ทุนสาธารณประโยชน์ 26,000.00 บาท, ทุนเพื่อการศึกษาอบรมฯ 98,895.00 บาท รวมทั้งสิ้น 124,895.00 บาท การจ่ายทุนเป็นไปตามมติคณะกรรมการ และบันทึกบัญชีถูกต้องมีเอกสารหลักฐานครบถ้วน'
  });

  // DEPOSITS FROM OTHER COOPERATIVES WORKING PAPER STATE (3.2)
  const [depositOtherData, setDepositOtherData] = useState({
    cooperativeName: '',
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    table1: [
      { id: '1', name: 'สอ.ม.พระจอมเกล้าธนบุรี(1)', rate: '3.25%', begBal: 30000000.00, addAmt: 0, interest: 77465.75, otherAdd: 0, closeAmt: 0, transInterest: 77465.75, endBal: 30000000.00, count: 1 },
      { id: '2', name: 'สอ.ไทยยาซากิและในเครือ(2)', rate: '3.20%', begBal: 100000000.00, addAmt: 0, interest: 254246.58, otherAdd: 0, closeAmt: 0, transInterest: 254246.58, endBal: 100000000.00, count: 1 },
      { id: '3', name: 'ชสอ.ภาคกลาง', rate: '3.00%', begBal: 30000000.00, addAmt: 0, interest: 71506.85, otherAdd: 0, closeAmt: 0, transInterest: 71506.85, endBal: 30000000.00, count: 1 },
      { id: '4', name: 'สอ.มหาวิทยาลัยสงขลานครินทร์', rate: '3.00%', begBal: 100000000.00, addAmt: 0, interest: 238356.16, otherAdd: 0, closeAmt: 0, transInterest: 238356.16, endBal: 100000000.00, count: 1 }
    ],
    table2: [
      { id: '1', name: 'สอ.ม.พระจอมเกล้าธนบุรี(2)', rate: '2.95%', begBal: 170000000.00, addAmt: 0, interest: 398452.05, otherAdd: 0, closeAmt: 0, transInterest: 398452.05, endBal: 170000000.00, count: 1 },
      { id: '2', name: 'สอ.ไทยยาซากิและในเครือ(3)', rate: '3.00%', begBal: 70000000.00, addAmt: 0, interest: 166849.31, otherAdd: 0, closeAmt: 0, transInterest: 166849.31, endBal: 70000000.00, count: 1 }
    ],
    methods: [
      { checked: true, text: 'ตรวจสอบการรับเงิน รวมทั้งการเปิดบัญชีเงินรับฝากว่าปฏิบัติตามระเบียบหรือไม่' },
      { checked: true, text: 'ตรวจสอบการจ่ายคืนเงินฝาก และการคำนวณดอกเบี้ยจ่ายว่าเป็นไปตามระเบียบหรือไม่' },
      { checked: true, text: 'ตรวจสอบการบันทึกบัญชีและการผ่านรายการไปสมุดรวมบัญชีทั่วไปและบัญชีย่อย' },
      { checked: true, text: 'ตรวจสอบยอดรวมของรายละเอียดบัญชีแยกประเภทเงินรับฝากเปรียบเทียบกับยอดคงเหลือในสรุปยอดคงเหลือเงินรับฝาก' },
      { checked: true, text: 'ตรวจสอบยอดคงเหลือเงินรับฝากรายตัวเปรียบเทียบกับสรุปยอดคงเหลือเงินรับฝากรายตัว' }
    ],
    conclusionNotes: 'ทดสอบดอกเบี้ยจ่ายเงินรับฝากสหกรณ์ ถูกต้อง\nดอกเบี้ยจ่ายเดือนพฤษภาคม 1,206,876.70 บาท'
  });

  // BORROWINGS WORKING PAPER STATE (3.3)
  const [loanData, setLoanData] = useState({
    cooperativeName: '',
    inspectMonth: 'พฤษภาคม 2569',
    inspectDateText: 'เข้าตรวจวท. 8 มิ.ย.69',
    reviewDateText: 'เข้าตรวจวท. 10 มิ.ย.69',
    periodText: '1 พฤษภาคม 2569 ถึง 31 พฤษภาคม 2569',
    auditorName: '',
    reviewerName: '',
    showAccountCode: true,
    showCalcInterest: true,
    showDiffInterest: true,
    calcDays: '',
    calcDivisor: '',
    table1: [
      { id: '1', name: 'สอ.ม.พระจอมเกล้าธนบุรี(1)', code: '221100', rate: '3.25%', begBal: 30000000.00, addAmt: 0, interest: 77465.75, otherAdd: 0, closeAmt: 0, transInterest: 77465.75, endBal: 30000000.00, count: 1 },
      { id: '2', name: 'สอ.ไทยยาซากิและในเครือ(2)', code: '221100', rate: '3.20%', begBal: 100000000.00, addAmt: 0, interest: 254246.58, otherAdd: 0, closeAmt: 0, transInterest: 254246.58, endBal: 100000000.00, count: 1 },
      { id: '3', name: 'ชสอ.ภาคกลาง', code: '221100', rate: '3.00%', begBal: 30000000.00, addAmt: 0, interest: 71506.85, otherAdd: 0, closeAmt: 0, transInterest: 71506.85, endBal: 30000000.00, count: 1 },
      { id: '4', name: 'สอ.มหาวิทยาลัยสงขลานครินทร์', code: '221100', rate: '3.00%', begBal: 100000000.00, addAmt: 0, interest: 238356.16, otherAdd: 0, closeAmt: 0, transInterest: 238356.16, endBal: 100000000.00, count: 1 }
    ],
    table2: [
      { id: '1', name: 'สอ.ม.พระจอมเกล้าธนบุรี(2)', code: '221200', rate: '2.95%', begBal: 170000000.00, addAmt: 0, interest: 398452.05, otherAdd: 0, closeAmt: 0, transInterest: 398452.05, endBal: 170000000.00, count: 1 },
      { id: '2', name: 'สอ.ไทยยาซากิและในเครือ(3)', code: '221200', rate: '3.00%', begBal: 70000000.00, addAmt: 0, interest: 166849.31, otherAdd: 0, closeAmt: 0, transInterest: 166849.31, endBal: 70000000.00, count: 1 }
    ],
    methods: [
      { checked: true, text: 'ตรวจสอบการกู้ยืมเงิน รวมทั้งเงื่อนไขในสัญญาเงินกู้ยืมว่าปฏิบัติตามระเบียบและกฎหมายหรือไม่' },
      { checked: true, text: 'ตรวจสอบการชำระคืนเงินกู้ยืม และการคำนวณดอกเบี้ยจ่ายว่าเป็นไปตามสัญญาหรือไม่' },
      { checked: true, text: 'ตรวจสอบการบันทึกบัญชีและการผ่านรายการไปสมุดแยกประเภททั่วไปและบัญชีย่อย' },
      { checked: true, text: 'ตรวจสอบสัญญากู้ยืมเงิน และมติคณะกรรมการอนุมัติเงินกู้ยืม' }
    ],
    conclusionNotes: 'ทดสอบดอกเบี้ยจ่ายเงินกู้ยืม ถูกต้อง\nดอกเบี้ยจ่ายเดือนพฤษภาคม 1,206,876.70 บาท'
  });

  // Synchronize selected cooperative schedule details to all 5 working papers with localStorage support
  useEffect(() => {
    // Try to load from localStorage first for this coop
    const saved = localStorage.getItem(`wp_state_${selectedCoopId}`);
    
    const coopList = letters || INITIAL_LETTERS;
    const coop = selectedCoopId !== 'imported' ? (coopList.find(c => c.id === selectedCoopId) || coopList[0]) : null;
    
    let dateText = '';
    let orgName = '';
    let inspectionMonth = '';
    let inspectionPeriod = '';
    
    if (coop) {
      const firstDay = getFirstInspectionDate(coop.inspectionDatesText);
      dateText = firstDay ? `${firstDay}` : coop.inspectionDatesText;
      orgName = coop.orgName;
      inspectionMonth = coop.inspectionMonth;
      inspectionPeriod = coop.inspectionPeriod;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.bankData) {
          setBankData({
            ...parsed.bankData,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.debtorData) {
          // Sanitizer for debtor methods to ensure it has the correct 5 debtor methods instead of share capital ones
          const correctDebtorMethods = [
            'ตรวจสรุปยอดคงเหลือกับบัญชีแยกประเภทและสุ่มตรวจสรุปยอดคงเหลือกับ การ์ดรายตัวสมาชิก',
            'ตรวจรายงานการจ่ายเงินกู้เปรียบเทียบกับสัญญาเงินกู้โดยการสุ่มและตรวจสอบการผ่านรายการลูกหนี้เงินกู้ในบัญชีแยกประเภท',
            'ตรวจสอบงบหน้าเรียกเก็บเงินประจำเดือน เปรียบเทียบกับรายงานการยกเลิกใบเสร็จ ตรวจสอบการชำระหนี้รายวันและรายงานการหักกลบหนี้โดยการกู้สัญญาใหม่',
            'ทดสอบการคำนวณดอกเบี้ยเงินให้กู้ในการ์ดรายตัวสมาชิกเปรียบเทียบกับรายงานงบหน้าเก็บเงินที่เรียกเก็บจากสมาชิก',
            'ตรวจสอบการผ่านรายการลูกหนี้เงินกู้ และดอกเบี้ยรับ การผ่านรายการไปบัญชีแยกประเภท'
          ];
          
          let sanitizedMethods = parsed.debtorData.methods;
          if (!sanitizedMethods || sanitizedMethods.length !== 5 || sanitizedMethods.some((m: any) => m.text.includes('ทุนเรือนหุ้น') || m.text.includes('สมาชิกเข้าใหม่-ลาออก'))) {
            sanitizedMethods = correctDebtorMethods.map(txt => {
              const existing = parsed.debtorData.methods?.find((m: any) => m.text === txt);
              return { checked: existing ? existing.checked : true, text: txt };
            });
          }

          setDebtorData({
            ...parsed.debtorData,
            memberCounts: {
              regular: parsed.debtorData.memberCounts?.regular || '2,289.00',
              emergency: parsed.debtorData.memberCounts?.emergency || '104.00',
              special: parsed.debtorData.memberCounts?.special || '1,337.00',
              otherDebtor: parsed.debtorData.memberCounts?.otherDebtor || '0.00',
              total: parsed.debtorData.memberCounts?.total || '3,730',
            },
            methods: sanitizedMethods,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.depositData) {
          setDepositData({
            ...parsed.depositData,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.depositOtherData) {
          setDepositOtherData({
            ...parsed.depositOtherData,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.loanData) {
          const correctLoanMethods = [
            'ตรวจสอบการกู้ยืมเงิน รวมทั้งเงื่อนไขในสัญญาเงินกู้ยืมว่าปฏิบัติตามระเบียบและกฎหมายหรือไม่',
            'ตรวจสอบการชำระคืนเงินกู้ยืม และการคำนวณดอกเบี้ยจ่ายว่าเป็นไปตามสัญญาหรือไม่',
            'ตรวจสอบการบันทึกบัญชีและการผ่านรายการไปสมุดแยกประเภททั่วไปและบัญชีย่อย',
            'ตรวจสอบสัญญากู้ยืมเงิน และมติคณะกรรมการอนุมัติเงินกู้ยืม'
          ];
          
          let sanitizedMethods = parsed.loanData.methods;
          if (!sanitizedMethods || sanitizedMethods.length !== 4 || sanitizedMethods.some((m: any) => m.text.includes('ยอดรวมของรายละเอียดบัญชีแยกประเภทเงินกู้ยืม') || m.text.includes('หนังสือยืนยันยอดเงินกู้ยืม'))) {
            sanitizedMethods = correctLoanMethods.map(txt => {
              const existing = parsed.loanData.methods?.find((m: any) => {
                if (txt === 'ตรวจสอบสัญญากู้ยืมเงิน และมติคณะกรรมการอนุมัติเงินกู้ยืม') {
                  return m.text.includes('ตรวจสอบสัญญากู้ยืมเงิน มติคณะกรรมการอนุมัติ') || m.text.includes('และหนังสือยืนยันยอดเงินกู้ยืม');
                }
                return m.text === txt;
              });
              return { checked: existing ? existing.checked : true, text: txt };
            });
          }

          setLoanData({
            ...parsed.loanData,
            methods: sanitizedMethods,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.shareData) {
          setShareData({
            ...parsed.shareData,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.reserveData) {
          setReserveData({
            ...parsed.reserveData,
            ...(coop ? {
              cooperativeName: orgName,
              inspectMonth: inspectionMonth,
              inspectDateText: dateText,
              reviewDateText: getReviewDateText(dateText),
              periodText: inspectionPeriod
            } : {})
          });
        }
        if (parsed.tableStyles) setTableStyles(parsed.tableStyles);
        if (parsed.tbAccounts) setTbAccounts(parsed.tbAccounts);
        else setTbAccounts([]);
        
        // Update last saved time indicator
        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSaved(timeStr);
        return; // Skip default initialization
      } catch (err) {
        console.error('Failed to parse saved wp_state', err);
      }
    }

    setTbAccounts([]); // Clear when switching to a coop with no saved state
    if (selectedCoopId === 'imported') return;

    if (!coop) return;

    setBankData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
      savings: [
        { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101', bookBalance: 84855098.98, bankBalance: 0, glAccount: '11131', remarks: '' },
        { id: '2', bank: 'ธนาคารธอส.', branch: 'พระนครศรีอยุธยา', accountNo: '100', bookBalance: 1996023.70, bankBalance: 0, glAccount: '11132', remarks: '' },
        { id: '3', bank: 'ธนาคาร ธกส.', branch: 'สายเอเชีย', accountNo: 'xxx', bookBalance: 18500.00, bankBalance: 0, glAccount: '11135', remarks: '' }
      ],
      currents: [
        { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101-6', bookBalance: -5796.00, bankBalance: 0, glAccount: '11121', remarks: '' },
        { id: '2', bank: 'ธนาคาร ธส.', branch: 'พระนครศรีอยุธยา', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
      ],
      coops: [
        { id: '1', name: 'เงินฝากชุมนุมสอ.ตำรวจแห่งชาติ', rate: '-', accountNo: '-', bookBalance: 1581875.73, bankBalance: 0, glAccount: '11210', remarks: '' },
        { id: '2', name: 'เงินฝาก ชสอ.รุ่นสถาพร(2.35ตัวสัญญาใช้เงิน)', rate: '2.35', accountNo: '-', bookBalance: 3658596.71, bankBalance: 0, glAccount: '11212', remarks: '' },
        { id: '3', name: 'เงินฝาก ชสอ.รุ่นสถาพร2 (2.75ตัวสัญญาใช้เงิน)', rate: '2.75', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '11213', remarks: '' },
        { id: '4', name: 'เงินฝาก ชสอ.รุ่นสถาพร3 (สัญญาอื่นๆ)', rate: '-', accountNo: '-', bookBalance: 3658596.72, bankBalance: 0, glAccount: '11214', remarks: '' }
      ],
      conclusionNotes: 'ยอดเงินฝากธนาคารและสมุดคู่ฝากเปรียบเทียบกับยอดคงเหลือตามบัญชีแยกประเภท ถูกต้องตรงกัน',
    }));

    setDebtorData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
      rows: {
        regular: { name: 'สามัญ', begBal: 2191019318.54, addAmt: 12150000.00, addQty: '8', decAmt: 22762402.66, endBal: 2180406915.88, endQty: '1,529', summaryAmt: 2076915004.36, difference: 103491911.52, comment: '' },
        special: { name: 'พิเศษ', begBal: 1276519051.85, addAmt: 9130000.00, addQty: '11', decAmt: 8558702.04, endBal: 1277090349.81, endQty: '1,337', summaryAmt: 1298929689.28, difference: -21839339.47, comment: '' },
        emergency: { name: 'ฉุกเฉิน', begBal: 29551867.98, addAmt: 6770500.00, addQty: '129', decAmt: 5001720.52, endBal: 31320647.46, endQty: '1,205', summaryAmt: 126752785.64, difference: -95432138.18, comment: '' },
        other: { name: 'ลูกหนี้อื่น (ดำเนินคดี,ตามคำพิพากษา)', begBal: 13883330.47, addAmt: 0.00, addQty: '-', decAmt: 103764.34, endBal: 13779566.13, endQty: '-', summaryAmt: 0, difference: 13779566.13, comment: '' }
      },
    }));

    setDepositData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
      auditorDate: '',
      reviewerDate: '',
      savingsGlAccount: prev.savingsGlAccount || '21410',
      savingDayGlAccount: prev.savingDayGlAccount || '21414',
      rows: {
        savings: { name: 'ออมทรัพย์', begBal: 271921548.87, addAmt: 8402707.17, otherAddAmt: 0, decAmt: 5246013.16, endBal: 275078242.88, qty: '2,293', mQty: '2,291', summaryAmt: 275078241.88, difference: 1.00, comment: '**บัญชีเงินฝาก บ.ไทยประกันชีวิต' },
        savingDay: { name: 'โครงการวันออม ปี2569', begBal: 141000.00, addAmt: 28000.00, otherAddAmt: 0, decAmt: 0.00, endBal: 169000.00, qty: '12', mQty: '12', summaryAmt: 169000.00, difference: 0.00, comment: 'ขาดการติดต่อ ไม่มีรายการเคลื่อนไหวตั้งแต่ปี2561' }
      },
    }));

    setShareData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
      begBalGlAccount: prev.begBalGlAccount || '31000',
      newMemberGlAccount: prev.newMemberGlAccount || '',
      entranceFeeGlAccount: prev.entranceFeeGlAccount || '42050',
      otherAdditionsGlAccount: prev.otherAdditionsGlAccount || '31000',
      resignedAmtGlAccount: prev.resignedAmtGlAccount || '31000',
      begBal: 1256997840.00,
      newMemberAmt: 0.00,
      newMemberQty: '11.00',
      entranceFee: 1100.00,
      entranceFeePerPerson: prev.entranceFeePerPerson || 100.00,
      otherAdditions: 4316790.00,
      resignedAmt: 3285160.00,
      resignedQty: '-',
      endBal: 1258029470.00,
      begBalDetails: prev.begBalDetails || 'ยอดยกมาจากงวดก่อน',
      entranceFeeDetails: prev.entranceFeeDetails || 'ค่าธรรมเนียมแรกเข้ารับจริง',
      otherAdditionsDetails: prev.otherAdditionsDetails || 'รายการรับชำระค่าหุ้นรายเดือน',
      begMembersGeneral: 2280,
      begMembersAssociate: 103,
      newMembersGeneral: 10,
      newMembersAssociate: 1,
      resignedMembersGeneral: 1,
      resignedMembersAssociate: 0,
    }));

    setDepositOtherData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
    }));

    setLoanData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
    }));

    setReserveData(prev => ({
      ...prev,
      cooperativeName: coop.orgName,
      inspectMonth: coop.inspectionMonth,
      inspectDateText: dateText,
      reviewDateText: getReviewDateText(dateText),
      periodText: coop.inspectionPeriod,
      auditorName: '',
      reviewerName: '',
      rows: [
        { code: '33100', name: 'ทุนสาธารณประโยชน์', begBal: 465228.23, addAmt: 0.00, decAmt: 26000.00, endBal: 439228.23, remarks: '' },
        { code: '33300', name: 'ทุนรักษาระดับอัตราเงินปันผล', begBal: 1149922.03, addAmt: 0.00, decAmt: 0.00, endBal: 1149922.03, remarks: '' },
        { code: '33700', name: 'ทุนเพื่อการศึกษาอบรมทางสหกรณ์', begBal: 2309007.00, addAmt: 0.00, decAmt: 98895.00, endBal: 2210112.00, remarks: '' },
        { code: '34300', name: 'ทุนเพื่อจัดตั้งสำนักงาน', begBal: 6167271.40, addAmt: 0.00, decAmt: 0.00, endBal: 6167271.40, remarks: '' }
      ],
    }));

    setLastSaved('');
  }, [selectedCoopId, letters]);

  // Debounced Autosave effect
  useEffect(() => {
    if (!bankData.cooperativeName) return;

    const timer = setTimeout(() => {
      const stateToSave = {
        bankData,
        debtorData,
        depositData,
        depositOtherData,
        loanData,
        shareData,
        reserveData,
        tableStyles,
        tbAccounts
      };
      localStorage.setItem(`wp_state_${selectedCoopId}`, JSON.stringify(stateToSave));
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSaved(timeStr);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedCoopId, bankData, debtorData, depositData, depositOtherData, loanData, shareData, reserveData, tableStyles, tbAccounts]);

  // ==========================================
  // DYNAMIC AUDIT CONCLUSION NOTE GENERATORS
  // ==========================================

  // 1. Bank Deposits Conclusion Note
  useEffect(() => {
    const sumSavingsBook = bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0);
    const sumSavingsBank = bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0);
    const sumCurrentsBook = bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0);
    const sumCurrentsBank = bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0);
    const sumCoopsBook = bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0);
    const sumCoopsBank = bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0);

    const totalBook = sumSavingsBook + sumCurrentsBook + sumCoopsBook;
    const totalBank = sumSavingsBank + sumCurrentsBank + sumCoopsBank;
    const totalDiff = totalBook - totalBank;

    const formattedBook = totalBook === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBook);
    const formattedBank = totalBank === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBank);
    const formattedDiff = totalDiff === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDiff);

    const generatedNote = `จากการตรวจสอบบัญชีเงินฝากธนาคารและเงินฝากสหกรณ์อื่น ณ วันสิ้นงวดของเดือน${bankData.inspectMonth || 'พฤษภาคม 2569'} เปรียบเทียบกับยอดคงเหลือในสมุดเงินฝาก ใบแจ้งยอดธนาคาร (Statement) และหนังสือยืนยันยอดเงินฝาก พบว่ามียอดคงเหลือตามบัญชีแยกประเภทรวมทั้งสิ้น ${formattedBook} บาท และมียอดเงินฝากตามหลักฐานธนาคาร/ใบแจ้งยอดรวม ${formattedBank} บาท โดยมียอดผลต่างรวมทั้งสิ้น ${formattedDiff} บาท บันทึกบัญชีครบถ้วนและได้รับการจัดทำงบกระทบยอดเงินฝากถูกต้องตามระเบียบ`;

    if (bankData.conclusionNotes !== generatedNote) {
      setBankData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    bankData.savings.map(s => `${s.bookBalance}-${s.bankBalance}`).join(','),
    bankData.currents.map(c => `${c.bookBalance}-${c.bankBalance}`).join(','),
    bankData.coops.map(cp => `${cp.bookBalance}-${cp.bankBalance}`).join(','),
    bankData.inspectMonth
  ]);

  // 2. Accounts Receivable Conclusion Note
  useEffect(() => {
    const regular = debtorData.rows.regular;
    const special = debtorData.rows.special;
    const emergency = debtorData.rows.emergency;
    const other = debtorData.rows.other;

    const totalBook = (regular?.endBal || 0) + (special?.endBal || 0) + (emergency?.endBal || 0) + (other?.endBal || 0);
    const totalList = (regular?.summaryAmt || 0) + (special?.summaryAmt || 0) + (emergency?.summaryAmt || 0) + (other?.summaryAmt || 0);
    const totalDiff = totalBook - totalList;

    const formattedBook = totalBook === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBook);
    const formattedList = totalList === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalList);
    const formattedDiff = totalDiff === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDiff);

    const formattedReg = regular?.endBal === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(regular?.endBal || 0);
    const formattedSpec = special?.endBal === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(special?.endBal || 0);
    const formattedEmerg = emergency?.endBal === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(emergency?.endBal || 0);

    const generatedNote = `จากการตรวจสอบรายละเอียดลูกหนี้เงินกู้ประเภทต่างๆ ณ วันสิ้นงวดของเดือน${debtorData.inspectMonth || 'พฤษภาคม 2569'} เปรียบเทียบระหว่างบัญชีแยกประเภทกับการ์ดลูกหนี้รายตัว มียอดลูกหนี้สามัญคงเหลือ ${formattedReg} บาท, ลูกหนี้พิเศษคงเหลือ ${formattedSpec} บาท, และลูกหนี้ฉุกเฉินคงเหลือ ${formattedEmerg} บาท มียอดลูกหนี้รวมตามบัญชีแยกประเภททั้งสิ้น ${formattedBook} บาท และยอดรวมตามสรุปรายตัวลูกหนี้ทั้งสิ้น ${formattedList} บาท ผลต่างรวมเท่ากับ ${formattedDiff} บาท การคำนวณดอกเบี้ยและการควบคุมบัญชีคุมลูกหนี้ถูกต้องตรงกันในสาระสำคัญ`;

    if (debtorData.conclusionNotes !== generatedNote) {
      setDebtorData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    JSON.stringify(debtorData.rows),
    debtorData.inspectMonth
  ]);

  // 3. Deposits Received Conclusion Note
  useEffect(() => {
    const generatedNote = `ยอดรวมของบัญชีแยกประเภทเงินรับฝากเปรียบเทียบกับยอดคงเหลือในสรุปยอดคงเหลือเงินรับฝาก ถูกต้องตรงกัน`;

    if (!depositData.conclusionNotes || depositData.conclusionNotes.startsWith('จากการตรวจสอบรายละเอียดเงินรับฝาก ณ วันสิ้นงวดของเดือน')) {
      setDepositData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    depositData.inspectMonth
  ]);

  // 4. Share Capital Conclusion Note
  useEffect(() => {
    const endBal = shareData.endBal;
    const summaryAmt = shareData.summaryAmt;
    const difference = shareData.difference;
    const entranceFee = shareData.entranceFee;
    const newMemberQty = shareData.newMemberQty;

    const formattedEndBal = endBal === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(endBal);
    const formattedSummary = summaryAmt === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summaryAmt);
    const formattedDiff = difference === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(difference);
    const formattedEntrance = entranceFee === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entranceFee);

    const generatedNote = `จากการตรวจสอบทุนเรือนหุ้น ณ วันสิ้นงวดของเดือน${shareData.inspectMonth || 'พฤษภาคม 2569'} เปรียบเทียบกับสรุปรายละเอียดหุ้นรายตัว มียอดคงเหลือตามบัญชีแยกประเภท ${formattedEndBal} บาท และยอดคงเหลือตามสรุปทะเบียนหุ้นรายตัว ${formattedSummary} บาท มียอดผลต่างรวม ${formattedDiff} บาท โดยมีค่าธรรมเนียมแรกเข้าสะสมสำหรับสมาชิกเข้าใหม่จำนวน ${formattedEntrance} บาท ซึ่งมีความสัมพันธ์สอดคล้องกับจำนวนสมาชิกเข้าใหม่จำนวน ${newMemberQty} คน การอนุมัติและการโอนหุ้นเป็นไปตามระเบียบ`;

    if (shareData.conclusionNotes !== generatedNote) {
      setShareData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    shareData.endBal,
    shareData.summaryAmt,
    shareData.difference,
    shareData.entranceFee,
    shareData.newMemberQty,
    shareData.inspectMonth
  ]);

  // 5. Accumulated Capital Reserves Conclusion Note
  useEffect(() => {
    const totalBeg = reserveData.rows.reduce((sum, r) => sum + r.begBal, 0);
    const totalAdd = reserveData.rows.reduce((sum, r) => sum + r.addAmt, 0);
    const totalDec = reserveData.rows.reduce((sum, r) => sum + r.decAmt, 0);
    const totalEnd = reserveData.rows.reduce((sum, r) => sum + r.endBal, 0);

    const formattedBeg = totalBeg === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBeg);
    const formattedAdd = totalAdd === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalAdd);
    const formattedDec = totalDec === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDec);
    const formattedEnd = totalEnd === 0 ? '0.00' : new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalEnd);

    const usedReserves = reserveData.rows
      .filter(r => r.decAmt > 0)
      .map(r => `${r.name} ${new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(r.decAmt)} บาท`)
      .join(', ');

    const generatedNote = `ตั้งแต่วันที่ 1 ถึงวันสิ้นงวดของเดือน${reserveData.inspectMonth || 'พฤษภาคม 2569'} มีการจ่ายเงินทุนหมวดต่างๆ รวมทั้งสิ้น ${formattedDec} บาท ประกอบด้วย: ${usedReserves || 'ไม่มีการจ่ายเงินทุนในงวดนี้'} โดยมียอดคงเหลือยกไปของทุนสะสมรวม ${formattedEnd} บาท การใช้จ่ายทุนและการบันทึกบัญชีสะสมเป็นไปตามข้อบังคับ มติกรรมการ และถูกต้องครบถ้วน`;

    if (reserveData.conclusionNotes !== generatedNote) {
      setReserveData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    JSON.stringify(reserveData.rows),
    reserveData.inspectMonth
  ]);

  // 6. Borrowings / Loans Conclusion Note
  useEffect(() => {
    const parseInterestRate = (rateStr: string): number => {
      if (!rateStr) return 0;
      const cleaned = rateStr.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed / 100;
    };

    const calcInterestVal = (c: any) => {
      if (c.calcInterestOverride !== undefined && c.calcInterestOverride !== null && c.calcInterestOverride !== '') {
        return Number(c.calcInterestOverride);
      }
      const rate = parseInterestRate(c.rate);
      const daysVal = loanData.calcDays !== undefined && loanData.calcDays !== '' ? Number(loanData.calcDays) : getDaysInMonthGlobal(loanData.inspectMonth);
      const divisorVal = loanData.calcDivisor !== undefined && loanData.calcDivisor !== '' ? Number(loanData.calcDivisor) : 365;
      const days = isNaN(daysVal) ? 30 : daysVal;
      const divisor = isNaN(divisorVal) || divisorVal === 0 ? 365 : divisorVal;
      return c.begBal * rate * days / divisor;
    };

    const t1Beg = loanData.table1.reduce((sum, r) => sum + r.begBal, 0);
    const t2Beg = loanData.table2.reduce((sum, r) => sum + r.begBal, 0);
    const totalBeg = t1Beg + t2Beg;

    const t1Add = loanData.table1.reduce((sum, r) => sum + r.addAmt, 0);
    const t2Add = loanData.table2.reduce((sum, r) => sum + r.addAmt, 0);
    const totalAdd = t1Add + t2Add;

    const t1Int = loanData.table1.reduce((sum, r) => sum + r.interest, 0);
    const t2Int = loanData.table2.reduce((sum, r) => sum + r.interest, 0);
    const totalInt = t1Int + t2Int;

    const t1Oth = loanData.table1.reduce((sum, r) => sum + r.otherAdd, 0);
    const t2Oth = loanData.table2.reduce((sum, r) => sum + r.otherAdd, 0);
    const totalOth = t1Oth + t2Oth;

    const t1Cls = loanData.table1.reduce((sum, r) => sum + r.closeAmt, 0);
    const t2Cls = loanData.table2.reduce((sum, r) => sum + r.closeAmt, 0);
    const totalCls = t1Cls + t2Cls;

    const t1End = loanData.table1.reduce((sum, r) => sum + (r.begBal + r.addAmt + r.otherAdd - r.closeAmt), 0);
    const t2End = loanData.table2.reduce((sum, r) => sum + (r.begBal + r.addAmt + r.otherAdd - r.closeAmt), 0);
    const totalEnd = t1End + t2End;

    const t1Cnt = loanData.table1.reduce((sum, r) => sum + r.count, 0);
    const t2Cnt = loanData.table2.reduce((sum, r) => sum + r.count, 0);
    const totalCnt = t1Cnt + t2Cnt;

    const t1Trf = loanData.table1.reduce((sum, r) => sum + (calcInterestVal(r) - r.interest), 0);
    const t2Trf = loanData.table2.reduce((sum, r) => sum + (calcInterestVal(r) - r.interest), 0);
    const totalTrf = t1Trf + t2Trf;

    const formatFn = (val: number) => {
      return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    };

    const formattedBeg = formatFn(totalBeg);
    const formattedAdd = formatFn(totalAdd);
    const formattedInt = formatFn(totalInt);
    const formattedOth = formatFn(totalOth);
    const formattedCls = formatFn(totalCls);
    const formattedEnd = formatFn(totalEnd);
    const formattedCnt = totalCnt;
    const formattedTrf = formatFn(totalTrf);

    const generatedNote = `จากการตรวจสอบข้อมูลสรุปยอดรวมเงินกู้ยืมทั้งหมด ณ วันสิ้นงวดของเดือน${loanData.inspectMonth || 'พฤษภาคม 2569'} พบว่ามียอดยกมาต้นงวดรวม ${formattedBeg} บาท ระหว่างงวดมีการกู้ยืมเพิ่มขึ้น ${formattedAdd} บาท มีรายการเพิ่มอื่น ${formattedOth} บาท และชำระคืนเงินกู้ยืม ${formattedCls} บาท ส่งผลให้มียอดคงเหลือยกไปสิ้นงวดรวมทั้งสิ้น ${formattedEnd} บาท (จำนวน ${formattedCnt} บัญชี) นอกจากนี้ จากการตรวจสอบและทดสอบการคำนวณดอกเบี้ยจ่ายงวดนี้รวมเป็นเงิน ${formattedInt} บาท พบว่ามีรายการผลต่างดอกเบี้ยจ่ายรวมทั้งสิ้น ${formattedTrf} บาท การบันทึกบัญชีและการคำนวณดอกเบี้ยจ่ายมีความถูกต้องตามเกณฑ์และสัญญากู้ยืมเงินที่เกี่ยวข้อง`;

    if (loanData.conclusionNotes !== generatedNote) {
      setLoanData(prev => ({ ...prev, conclusionNotes: generatedNote }));
    }
  }, [
    JSON.stringify(loanData.table1),
    JSON.stringify(loanData.table2),
    loanData.inspectMonth,
    loanData.calcDays,
    loanData.calcDivisor
  ]);

  // 2. Parser function for Trial Balance (Excel / CSV / PDF) file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadStatus('idle');

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsParsingTB(true);
      try {
        const rows = await extractTextRowsFromPdf(file);
        const accounts = parseTBFromRows(rows);
        if (accounts.length === 0) {
          throw new Error('ไม่พบบัญชีงบทดลองในไฟล์ PDF กรุณาตรวจสอบรูปแบบไฟล์');
        }
        updateWorkingPapersWithTB(accounts);
        setParsedCount(accounts.length);
        setUploadStatus('success');
      } catch (err: any) {
        console.error(err);
        setUploadStatus('error');
      } finally {
        setIsParsingTB(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          if (!data) throw new Error('ไม่สามารถอ่านข้อมูลได้');

          const workbook = XLSX.read(data, { type: 'binary' });
          // Assume first sheet contains the Trial Balance
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Parse sheet to rows of array/objects
          const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
          
          // Find the maximum columns in the rows to avoid issues with shorter rows
          let maxCols = 0;
          for (let i = 0; i < jsonRows.length; i++) {
            const r = jsonRows[i];
            if (r && r.length > maxCols) {
              maxCols = r.length;
            }
          }

          // Loop and extract relevant accounts
          const accounts: TBAccount[] = [];
          
          for (let i = 0; i < jsonRows.length; i++) {
            const row = jsonRows[i];
            if (!row || row.length < 2) continue;
            
            // Check if first column has account code (numeric, typical 4-15 digits with optional dashes/dots)
            const rawCode = String(row[0]).trim();
            const codeMatch = rawCode.match(/^[\d.-]{4,18}$/);
            
            if (codeMatch && /\d/.test(rawCode)) {
              // Clean code to keep only digits so it matches references like "11121"
              const code = rawCode.replace(/[^0-9]/g, '');
              const name = String(row[1]).trim();
              
              // Extract balances (depending on layout, columns are usually:
              // [code, name, beg_debit, beg_credit, trx_debit, trx_credit, end_debit, end_credit])
              // We search indices intelligently by gathering all numeric columns
              const parseNum = (val: any) => {
                if (val === undefined || val === null || val === '' || val === '-') return 0;
                const clean = String(val).replace(/,/g, '').trim();
                const num = parseFloat(clean);
                return isNaN(num) ? 0 : num;
              };

              const numbers: number[] = [];
              for (let colIdx = 2; colIdx < maxCols; colIdx++) {
                const cellVal = row[colIdx];
                if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '' || String(cellVal).trim() === '-') {
                  numbers.push(0);
                } else {
                  const cleaned = String(cellVal).replace(/,/g, '').trim();
                  const num = parseFloat(cleaned);
                  numbers.push(isNaN(num) ? 0 : num);
                }
              }

              let endDebit = 0;
              let endCredit = 0;
              if (numbers.length >= 6) {
                const trailingHaveValues = numbers.slice(6).some(v => v !== 0);
                if (!trailingHaveValues) {
                  endDebit = numbers[4];
                  endCredit = numbers[5];
                } else {
                  endCredit = numbers[numbers.length - 1];
                  endDebit = numbers[numbers.length - 2];
                }
              } else if (numbers.length >= 2) {
                endCredit = numbers[numbers.length - 1];
                endDebit = numbers[numbers.length - 2];
              } else if (numbers.length === 1) {
                endDebit = numbers[0];
              }

              const begDebit = numbers[0] || 0;
              const begCredit = numbers[1] || 0;
              const trxDebit = numbers[2] || 0;
              const trxCredit = numbers[3] || 0;

              accounts.push({
                code, name, begDebit, begCredit, trxDebit, trxCredit, endDebit, endCredit, numbers
              });
            }
          }

          if (accounts.length === 0) {
            throw new Error('ไม่พบบัญชี 5 หลักในไฟล์งบทดลอง กรุณาตรวจสอบรูปแบบไฟล์');
          }

          // Apply extracted data to our working papers
          updateWorkingPapersWithTB(accounts);
          setParsedCount(accounts.length);
          setUploadStatus('success');
        } catch (err: any) {
          console.error(err);
          setUploadStatus('error');
        }
      };
      reader.readAsBinaryString(file);
    }
    if (e.target) e.target.value = '';
  };

  // Parser function for General Ledger (Excel / CSV / PDF) file
  const handleLedgerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLedgerFileName(file.name);
    setLedgerUploadStatus('idle');

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsParsingLedger(true);
      try {
        const rows = await extractTextRowsFromPdf(file);
        const ledgerList = parseLedgerFromRows(rows);
        if (ledgerList.length === 0) {
          throw new Error('ไม่พบข้อมูลบัญชีแยกประเภทในไฟล์ PDF กรุณาตรวจสอบรูปแบบไฟล์');
        }
        updateWorkingPapersWithLedger(ledgerList);
        setLedgerParsedCount(ledgerList.length);
        setLedgerUploadStatus('success');
      } catch (err: any) {
        console.error(err);
        setLedgerUploadStatus('error');
      } finally {
        setIsParsingLedger(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          if (!data) throw new Error('ไม่สามารถอ่านข้อมูลได้');

          const workbook = XLSX.read(data, { type: 'binary' });
          const ledgerList = parseLedgerSheet(workbook);

          if (ledgerList.length === 0) {
            throw new Error('ไม่พบข้อมูลบัญชีแยกประเภทในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์');
          }

          updateWorkingPapersWithLedger(ledgerList);
          setLedgerParsedCount(ledgerList.length);
          setLedgerUploadStatus('success');
        } catch (err: any) {
          console.error(err);
          setLedgerUploadStatus('error');
        }
      };
      reader.readAsBinaryString(file);
    }
    if (e.target) e.target.value = '';
  };

  const parseLedgerSheet = (workbook: any): LedgerAccount[] => {
    const accounts: LedgerAccount[] = [];
    
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '' || val === '-') return 0;
      const clean = String(val).replace(/,/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      let currentCode = '';
      let currentName = '';
      let lastRowWithBalance: any = null;

      for (let i = 0; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        if (!row || row.length === 0) continue;

        // Search the entire row for account code indicators
        let rowText = row.map((cell: any) => cell !== undefined && cell !== null ? String(cell) : '').join(' ');
        
        // Look for Account Code patterns e.g., "รหัสบัญชี : 11030101" or "รหัส 11030101"
        const codeMatch = rowText.match(/(?:รหัสบัญชี|รหัส|Account|Code)\s*[:\-\s]\s*(\d{5,10})/i) || rowText.match(/\b(\d{5,10})\b/);
        
        if (codeMatch && !rowText.includes('หน้า') && !rowText.includes('Page')) {
          const newCode = codeMatch[1];
          
          if (currentCode && lastRowWithBalance) {
            const balance = extractBalanceFromRow(lastRowWithBalance);
            const existingIdx = accounts.findIndex(a => a.code === currentCode);
            if (existingIdx >= 0) {
              accounts[existingIdx].balance = balance !== 0 ? balance : accounts[existingIdx].balance;
            } else {
              accounts.push({ code: currentCode, name: currentName, balance });
            }
          }

          currentCode = newCode;
          const nameMatch = rowText.match(/(?:ชื่อบัญชี|ชื่อ|Name)\s*[:\-\s]\s*([^\s\d\:\-]+[^\s\:\-]*)/i);
          if (nameMatch) {
            currentName = nameMatch[1].trim();
          } else {
            const nonNumCell = row.find((cell: any) => cell && typeof cell === 'string' && cell.trim().length > 3 && !cell.match(/^\d+$/) && !cell.includes('รหัสบัญชี'));
            currentName = nonNumCell ? String(nonNumCell).trim() : 'บัญชีแยกประเภท';
          }
          lastRowWithBalance = null;
          continue;
        }

        if (currentCode) {
          const isBalanceRow = rowText.includes('ยอดยกไป') || 
                               rowText.includes('คงเหลือ') || 
                               rowText.includes('ยอดสะสม') || 
                               rowText.includes('ยอดยกไปสิ้นงวด') ||
                               rowText.includes('ยอดคงเหลือ') ||
                               rowText.includes('ยอดยกไปงวดหน้า') ||
                               rowText.includes('Balance') ||
                               rowText.includes('รวม');

          if (isBalanceRow) {
            lastRowWithBalance = row;
          } else {
            const hasNumbers = row.some((cell: any, idx: number) => idx > 1 && parseNum(cell) !== 0);
            if (hasNumbers) {
              lastRowWithBalance = row;
            }
          }
        }
      }

      if (currentCode && lastRowWithBalance) {
        const balance = extractBalanceFromRow(lastRowWithBalance);
        const existingIdx = accounts.findIndex(a => a.code === currentCode);
        if (existingIdx >= 0) {
          accounts[existingIdx].balance = balance !== 0 ? balance : accounts[existingIdx].balance;
        } else {
          accounts.push({ code: currentCode, name: currentName, balance });
        }
      }
    });

    return accounts;
  };

  const extractBalanceFromRow = (row: any[]): number => {
    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '' || val === '-') return null;
      const clean = String(val).replace(/,/g, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };

    for (let i = row.length - 1; i >= 0; i--) {
      const val = parseNum(row[i]);
      if (val !== null && val !== 0) {
        return val;
      }
    }
    return 0;
  };

  const updateWorkingPapersWithLedger = (ledgerList: LedgerAccount[]) => {
    setLedgerAccounts(ledgerList);

    setBankData(prev => {
      const updateList = (list: any[]) => {
        return list.map(item => {
          if (!item.glAccount) return item;
          const cleanGL = item.glAccount.trim();
          const matched = ledgerList.find(l => l.code === cleanGL || l.code.endsWith(cleanGL) || cleanGL.endsWith(l.code));
          if (matched) {
            return { ...item, bookBalance: matched.balance };
          }
          return item;
        });
      };

      return {
        ...prev,
        savings: updateList(prev.savings),
        currents: updateList(prev.currents),
        coops: updateList(prev.coops)
      };
    });
  };

  const calculateDepositRowValues = (account: TBAccount | undefined) => {
    if (!account || !account.numbers || account.numbers.length < 2) {
      return {
        begBal: 0,
        addAmt: 0,
        decAmt: 0,
        endBal: 0,
        formulaText: '',
        colCount: 0
      };
    }

    const nums = account.numbers;
    const count = nums.length;

    let begBal = 0;
    let addAmt = 0;
    let decAmt = 0;
    let endBal = 0;
    let formulaText = '';

    if (count >= 6) {
      if (count >= 8) {
        const col2 = nums[1] || 0;
        const col4 = nums[3] || 0;
        const col3 = nums[2] || 0;
        const col5 = nums[4] || 0;
        const col6 = nums[5] || 0;

        begBal = col2 + col4 - col3;
        addAmt = col6;
        decAmt = col5;
        endBal = begBal + addAmt - decAmt;
        
        formulaText = `${col2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + ${col4.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - ${col3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        const col2 = nums[1] || 0;
        const col4 = nums[3] || 0;
        const col3 = nums[2] || 0;

        begBal = col2;
        addAmt = col4;
        decAmt = col3;
        endBal = begBal + addAmt - decAmt;

        formulaText = `${col2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    } else {
      begBal = account.begCredit || 0;
      addAmt = account.trxCredit || 0;
      decAmt = account.trxDebit || 0;
      endBal = account.endCredit || 0;
      formulaText = `${begBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return {
      begBal,
      addAmt,
      decAmt,
      endBal,
      formulaText,
      colCount: count
    };
  };

  const calculateDebtorRowValuesFromGL = (glAccountString: string, accounts: TBAccount[]) => {
    const parts = (glAccountString || '').split('+').map(p => p.trim()).filter(Boolean);
    let begBal = 0;
    let trxDebit = 0;
    let trxCredit = 0;
    let foundAny = false;

    for (const part of parts) {
      if (part.endsWith('*')) {
        const prefix = part.slice(0, -1);
        const matchedAccounts = accounts.filter(a => a.code.startsWith(prefix));
        if (matchedAccounts.length > 0) {
          foundAny = true;
          for (const matched of matchedAccounts) {
            const nums = matched.numbers || [];
            const count = nums.length;
            
            let matchedBeg = 0;
            let matchedTrxDebit = 0;
            let matchedTrxCredit = 0;

            if (count >= 6) {
              if (count >= 8) {
                // 1. ยอดยกมา ณ ต้นงวด = เดบิตยกมา1.1 (nums[0]) + เดบิตยกมา1.2 (nums[2]) - เครดิตยกมา1.1 (nums[1]) - เครดิตยกมา1.2 (nums[3])
                const deb11 = nums[0] || 0;
                const cred11 = nums[1] || 0;
                const deb12 = nums[2] || 0;
                const cred12 = nums[3] || 0;
                matchedBeg = deb11 + deb12 - cred11 - cred12;

                matchedTrxDebit = nums[4] || 0;
                matchedTrxCredit = nums[5] || 0;
              } else {
                // 6 columns
                const deb11 = nums[0] || 0;
                const cred11 = nums[1] || 0;
                matchedBeg = deb11 - cred11;

                matchedTrxDebit = nums[2] || 0;
                matchedTrxCredit = nums[3] || 0;
              }
            } else {
              matchedBeg = (matched.begDebit || 0) - (matched.begCredit || 0);
              matchedTrxDebit = matched.trxDebit || 0;
              matchedTrxCredit = matched.trxCredit || 0;
            }

            begBal += matchedBeg;
            trxDebit += matchedTrxDebit;
            trxCredit += matchedTrxCredit;
          }
        }
      } else {
        const matched = accounts.find(a => a.code === part);
        if (matched) {
          foundAny = true;
          const nums = matched.numbers || [];
          const count = nums.length;
          
          let matchedBeg = 0;
          let matchedTrxDebit = 0;
          let matchedTrxCredit = 0;

          if (count >= 6) {
            if (count >= 8) {
              // 1. ยอดยกมา ณ ต้นงวด = เดบิตยกมา1.1 (nums[0]) + เดบิตยกมา1.2 (nums[2]) - เครดิตยกมา1.1 (nums[1]) - เครดิตยกมา1.2 (nums[3])
              const deb11 = nums[0] || 0;
              const cred11 = nums[1] || 0;
              const deb12 = nums[2] || 0;
              const cred12 = nums[3] || 0;
              matchedBeg = deb11 + deb12 - cred11 - cred12;

              matchedTrxDebit = nums[4] || 0;
              matchedTrxCredit = nums[5] || 0;
            } else {
              // 6 columns
              const deb11 = nums[0] || 0;
              const cred11 = nums[1] || 0;
              matchedBeg = deb11 - cred11;

              matchedTrxDebit = nums[2] || 0;
              matchedTrxCredit = nums[3] || 0;
            }
          } else {
            matchedBeg = (matched.begDebit || 0) - (matched.begCredit || 0);
            matchedTrxDebit = matched.trxDebit || 0;
            matchedTrxCredit = matched.trxCredit || 0;
          }

          begBal += matchedBeg;
          trxDebit += matchedTrxDebit;
          trxCredit += matchedTrxCredit;
        }
      }
    }

    return {
      begBal,
      trxDebit,
      trxCredit,
      foundAny
    };
  };

  const calculateBankBalanceFromGL = (glAccountString: string, accounts: TBAccount[]) => {
    const parts = (glAccountString || '').split('+').map(p => p.trim()).filter(Boolean);
    let totalBalance = 0;
    let foundAny = false;

    for (const part of parts) {
      if (part.endsWith('*')) {
        const prefix = part.slice(0, -1);
        const matchedAccounts = accounts.filter(a => a.code.startsWith(prefix));
        if (matchedAccounts.length > 0) {
          foundAny = true;
          for (const matched of matchedAccounts) {
            totalBalance += getBalanceForBank(matched);
          }
        }
      } else {
        const matched = accounts.find(a => a.code === part);
        if (matched) {
          foundAny = true;
          totalBalance += getBalanceForBank(matched);
        }
      }
    }

    return {
      balance: totalBalance,
      foundAny
    };
  };

  // Helper to update working paper states using parsed Trial Balance data
  const updateWorkingPapersWithTB = (accounts: TBAccount[]) => {
    setTbAccounts(accounts);
    // 1. Bank deposits mapping
    setBankData(prev => ({
      ...prev,
      savings: prev.savings.map(s => {
        if (!s.glAccount) return s;
        const calc = calculateBankBalanceFromGL(s.glAccount, accounts);
        return calc.foundAny ? { ...s, bookBalance: calc.balance } : s;
      }),
      currents: prev.currents.map(c => {
        if (!c.glAccount) return c;
        const calc = calculateBankBalanceFromGL(c.glAccount, accounts);
        return calc.foundAny ? { ...c, bookBalance: calc.balance } : c;
      }),
      coops: prev.coops.map(cp => {
        if (!cp.glAccount) return cp;
        const calc = calculateBankBalanceFromGL(cp.glAccount, accounts);
        return calc.foundAny ? { ...cp, bookBalance: calc.balance } : cp;
      })
    }));

    // 2. Accounts Receivable Mapping
    setDebtorData(prev => {
      const nextRows = { ...prev.rows };
      
      const regGL = prev.regularGlAccount || '11533';
      const specGL = prev.specialGlAccount || '113*';
      const emerGL = prev.emergencyGlAccount || '11531 + 11538';
      const otherGL = prev.otherGlAccount || '11556 + 11567 + 11568 + 11580';

      const regVals = calculateDebtorRowValuesFromGL(regGL, accounts);
      const specVals = calculateDebtorRowValuesFromGL(specGL, accounts);
      const emerVals = calculateDebtorRowValuesFromGL(emerGL, accounts);
      const otherVals = calculateDebtorRowValuesFromGL(otherGL, accounts);

      if (regVals.foundAny) {
        nextRows.regular = {
          ...nextRows.regular,
          begBal: regVals.begBal,
          addAmt: 0.00,
          trxDebit: regVals.trxDebit,
          otherAddAmt: regVals.trxDebit - 0.00,
          decAmt: regVals.trxCredit,
          endBal: regVals.begBal + 0.00 + (regVals.trxDebit - 0.00) - regVals.trxCredit
        };
      }
      if (specVals.foundAny) {
        nextRows.special = {
          ...nextRows.special,
          begBal: specVals.begBal,
          addAmt: 0.00,
          trxDebit: specVals.trxDebit,
          otherAddAmt: specVals.trxDebit - 0.00,
          decAmt: specVals.trxCredit,
          endBal: specVals.begBal + 0.00 + (specVals.trxDebit - 0.00) - specVals.trxCredit
        };
      }
      if (emerVals.foundAny) {
        nextRows.emergency = {
          ...nextRows.emergency,
          begBal: emerVals.begBal,
          addAmt: 0.00,
          trxDebit: emerVals.trxDebit,
          otherAddAmt: emerVals.trxDebit - 0.00,
          decAmt: emerVals.trxCredit,
          endBal: emerVals.begBal + 0.00 + (emerVals.trxDebit - 0.00) - emerVals.trxCredit
        };
      }
      if (otherVals.foundAny) {
        nextRows.other = {
          ...nextRows.other,
          begBal: otherVals.begBal,
          addAmt: 0.00,
          trxDebit: otherVals.trxDebit,
          otherAddAmt: otherVals.trxDebit - 0.00,
          decAmt: otherVals.trxCredit,
          endBal: otherVals.begBal + 0.00 + (otherVals.trxDebit - 0.00) - otherVals.trxCredit
        };
      }

      return { ...prev, rows: nextRows };
    });

    // 3. Deposit Received Mapping
    const savingsGlAccountCode = (depositData.savingsGlAccount || '21410').trim();
    const savingDayGlAccountCode = (depositData.savingDayGlAccount || '21414').trim();
    const savingsReceived = accounts.find(a => a.code === savingsGlAccountCode);
    const daySavingsReceived = accounts.find(a => a.code === savingDayGlAccountCode);

    setDepositData(prev => {
      const nextRows = { ...prev.rows };
      if (savingsReceived) {
        const vals = calculateDepositRowValues(savingsReceived);
        nextRows.savings = {
          ...nextRows.savings,
          begBal: vals.begBal,
          addAmt: vals.addAmt,
          decAmt: vals.decAmt,
          endBal: vals.endBal
        };
      }
      if (daySavingsReceived) {
        const vals = calculateDepositRowValues(daySavingsReceived);
        nextRows.savingDay = {
          ...nextRows.savingDay,
          begBal: vals.begBal,
          addAmt: vals.addAmt,
          decAmt: vals.decAmt,
          endBal: vals.endBal
        };
      }
      return { ...prev, rows: nextRows };
    });

    // 4. Share Capital Mapping
    setShareData(prev => {
      const begBalCode = (prev.begBalGlAccount || '').trim();
      const newMemberCode = (prev.newMemberGlAccount || '').trim();
      const entranceCode = (prev.entranceFeeGlAccount || '').trim();
      const otherCode = (prev.otherAdditionsGlAccount || '').trim();
      const resignedCode = (prev.resignedAmtGlAccount || '').trim();

      const rate = prev.entranceFeePerPerson || 100.00;

      let begBal = prev.begBal;
      let newMemberAmt = prev.newMemberAmt;
      let entranceFee = prev.entranceFee;
      let newMemberQty = prev.newMemberQty;
      let otherAdditions = prev.otherAdditions;
      let resignedAmt = prev.resignedAmt;

      if (begBalCode) {
        const begCap = accounts.find(a => a.code === begBalCode);
        if (begCap) {
          if (begCap.numbers && begCap.numbers.length >= 2) {
            let val = begCap.numbers[1];
            if (begCap.numbers.length === 4) {
              val = (begCap.numbers[0] || 0) + (begCap.numbers[2] || 0) - (begCap.numbers[1] || 0);
            } else if (begCap.numbers.length >= 6) {
              val = (begCap.numbers[1] || 0) + (begCap.numbers[3] || 0) - (begCap.numbers[2] || 0);
            }
            begBal = val;
          } else {
            begBal = begCap.begCredit;
          }
        }
      }

      if (newMemberCode) {
        const newMemAcc = accounts.find(a => a.code === newMemberCode);
        if (newMemAcc) {
          newMemberAmt = newMemAcc.trxCredit;
        }
      }

      let newMembersGeneral = prev.newMembersGeneral !== undefined ? prev.newMembersGeneral : 10;
      let newMembersAssociate = prev.newMembersAssociate !== undefined ? prev.newMembersAssociate : 1;

      if (entranceCode) {
        const feeAcc = accounts.find(a => a.code === entranceCode);
        if (feeAcc) {
          entranceFee = feeAcc.trxCredit;
          const totalNew = Math.floor(feeAcc.trxCredit / rate);
          newMemberQty = String(totalNew);
          newMembersGeneral = totalNew;
          newMembersAssociate = 0;
        }
      }

      if (otherCode) {
        const otherCap = accounts.find(a => a.code === otherCode);
        if (otherCap) {
          if (otherCap.numbers && otherCap.numbers.length >= 3) {
            otherAdditions = otherCap.numbers[otherCap.numbers.length - 3];
          } else {
            otherAdditions = otherCap.trxCredit;
          }
        }
      }

      if (resignedCode) {
        const resignedCap = accounts.find(a => a.code === resignedCode);
        if (resignedCap) {
          if (resignedCap.numbers && resignedCap.numbers.length >= 4) {
            resignedAmt = resignedCap.numbers[resignedCap.numbers.length - 4];
          } else {
            resignedAmt = resignedCap.trxDebit;
          }
        }
      }

      const endBal = begBal + otherAdditions - resignedAmt;

      return {
        ...prev,
        begBal,
        newMemberAmt,
        entranceFee,
        newMemberQty,
        otherAdditions,
        resignedAmt,
        endBal,
        newMembersGeneral,
        newMembersAssociate
      };
    });

    // 5. Reserve & Reserves Mapping
    // CODE 33100: Public Utility, CODE 33300: Div Equalization, CODE 33700: Education, CODE 34300: Office Est.
    setReserveData(prev => {
      const nextRows = prev.rows.map(row => {
        const matched = accounts.find(a => a.code === row.code);
        if (matched) {
          const isEightCol = matched.numbers && matched.numbers.length >= 8;
          
          let begBal = 0;
          let addAmt = 0;
          let decAmt = 0;
          let endBal = 0;

          if (isEightCol && matched.numbers) {
            // 8 Columns single:
            // Column 1 (index 0): Debit Beg
            // Column 2 (index 1): Credit Beg
            // Column 3 (index 2): Debit Trx (Debit year-to-date)
            // Column 4 (index 3): Credit Trx (Credit year-to-date)
            // Column 5 (index 4): Debit Month Trx
            // Column 6 (index 5): Credit Month Trx
            // Column 7 (index 6): Debit End
            // Column 8 (index 7): Credit End
            
            // Formula 1: ยอดยกมา (begBal) = Column 2 (Credit Beg) + Column 4 (Credit Trx) - Column 3 (Debit Trx)
            const col2 = matched.numbers[1] || 0;
            const col3 = matched.numbers[2] || 0;
            const col4 = matched.numbers[3] || 0;
            begBal = col2 + col4 - col3;
            
            // Formula 2: เพิ่มระหว่างงวด (addAmt) = Column 6 (Credit Month Trx)
            addAmt = matched.numbers[5] || 0;
            
            // Formula 3: ลดระหว่างงวด (decAmt) = Column 5 (Debit Month Trx)
            decAmt = matched.numbers[4] || 0;
          } else if (matched.numbers && matched.numbers.length >= 6) {
            // 6 Columns single:
            // Column 1 (index 0): Debit Beg
            // Column 2 (index 1): Credit Beg
            // Column 3 (index 2): Debit Trx (Debit Month Trx)
            // Column 4 (index 3): Credit Trx (Credit Month Trx)
            // Column 5 (index 4): Debit End
            // Column 6 (index 5): Credit End
            
            // Formula 1: ยอดยกมา (begBal) = Column 2 (Credit Beg)
            const col2 = matched.numbers[1] || 0;
            begBal = col2;
            
            // Formula 2: เพิ่มระหว่างงวด (addAmt) = Column 4 (Credit Trx)
            addAmt = matched.numbers[3] || 0;
            
            // Formula 3: ลดระหว่างงวด (decAmt) = Column 3 (Debit Trx)
            decAmt = matched.numbers[2] || 0;
          } else {
            // Fallback to basic fields if numbers array not present
            begBal = matched.begCredit;
            addAmt = matched.trxCredit;
            decAmt = matched.trxDebit;
          }
          
          // Formula 4: ยอดคงเหลือสิ้นงวด = ยอดยกมา + เพิ่มระหว่างงวด - ลดระหว่างงวด
          endBal = begBal + addAmt - decAmt;

          return {
            ...row,
            begBal,
            addAmt,
            decAmt,
            endBal
          };
        }
        return row;
      });
      return { ...prev, rows: nextRows };
    });
  };

  // 3. Demo Data Loader for instant review
  const loadDemoData = () => {
    setFileName('งบทดลอง_พฤษภาคม_2569_สาธิต.xlsx');
    setUploadStatus('success');
    setParsedCount(85);

    const demoTB: TBAccount[] = [
      { code: '11131', name: 'เงินฝากออมทรัพย์-กรุงไทย', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 84855098.98, endCredit: 0 },
      { code: '11132', name: 'เงินฝากออมทรัพย์-ธอส.', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 1996023.70, endCredit: 0 },
      { code: '11135', name: 'เงินฝากออมทรัพย์-ธกส.', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 18500.00, endCredit: 0 },
      { code: '11121', name: 'เงินฝากกระแสรายวัน-กรุงไทย', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 0, endCredit: 5796.00 },
      { code: '11122', name: 'เงินฝากกระแสรายวัน-ธอส.', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 0, endCredit: 0 },
      { code: '11210', name: 'เงินฝากชุมนุมสอ.ตำรวจแห่งชาติ', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 1581875.73, endCredit: 0 },
      { code: '11212', name: 'เงินฝาก ชสอ.รุ่นสถาพร', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 3658596.71, endCredit: 0 },
      { code: '11213', name: 'เงินฝาก ชสอ.รุ่นสถาพร2', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 0, endCredit: 0 },
      { code: '11214', name: 'เงินฝาก ชสอ.รุ่นสถาพร3', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 3658596.72, endCredit: 0 },
      // Also map the 8-digit ones
      { code: '11030101', name: 'เงินฝากออมทรัพย์-กรุงไทย (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 84855098.98, endCredit: 0 },
      { code: '11030102', name: 'เงินฝากออมทรัพย์-ธอส. (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 1996023.70, endCredit: 0 },
      { code: '11030201', name: 'เงินฝากกระแสรายวัน-กรุงไทย (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 0, endCredit: 5796.00 },
      { code: '11040101', name: 'เงินฝากชุมนุมสอ.ตำรวจแห่งชาติ (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 1581875.73, endCredit: 0 },
      { code: '11040102', name: 'เงินฝาก ชสอ.รุ่นสถาพร (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 3658596.71, endCredit: 0 },
      { code: '11040103', name: 'เงินฝาก ชสอ.รุ่นสถาพร2 (8หลัก)', begDebit: 0, begCredit: 0, trxDebit: 0, trxCredit: 0, endDebit: 3658596.72, endCredit: 0 },
    ];
    setTbAccounts(demoTB);
    
    // Set exactly the values from Thai police audit screenshots
    // Bank
    setBankData(prev => ({
      ...prev,
      savings: [
        { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101', bookBalance: 84855098.98, bankBalance: 0, glAccount: '11131', remarks: '' },
        { id: '2', bank: 'ธนาคารธอส.', branch: 'พระนครศรีอยุธยา', accountNo: '100', bookBalance: 1996023.70, bankBalance: 0, glAccount: '11132', remarks: '' },
        { id: '3', bank: 'ธนาคาร ธกส.', branch: 'สายเอเชีย', accountNo: 'xxx', bookBalance: 18500.00, bankBalance: 0, glAccount: '11135', remarks: '' }
      ],
      currents: [
        { id: '1', bank: 'ธนาคารกรุงไทย', branch: 'พระนครศรีอยุธยา', accountNo: '101-6', bookBalance: -5796.00, bankBalance: 0, glAccount: '11121', remarks: '' },
        { id: '2', bank: 'ธนาคาร ธส.', branch: 'พระนครศรีอยุธยา', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '', remarks: '' }
      ],
      coops: [
        { id: '1', name: 'เงินฝากชุมนุมสอ.ตำรวจแห่งชาติ', rate: '-', accountNo: '-', bookBalance: 1581875.73, bankBalance: 0, glAccount: '11210', remarks: '' },
        { id: '2', name: 'เงินฝาก ชสอ.รุ่นสถาพร(2.35ตัวสัญญาใช้เงิน)', rate: '2.35', accountNo: '-', bookBalance: 3658596.71, bankBalance: 0, glAccount: '11212', remarks: '' },
        { id: '3', name: 'เงินฝาก ชสอ.รุ่นสถาพร2 (2.75ตัวสัญญาใช้เงิน)', rate: '2.75', accountNo: '-', bookBalance: 0, bankBalance: 0, glAccount: '11213', remarks: '' },
        { id: '4', name: 'เงินฝาก ชสอ.รุ่นสถาพร3 (สัญญาอื่นๆ)', rate: '-', accountNo: '-', bookBalance: 3658596.72, bankBalance: 0, glAccount: '11214', remarks: '' }
      ]
    }));

    // Debtors
    setDebtorData(prev => ({
      ...prev,
      rows: {
        regular: { name: 'สามัญ', begBal: 2191019318.54, addAmt: 12150000.00, addQty: '8', decAmt: 22762402.66, endBal: 2180406915.88, endQty: '1,529', summaryAmt: 2076915004.36, difference: 103491911.52, comment: '' },
        special: { name: 'พิเศษ', begBal: 1276519051.85, addAmt: 9130000.00, addQty: '11', decAmt: 8558702.04, endBal: 1277090349.81, endQty: '1,337', summaryAmt: 1298929689.28, difference: -21839339.47, comment: '' },
        emergency: { name: 'ฉุกเฉิน', begBal: 29551867.98, addAmt: 6770500.00, addQty: '129', decAmt: 5001720.52, endBal: 31320647.46, endQty: '1,205', summaryAmt: 126752785.64, difference: -95432138.18, comment: '' },
        other: { name: 'ลูกหนี้อื่น (ดำเนินคดี,ตามคำพิพากษา)', begBal: 13883330.47, addAmt: 0.00, addQty: '-', decAmt: 103764.34, endBal: 13779566.13, endQty: '-', summaryAmt: 0, difference: 13779566.13, comment: '' }
      }
    }));

    // Deposits
    setDepositData(prev => ({
      ...prev,
      rows: {
        savings: { name: 'ออมทรัพย์', begBal: 271921548.87, addAmt: 8402707.17, decAmt: 5246013.16, endBal: 275078242.88, qty: '2,293', mQty: '2,291', summaryAmt: 275078241.88, difference: 1.00, comment: '**บัญชีเงินฝาก บ.ไทยประกันชีวิต' },
        savingDay: { name: 'โครงการวันออม ปี2569', begBal: 141000.00, addAmt: 28000.00, decAmt: 0.00, endBal: 169000.00, qty: '12', mQty: '12', summaryAmt: 169000.00, difference: 0.00, comment: 'ขาดการติดต่อ ไม่มีรายการเคลื่อนไหวตั้งแต่2561' }
      }
    }));

    // Share Capital
    setShareData(prev => ({
      ...prev,
      begBal: 1256997840.00,
      newMemberQty: '11.00',
      entranceFee: 1100.00,
      otherAdditions: 4316790.00,
      resignedAmt: 3285160.00,
      endBal: 1258029470.00
    }));

    // Reserves
    setReserveData(prev => ({
      ...prev,
      rows: [
        { code: '33100', name: 'ทุนสาธารณประโยชน์', begBal: 465228.23, addAmt: 0.00, decAmt: 26000.00, endBal: 439228.23 },
        { code: '33300', name: 'ทุนรักษาระดับอัตราเงินปันผล', begBal: 1149922.03, addAmt: 0.00, decAmt: 0.00, endBal: 1149922.03 },
        { code: '33700', name: 'ทุนเพื่อการศึกษาอบรมทางสหกรณ์', begBal: 2309007.00, addAmt: 0.00, decAmt: 98895.00, endBal: 2210112.00 },
        { code: '34300', name: 'ทุนเพื่อจัดตั้งสำนักงาน', begBal: 6167271.40, addAmt: 0.00, decAmt: 0.00, endBal: 6167271.40 }
      ]
    }));
  };

  // 4. Excel exporter for the currently active working paper
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    let wsData: any[][] = [];
    let title = '';
    let cols: any[] = [];

    if (activeTab === 'bank') {
      title = 'กระดาษทำการเงินฝากธนาคาร';
      wsData = [
        [bankData.cooperativeName, '', '', '', '', '', '', 'ดัชนีอ้างอิง A-1'],
        ['กระดาษทำการเงินฝากธนาคาร และเงินฝากสหกรณ์อื่น', '', '', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${bankData.periodText}`, '', '', '', '', 'ผู้จัดทำ', bankData.auditorName, bankData.inspectDateText],
        ['', '', '', '', '', 'ผู้สอบทาน', bankData.reviewerName, bankData.reviewDateText !== undefined ? bankData.reviewDateText : getReviewDateText(bankData.inspectDateText)],
        [],
        ['ลำดับ', 'เลขที่บัญชี (งบทดลอง)', 'ประเภทเงินฝาก / ธนาคาร', 'สาขา', 'เลขที่บัญชี', 'ยอดคงเหลือตามบัญชี', 'ยอดคงเหลือตามธนาคาร', 'ผลต่าง', 'หมายเหตุ'],
        ['--- ออมทรัพย์ ---'],
        ...bankData.savings.map((s, i) => [i + 1, s.glAccount || '', s.bank, s.branch, s.accountNo, s.bookBalance, s.bankBalance, s.bookBalance - s.bankBalance, s.remarks || '']),
        ['รวมออมทรัพย์', '', '', '', '', 
          bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0), 
          bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0), 
          bankData.savings.reduce((sum, s) => sum + (s.bookBalance - s.bankBalance), 0),
          ''
        ],
        [],
        ['--- กระแสรายวัน ---'],
        ...bankData.currents.map((c, i) => [i + 1, c.glAccount || '', c.bank, c.branch, c.accountNo, c.bookBalance, c.bankBalance, c.bookBalance - c.bankBalance, c.remarks || '']),
        ['รวมกระแสรายวัน', '', '', '', '', 
          bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0), 
          bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0), 
          bankData.currents.reduce((sum, c) => sum + (c.bookBalance - c.bankBalance), 0),
          ''
        ],
        [],
        ['--- สหกรณ์อื่น ---'],
        ...bankData.coops.map((cp, i) => [i + 1, cp.glAccount || '', cp.name, 'อัตราดอกเบี้ย: ' + cp.rate, cp.accountNo, cp.bookBalance, cp.bankBalance, cp.bookBalance - cp.bankBalance, cp.remarks || '']),
        ['รวมเงินฝากสหกรณ์อื่น', '', '', '', '', 
          bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0), 
          bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0), 
          bankData.coops.reduce((sum, cp) => sum + (cp.bookBalance - cp.bankBalance), 0),
          ''
        ],
        [],
        ['รวมยอดเงินฝากทั้งสิ้น', '', '', '', '', 
          bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0) + bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0) + bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0),
          bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0) + bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0) + bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0),
          (bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0) + bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0) + bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0)) -
          (bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0) + bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0) + bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0)),
          ''
        ],
        [],
        ['วิธีการตรวจสอบ:'],
        ...bankData.methods.map((m, idx) => [idx + 1, m.text, m.checked ? '[✓] ตรวจแล้ว' : '[-] ไม่ได้ตรวจ']),
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [bankData.conclusionNotes]
      ];
      cols = [
        { wch: 8 },  // ลำดับ
        { wch: 22 }, // เลขที่บัญชี (งบทดลอง)
        { wch: 35 }, // ประเภทเงินฝาก / ธนาคาร
        { wch: 20 }, // สาขา
        { wch: 20 }, // เลขที่บัญชี
        { wch: 22 }, // ยอดคงเหลือตามบัญชี
        { wch: 22 }, // ยอดคงเหลือตามธนาคาร
        { wch: 18 }, // ผลต่าง
        { wch: 30 }  // หมายเหตุ
      ];
    } else if (activeTab === 'debtor') {
      title = 'กระดาษทำการลูกหนี้';
      const r = debtorData.rows;
      wsData = [
        [debtorData.cooperativeName, '', '', '', '', '', '', '', 'ดัชนีอ้างอิง C-1'],
        ['กระดาษทำการ ลูกหนี้เงินกู้', '', '', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${debtorData.periodText}`, '', '', '', '', '', 'ผู้จัดทำ', debtorData.auditorName, debtorData.inspectDateText],
        ['', '', '', '', '', '', 'ผู้สอบทาน', debtorData.reviewerName, debtorData.reviewDateText !== undefined ? debtorData.reviewDateText : getReviewDateText(debtorData.inspectDateText)],
        [],
        ['ประเภทหนี้', 'ยอดยกมาต้นงวด', 'กู้เพิ่มระหว่างงวด(บาท)', 'จำนวนสัญญาที่กู้', 'รายการเพิ่มอื่น', 'ชำระหนี้ระหว่างงวด', 'ยอดยกไปสิ้นงวด', 'จำนวนสัญญาคงเหลือ', 'ยอดตามรายงานสรุป', 'ผลต่าง'],
        [r.regular.name, r.regular.begBal, r.regular.addAmt, r.regular.addQty, r.regular.otherAddAmt || 0, r.regular.decAmt, r.regular.endBal, r.regular.endQty, r.regular.summaryAmt, r.regular.difference],
        [r.special.name, r.special.begBal, r.special.addAmt, r.special.addQty, r.special.otherAddAmt || 0, r.special.decAmt, r.special.endBal, r.special.endQty, r.special.summaryAmt, r.special.difference],
        [r.emergency.name, r.emergency.begBal, r.emergency.addAmt, r.emergency.addQty, r.emergency.otherAddAmt || 0, r.emergency.decAmt, r.emergency.endBal, r.emergency.endQty, r.emergency.summaryAmt, r.emergency.difference],
        [r.other.name, r.other.begBal, r.other.addAmt, r.other.addQty, r.other.otherAddAmt || 0, r.other.decAmt, r.other.endBal, r.other.endQty, r.other.summaryAmt, r.other.difference],
        ['รวมลูกหนี้ทั้งสิ้น', 
          r.regular.begBal + r.special.begBal + r.emergency.begBal + r.other.begBal,
          r.regular.addAmt + r.special.addAmt + r.emergency.addAmt + r.other.addAmt,
          '',
          (r.regular.otherAddAmt || 0) + (r.special.otherAddAmt || 0) + (r.emergency.otherAddAmt || 0) + (r.other.otherAddAmt || 0),
          r.regular.decAmt + r.special.decAmt + r.emergency.decAmt + r.other.decAmt,
          r.regular.endBal + r.special.endBal + r.emergency.endBal + r.other.endBal,
          '',
          r.regular.summaryAmt + r.special.summaryAmt + r.emergency.summaryAmt + r.other.summaryAmt,
          r.regular.difference + r.special.difference + r.emergency.difference + r.other.difference
        ],
        [],
        ['สถิติจำนวนสมาชิกเป็นหนี้:'],
        ['สามัญ/สัญญา', debtorData.memberCounts.regular, ''],
        ['ฉุกเฉิน/สัญญา', debtorData.memberCounts.emergency, ''],
        ['พิเศษ/สัญญา', debtorData.memberCounts.special !== undefined ? debtorData.memberCounts.special : '1,337.00', ''],
        ['ลูกหนี้อื่น (ดำเนินคดี,ตามคำพิพากษา)/สัญญา', debtorData.memberCounts.otherDebtor !== undefined ? debtorData.memberCounts.otherDebtor : '0.00', ''],
        ['สรุปจำนวนสัญญาเงินกู้คงเหลือทั้งสิ้น (ราย/สัญญา)', computedTotal, ''],
        ['สรุปเงินกู้คงเหลือทั้งสิ้น (จำนวนบาท)', r.regular.endBal + r.special.endBal + r.emergency.endBal + r.other.endBal, ''],
        [],
        ['วิธีการตรวจสอบ:'],
        ...debtorData.methods.map((m, idx) => [idx + 1, m.text, m.checked ? '[✓] ตรวจแล้ว' : '[-] ไม่ได้ตรวจ']),
        [],
        ['ผลการตรวจสอบ:'],
        ...(debtorData.conclusions || []).map((c, idx) => [idx + 1, c.text, c.checked ? '[✓] ผ่าน' : '[-] ไม่ผ่าน']),
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [debtorData.conclusionNotes]
      ];
      cols = [
        { wch: 25 }, // ประเภทหนี้
        { wch: 22 }, // ยอดยกมาต้นงวด
        { wch: 22 }, // กู้เพิ่มระหว่างงวด
        { wch: 15 }, // จำนวนสัญญาที่กู้
        { wch: 22 }, // รายการเพิ่มอื่น
        { wch: 22 }, // ชำระหนี้ระหว่างงวด
        { wch: 22 }, // ยอดยกไปสิ้นงวด
        { wch: 18 }, // จำนวนสัญญาคงเหลือ
        { wch: 22 }, // ยอดตามรายงานสรุป
        { wch: 18 }  // ผลต่าง
      ];
    } else if (activeTab === 'deposit') {
      title = 'กระดาษทำการเงินรับฝาก';
      const s = depositData.rows.savings;
      const d = depositData.rows.savingDay;
      wsData = [
        [depositData.cooperativeName, '', '', '', '', '', '', '', '', 'ดัชนีอ้างอิง F-1'],
        ['กระดาษทำการ เงินรับฝาก', '', '', '', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${depositData.periodText}`, '', '', '', '', '', '', 'ผู้จัดทำ', depositData.auditorName, depositData.inspectDateText],
        ['', '', '', '', '', '', '', 'ผู้สอบทาน', depositData.reviewerName, depositData.reviewDateText !== undefined ? depositData.reviewDateText : getReviewDateText(depositData.inspectDateText)],
        [],
        ['ประเภทเงินรับฝาก', 'ยอดยกมาต้นงวด', 'รับฝากเพิ่ม', 'ถอนคืน', 'ยอดยกไปสิ้นงวด', 'จำนวนบัญชี', 'จำนวนราย', 'ยอดรวมสรุปยอด', 'ผลต่าง', 'หมายเหตุ'],
        [s.name, s.begBal, s.addAmt, s.decAmt, s.endBal, s.qty, s.mQty, s.summaryAmt, s.difference, s.comment],
        [d.name, d.begBal, d.addAmt, d.decAmt, d.endBal, d.qty, d.mQty, d.summaryAmt, d.difference, d.comment],
        ['รวมเงินรับฝากทั้งสิ้น', 
          s.begBal + d.begBal,
          s.addAmt + d.addAmt,
          s.decAmt + d.decAmt,
          s.endBal + d.endBal,
          '', '',
          s.summaryAmt + d.summaryAmt,
          s.difference + d.difference,
          ''
        ],
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [depositData.conclusionNotes]
      ];
      cols = [
        { wch: 25 }, // ประเภทเงินรับฝาก
        { wch: 22 }, // ยอดยกมาต้นงวด
        { wch: 22 }, // รับฝากเพิ่ม
        { wch: 22 }, // ถอนคืน
        { wch: 22 }, // ยอดยกไปสิ้นงวด
        { wch: 15 }, // จำนวนบัญชี
        { wch: 15 }, // จำนวนราย
        { wch: 22 }, // ยอดรวมสรุปยอด
        { wch: 18 }, // ผลต่าง
        { wch: 30 }  // หมายเหตุ
      ];
    } else if (activeTab === 'deposit_other') {
      title = 'กระดาษทำการเงินรับฝากสหกรณ์อื่น';
      wsData = [
        [depositOtherData.cooperativeName, '', '', '', '', '', '', '', '', 'ดัชนีอ้างอิง F-2'],
        ['กระดาษทำการ เงินรับฝากสหกรณ์อื่น', '', '', '', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${depositOtherData.periodText}`, '', '', '', '', '', '', 'ผู้จัดทำ', depositOtherData.auditorName, depositOtherData.inspectDateText],
        ['', '', '', '', '', '', '', 'ผู้สอบทาน', depositOtherData.reviewerName, depositOtherData.reviewDateText !== undefined ? depositOtherData.reviewDateText : getReviewDateText(depositOtherData.inspectDateText)],
        [],
        ['ชื่อสหกรณ์', 'อัตราดอกเบี้ย', 'ยอดยกมาต้นงวด', 'ฝากเพิ่มระหว่างงวด', 'ดอกเบี้ยจ่ายงวดนี้', 'รายการเพิ่มอื่น', 'ถอนปิดบัญชี', 'รายการถอนโอนดอกเบี้ยสิ้นงวด', 'ยอดยกไปสิ้นงวด', 'จำนวนบัญชีคงเหลือ'],
        ['--- ตารางที่ 1 ---'],
        ...depositOtherData.table1.map(r => [r.name, r.rate, r.begBal, r.addAmt, r.interest, r.otherAdd, r.closeAmt, r.transInterest, r.endBal, r.count]),
        ['รวมตารางที่ 1', '',
          depositOtherData.table1.reduce((sum, r) => sum + r.begBal, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.addAmt, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.interest, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.otherAdd, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.closeAmt, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.transInterest, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.endBal, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.count, 0)
        ],
        [],
        ['--- ตารางที่ 2 ---'],
        ...depositOtherData.table2.map(r => [r.name, r.rate, r.begBal, r.addAmt, r.interest, r.otherAdd, r.closeAmt, r.transInterest, r.endBal, r.count]),
        ['รวมตารางที่ 2', '',
          depositOtherData.table2.reduce((sum, r) => sum + r.begBal, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.addAmt, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.interest, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.otherAdd, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.closeAmt, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.transInterest, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.endBal, 0),
          depositOtherData.table2.reduce((sum, r) => sum + r.count, 0)
        ],
        [],
        ['รวมทั้งสิ้น', '',
          depositOtherData.table1.reduce((sum, r) => sum + r.begBal, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.begBal, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.addAmt, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.addAmt, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.interest, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.interest, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.otherAdd, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.otherAdd, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.closeAmt, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.closeAmt, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.transInterest, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.transInterest, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.endBal, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.endBal, 0),
          depositOtherData.table1.reduce((sum, r) => sum + r.count, 0) + depositOtherData.table2.reduce((sum, r) => sum + r.count, 0)
        ],
        [],
        ['วิธีการตรวจสอบ:'],
        ...depositOtherData.methods.map((m, idx) => [idx + 1, m.text, m.checked ? '[✓] ตรวจแล้ว' : '[-] ไม่ได้ตรวจ']),
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [depositOtherData.conclusionNotes]
      ];
      cols = [
        { wch: 35 }, // ชื่อสหกรณ์
        { wch: 15 }, // อัตราดอกเบี้ย
        { wch: 22 }, // ยอดยกมาต้นงวด
        { wch: 22 }, // ฝากเพิ่มระหว่างงวด
        { wch: 22 }, // ดอกเบี้ยจ่ายงวดนี้
        { wch: 18 }, // รายการเพิ่มอื่น
        { wch: 22 }, // ถอนปิดบัญชี
        { wch: 25 }, // รายการถอนโอนดอกเบี้ยสิ้นงวด
        { wch: 22 }, // ยอดยกไปสิ้นงวด
        { wch: 20 }  // จำนวนบัญชีคงเหลือ
      ];
    } else if (activeTab === 'loan') {
      title = 'กระดาษทำการเงินกู้ยืม';
      const showCode = loanData.showAccountCode !== false;
      const showCalc = loanData.showCalcInterest !== false;
      const showDiff = loanData.showDiffInterest !== false;

      const getDaysInMonth = (monthName: string): number => {
        if (!monthName) return 31;
        const name = monthName.trim();
        if (name.includes('คม')) return 31;
        if (name.includes('ยน')) return 30;
        if (name.includes('กุมภาพันธ์')) {
          const match = name.match(/\d+/);
          if (match) {
            const year = parseInt(match[0]);
            const westernYear = year > 2400 ? year - 543 : year;
            const isLeap = (westernYear % 4 === 0 && westernYear % 100 !== 0) || westernYear % 400 === 0;
            return isLeap ? 29 : 28;
          }
          return 28;
        }
        return 31;
      };

      const parseInterestRate = (rateStr: string): number => {
        if (!rateStr) return 0;
        const cleaned = rateStr.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed / 100;
      };

      const calcInterestVal = (r: any) => {
        if (r.calcInterestOverride !== undefined && r.calcInterestOverride !== null && r.calcInterestOverride !== '') {
          return Number(r.calcInterestOverride);
        }
        const rate = parseInterestRate(r.rate);
        const daysVal = loanData.calcDays !== undefined && loanData.calcDays !== '' ? Number(loanData.calcDays) : getDaysInMonth(loanData.inspectMonth);
        const divisorVal = loanData.calcDivisor !== undefined && loanData.calcDivisor !== '' ? Number(loanData.calcDivisor) : 365;
        const days = isNaN(daysVal) ? 30 : daysVal;
        const divisor = isNaN(divisorVal) || divisorVal === 0 ? 365 : divisorVal;
        return r.begBal * rate * days / divisor;
      };

      const headerRow = [
        'แหล่งเงินกู้ยืม',
        ...(showCode ? ['รหัสบัญชี'] : []),
        'อัตราดอกเบี้ย',
        ...(showCalc ? ['ดอกเบี้ยคำนวณตามสูตร'] : []),
        'ยอดยกมาต้นงวด',
        'กู้ยืมเพิ่มระหว่างงวด',
        'ดอกเบี้ยจ่ายงวดนี้',
        'รายการเพิ่มอื่น',
        'ชำระคืนเงินกู้ยืม',
        ...(showDiff ? ['รายการผลต่างดอกเบี้ยจ่าย'] : []),
        'ยอดยกไปสิ้นงวด',
        'จำนวนบัญชีคงเหลือ'
      ];

      const mapRow = (r: any) => [
        r.name,
        ...(showCode ? [r.code || ''] : []),
        r.rate,
        ...(showCalc ? [calcInterestVal(r)] : []),
        r.begBal,
        r.addAmt,
        r.interest,
        r.otherAdd,
        r.closeAmt,
        ...(showDiff ? [calcInterestVal(r) - r.interest] : []),
        r.endBal,
        r.count
      ];

      const mapTotalRow = (label: string, table: any[]) => [
        label,
        ...(showCode ? [''] : []),
        '',
        ...(showCalc ? [table.reduce((sum, r) => sum + calcInterestVal(r), 0)] : []),
        table.reduce((sum, r) => sum + r.begBal, 0),
        table.reduce((sum, r) => sum + r.addAmt, 0),
        table.reduce((sum, r) => sum + r.interest, 0),
        table.reduce((sum, r) => sum + r.otherAdd, 0),
        table.reduce((sum, r) => sum + r.closeAmt, 0),
        ...(showDiff ? [table.reduce((sum, r) => sum + (calcInterestVal(r) - r.interest), 0)] : []),
        table.reduce((sum, r) => sum + r.endBal, 0),
        table.reduce((sum, r) => sum + r.count, 0)
      ];

      const mapGrandTotalRow = () => [
        'รวมทั้งสิ้น',
        ...(showCode ? [''] : []),
        '',
        ...(showCalc ? [loanData.table1.reduce((sum, r) => sum + calcInterestVal(r), 0) + loanData.table2.reduce((sum, r) => sum + calcInterestVal(r), 0)] : []),
        loanData.table1.reduce((sum, r) => sum + r.begBal, 0) + loanData.table2.reduce((sum, r) => sum + r.begBal, 0),
        loanData.table1.reduce((sum, r) => sum + r.addAmt, 0) + loanData.table2.reduce((sum, r) => sum + r.addAmt, 0),
        loanData.table1.reduce((sum, r) => sum + r.interest, 0) + loanData.table2.reduce((sum, r) => sum + r.interest, 0),
        loanData.table1.reduce((sum, r) => sum + r.otherAdd, 0) + loanData.table2.reduce((sum, r) => sum + r.otherAdd, 0),
        loanData.table1.reduce((sum, r) => sum + r.closeAmt, 0) + loanData.table2.reduce((sum, r) => sum + r.closeAmt, 0),
        ...(showDiff ? [
          loanData.table1.reduce((sum, r) => sum + (calcInterestVal(r) - r.interest), 0) +
          loanData.table2.reduce((sum, r) => sum + (calcInterestVal(r) - r.interest), 0)
        ] : []),
        loanData.table1.reduce((sum, r) => sum + r.endBal, 0) + loanData.table2.reduce((sum, r) => sum + r.endBal, 0),
        loanData.table1.reduce((sum, r) => sum + r.count, 0) + loanData.table2.reduce((sum, r) => sum + r.count, 0)
      ];

      wsData = [
        [loanData.cooperativeName, '', '', '', '', '', '', '', '', '', '', 'ดัชนีอ้างอิง F-3'],
        ['กระดาษทำการ เงินกู้ยืม', '', '', '', '', '', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${loanData.periodText}`, '', '', '', '', '', '', '', '', 'ผู้จัดทำ', loanData.auditorName, loanData.inspectDateText],
        ['', '', '', '', '', '', '', '', '', 'ผู้สอบทาน', loanData.reviewerName, loanData.reviewDateText !== undefined ? loanData.reviewDateText : getReviewDateText(loanData.inspectDateText)],
        [],
        headerRow,
        ['--- ตารางที่ 1 ---'],
        ...loanData.table1.map(r => mapRow(r)),
        mapTotalRow('รวมตารางที่ 1', loanData.table1),
        [],
        ['--- ตารางที่ 2 ---'],
        ...loanData.table2.map(r => mapRow(r)),
        mapTotalRow('รวมตารางที่ 2', loanData.table2),
        [],
        mapGrandTotalRow(),
        [],
        ['วิธีการตรวจสอบ:'],
        ...loanData.methods.map((m, idx) => [idx + 1, m.text, m.checked ? '[✓] ตรวจแล้ว' : '[-] ไม่ได้ตรวจ']),
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [loanData.conclusionNotes]
      ];
      cols = [
        { wch: 35 }, // แหล่งเงินกู้ยืม
        ...(showCode ? [{ wch: 15 }] : []), // รหัสบัญชี
        { wch: 15 }, // อัตราดอกเบี้ย
        ...(showCalc ? [{ wch: 22 }] : []), // ดอกเบี้ยคำนวณตามสูตร
        { wch: 22 }, // ยอดยกมาต้นงวด
        { wch: 22 }, // กู้ยืมเพิ่มระหว่างงวด
        { wch: 22 }, // ดอกเบี้ยจ่ายงวดนี้
        { wch: 18 }, // รายการเพิ่มอื่น
        { wch: 22 }, // ชำระคืนเงินกู้ยืม
        { wch: 25 }, // รายการถอนโอนดอกเบี้ยสิ้นงวด
        { wch: 22 }, // ยอดยกไปสิ้นงวด
        { wch: 20 }  // จำนวนบัญชีคงเหลือ
      ];
    } else if (activeTab === 'share') {
      title = 'กระดาษทำการทุนเรือนหุ้น';
      const begMembersGen = shareData.begMembersGeneral !== undefined ? shareData.begMembersGeneral : 2280;
      const begMembersAssoc = shareData.begMembersAssociate !== undefined ? shareData.begMembersAssociate : 103;

      const newMembersGen = shareData.newMembersGeneral !== undefined ? shareData.newMembersGeneral : 10;
      const newMembersAssoc = shareData.newMembersAssociate !== undefined ? shareData.newMembersAssociate : 1;

      const resignedMembersGen = shareData.resignedMembersGeneral !== undefined ? shareData.resignedMembersGeneral : 1;
      const resignedMembersAssoc = shareData.resignedMembersAssociate !== undefined ? shareData.resignedMembersAssociate : 0;

      const totNewMembers = newMembersGen + newMembersAssoc;
      const totResignedMembers = resignedMembersGen + resignedMembersAssoc;

      const endMembersGen = begMembersGen + newMembersGen - resignedMembersGen;
      const endMembersAssoc = begMembersAssoc + newMembersAssoc - resignedMembersAssoc;
      const endMembersTot = endMembersGen + endMembersAssoc;

      wsData = [
        [shareData.cooperativeName, '', '', 'ดัชนีอ้างอิง H-1'],
        ['กระดาษทำการ ทุนเรือนหุ้น', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${shareData.periodText}`, '', '', 'ผู้จัดทำ', shareData.auditorName, shareData.inspectDateText],
        ['', '', '', 'ผู้สอบทาน', shareData.reviewerName, shareData.reviewDateText !== undefined ? shareData.reviewDateText : getReviewDateText(shareData.inspectDateText)],
        [],
        ['รหัสบัญชี', 'รายการรายละเอียด', 'จำนวนเงิน (บาท)', 'รายละเอียด/สถิติ'],
        [shareData.begBalGlAccount || '31000', `ยอดยกมา 1 ${shareData.inspectMonth || 'พฤษภาคม 2569'}`, shareData.begBal, `ยกมา: สามัญ ${begMembersGen.toLocaleString()} ราย, สมทบ ${begMembersAssoc.toLocaleString()} ราย (รวม ${(begMembersGen + begMembersAssoc).toLocaleString()} ราย)`],
        [shareData.newMemberGlAccount || '', 'สมาชิกเข้าใหม่ระหว่างงวด', shareData.newMemberAmt, `เข้าใหม่: สามัญ ${newMembersGen.toLocaleString()} ราย, สมทบ ${newMembersAssoc.toLocaleString()} ราย (รวม ${totNewMembers.toLocaleString()} ราย)`],
        [shareData.entranceFeeGlAccount || '42050', `ค่าธรรมเนียมแรกเข้า (รายละ ${shareData.entranceFeePerPerson || 100} บาท)`, shareData.entranceFee, shareData.entranceFeeDetails || 'ค่าธรรมเนียมแรกเข้ารับจริง'],
        [shareData.otherAdditionsGlAccount || '31000', 'รายการเพิ่มอื่นระหว่างงวด (ซื้อหุ้นเพิ่ม)', shareData.otherAdditions, shareData.otherAdditionsDetails || 'รายการรับชำระค่าหุ้นรายเดือน'],
        [shareData.resignedAmtGlAccount || '31000', 'สมาชิกลาออกระหว่างงวด (ถอนคืน)', shareData.resignedAmt, `ลาออก: สามัญ ${resignedMembersGen.toLocaleString()} ราย, สมทบ ${resignedMembersAssoc.toLocaleString()} ราย (รวม ${totResignedMembers.toLocaleString()} ราย)`],
        ['', `ยอดยกไป ${getLastDayOfMonthText(shareData.inspectMonth)}`, shareData.endBal, `สมาชิกสิ้นงวด ${endMembersTot.toLocaleString()} ราย (สามัญ ${endMembersGen.toLocaleString()}, สมทบ ${endMembersAssoc.toLocaleString()} ราย)`],
        [],
        ['สถิติสมาชิก ณ สิ้นงวด:'],
        ['', 'สามัญ', endMembersGen, 'ราย'],
        ['', 'สมทบ', endMembersAssoc, 'ราย'],
        ['', 'รวมสมาชิกทั้งสิ้น', endMembersTot, 'ราย'],
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [shareData.conclusionNotes]
      ];
      cols = [
        { wch: 15 }, // รหัสบัญชี
        { wch: 45 }, // รายการรายละเอียด
        { wch: 25 }, // จำนวนเงิน
        { wch: 35 }  // รายละเอียดเพิ่มเติม
      ];
    } else if (activeTab === 'reserve') {
      title = 'กระดาษทำการทุนสะสม';
      wsData = [
        [reserveData.cooperativeName, '', '', '', '', '', 'ดัชนีอ้างอิง H-3'],
        ['กระดาษทำการ ทุนสะสมตามข้อบังคับ ระเบียบ และอื่นๆ', '', '', '', '', 'ชื่อ', 'วันที่'],
        [`สำหรับงวดเข้าตรวจ ${reserveData.periodText}`, '', '', '', '', 'ผู้จัดทำ', reserveData.auditorName, reserveData.inspectDateText],
        ['', '', '', '', '', 'ผู้สอบทาน', reserveData.reviewerName, reserveData.reviewDateText !== undefined ? reserveData.reviewDateText : getReviewDateText(reserveData.inspectDateText)],
        [],
        ['รหัสบัญชี', 'รายการทุนสะสม', 'ยอดคงเหลือต้นงวด', 'เพิ่มระหว่างงวด', 'ลดระหว่างงวด', 'ยอดคงเหลือสิ้นงวด', 'หมายเหตุ'],
        ...reserveData.rows.map(r => [r.code, r.name, r.begBal, r.addAmt, r.decAmt, r.endBal, r.remarks || '']),
        ['รวมทั้งสิ้น', '', 
          reserveData.rows.reduce((sum, r) => sum + r.begBal, 0),
          reserveData.rows.reduce((sum, r) => sum + r.addAmt, 0),
          reserveData.rows.reduce((sum, r) => sum + r.decAmt, 0),
          reserveData.rows.reduce((sum, r) => sum + r.endBal, 0),
          ''
        ],
        [],
        ['สรุปผลการตรวจสอบ / ข้อสังเกตอื่นๆ:'],
        [reserveData.conclusionNotes]
      ];
      cols = [
        { wch: 15 }, // รหัสบัญชี
        { wch: 35 }, // รายการทุนสะสม
        { wch: 22 }, // ยอดคงเหลือต้นงวด
        { wch: 22 }, // เพิ่มระหว่างงวด
        { wch: 22 }, // ลดระหว่างงวด
        { wch: 22 }, // ยอดคงเหลือสิ้นงวด
        { wch: 30 }  // หมายเหตุ
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = cols;
    ws['!views'] = [{ showGridLines: true }];
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}_${bankData.cooperativeName}_สำหรับงวด_${bankData.inspectMonth}.xlsx`);
  };

  // Helper formatting for Thai currency
  const formatCur = (v: number) => {
    if (v === 0) return '-';
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  return (
    <>
      {/* Top Warning Banner if in Iframe */}
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

      <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-50 font-thai select-text">
      
      {/* 1. TOP HEADER & FILE UPLOADER PANEL */}
      <div className="bg-white border-b border-slate-200 p-4 shrink-0 no-print">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-800">สร้างกระดาษทำการสำหรับงานตรวจกิจการ</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                อัพโหลดไฟล์งบทดลอง และ บัญชีแยกประเภท (.xlsx/.xls) เพื่อนำข้อมูลลงในกระดาษทำการตรวจสอบโดยอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cooperative Selector Dropdown */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
              <span className="text-xs font-bold text-slate-500 shrink-0">เลือกสหกรณ์ที่เข้าตรวจ:</span>
              <select
                value={selectedCoopId}
                onChange={(e) => setSelectedCoopId(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 p-2 cursor-pointer focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {(letters || INITIAL_LETTERS).map((coop: any) => (
                  <option key={coop.id} value={coop.id}>
                    {coop.orgName} ({coop.inspectionMonth})
                  </option>
                ))}
                {selectedCoopId === 'imported' && (
                  <option value="imported">
                    {bankData.cooperativeName || 'สหกรณ์ (นำเข้าไฟล์ต้นฉบับ)'}
                  </option>
                )}
              </select>
            </div>

            {/* Load demo figures */}
            <button
              onClick={loadDemoData}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 shrink-0"
              title="ดึงข้อมูลตัวอย่างประจำเดือน พฤษภาคม 2569 เพื่อทดลองโปรแกรม"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              ดึงข้อมูลตัวอย่าง พ.ค. 2569
            </button>

            {/* Main Upload Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 1. Trial Balance Upload */}
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv, .pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingTB}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border doc-shadow ${
                    isParsingTB
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 cursor-not-allowed animate-pulse'
                      : uploadStatus === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                  }`}
                  title="อัพโหลดไฟล์งบทดลอง (.xlsx, .xls, .csv, .pdf) เพื่อดึงยอดบัญชีรายวิชาการและเงินกู้ต่าง ๆ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    {isParsingTB 
                      ? 'กำลังวิเคราะห์ PDF...' 
                      : uploadStatus === 'success' 
                      ? '✓ งบทดลองนำเข้าแล้ว' 
                      : '1. อัพโหลดงบทดลอง'}
                  </span>
                </button>
              </div>

              {/* 2. General Ledger Upload */}
              <div className="relative">
                <input
                  type="file"
                  ref={ledgerInputRef}
                  accept=".xlsx, .xls, .csv, .pdf"
                  onChange={handleLedgerUpload}
                  className="hidden"
                />
                <button
                  onClick={() => ledgerInputRef.current?.click()}
                  disabled={isParsingLedger}
                  className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border doc-shadow ${
                    isParsingLedger
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-200 cursor-not-allowed animate-pulse'
                      : ledgerUploadStatus === 'success'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                  }`}
                  title="อัพโหลดไฟล์บัญชีแยกประเภท (.xlsx, .xls, .csv, .pdf) เพื่อดึงและเทียบยอดเงินฝากธนาคารแยกบัญชี"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isParsingLedger 
                      ? 'กำลังวิเคราะห์ PDF...' 
                      : ledgerUploadStatus === 'success' 
                      ? '✓ แยกประเภทนำเข้าแล้ว' 
                      : '2. อัพโหลดบัญชีแยกประเภท'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload status messages */}
        {(uploadStatus !== 'idle' || ledgerUploadStatus !== 'idle') && (
          <div className="max-w-7xl mx-auto mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {uploadStatus !== 'idle' && (
              <div>
                {uploadStatus === 'success' ? (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="leading-relaxed">
                        นำเข้า <strong>งบทดลอง</strong> สำเร็จ! พบข้อมูล <strong>{parsedCount}</strong> บัญชีจากไฟล์ <strong>{fileName}</strong> ระบบทำการจำแนกยอดอัตโนมัติแล้ว
                      </span>
                    </div>
                    <button 
                      onClick={() => { setUploadStatus('idle'); setFileName(''); }}
                      className="text-emerald-600 font-bold hover:underline ml-4 shrink-0 cursor-pointer"
                    >
                      ล้างข้อมูล
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="leading-relaxed">เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์งบทดลอง กรุณาตรวจสอบว่ามีเลขบัญชี 5 หลัก และยอดคงเหลือครบถ้วน</span>
                    </div>
                    <button 
                      onClick={() => setUploadStatus('idle')}
                      className="text-rose-600 font-bold hover:underline ml-4 shrink-0 cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                )}
              </div>
            )}

            {ledgerUploadStatus !== 'idle' && (
              <div>
                {ledgerUploadStatus === 'success' ? (
                  <div className="p-2.5 bg-indigo-50 text-indigo-800 text-xs rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="leading-relaxed">
                        นำเข้า <strong>บัญชีแยกประเภท</strong> สำเร็จ! พบ <strong>{ledgerParsedCount}</strong> บัญชีจากไฟล์ <strong>{ledgerFileName}</strong> และอัพเดทลงกระดาษทำการเงินฝากธนาคารเรียบร้อยแล้ว
                      </span>
                    </div>
                    <button 
                      onClick={() => { setLedgerUploadStatus('idle'); setLedgerFileName(''); setLedgerAccounts([]); }}
                      className="text-indigo-600 font-bold hover:underline ml-4 shrink-0 cursor-pointer"
                    >
                      ล้างข้อมูล
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="leading-relaxed">เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์บัญชีแยกประเภท กรุณาตรวจสอบคอลัมน์รหัสบัญชีแยกประเภทและตัวเลขยอดคงเหลือ</span>
                    </div>
                    <button 
                      onClick={() => setLedgerUploadStatus('idle')}
                      className="text-rose-600 font-bold hover:underline ml-4 shrink-0 cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. WORKING PAPER EDITOR & WYSIWYG CANVAS */}
      <div className="flex-1 overflow-y-auto p-6 wp-editor-workspace">
        <div className="max-w-5xl mx-auto space-y-6 wp-editor-content">
          
          {/* Action Bar inside workspace */}
          <div className="flex flex-col gap-4 pb-4 border-b border-slate-200 no-print">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                    แก้ไขข้อมูลสดเพื่อบันทึกหรือส่งออก
                  </span>
                  <p className="text-[10px] text-slate-400">คุณสามารถพิมพ์ใบงานเป็น PDF บันทึกต้นฉบับ หรือส่งออกเป็นไฟล์สเปรดชีต Excel ได้ทันที</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Autosave status indicator */}
                {lastSaved ? (
                  <div 
                    className="px-2.5 py-1.5 bg-emerald-50/80 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-emerald-200/60 shadow-sm transition-all"
                    title="ระบบบันทึกความคืบหน้าของสหกรณ์นี้ไว้ในเบราว์เซอร์ของคุณเรียบร้อยแล้วโดยอัตโนมัติ"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>บันทึกอัตโนมัติแล้ว ({lastSaved})</span>
                  </div>
                ) : (
                  <div 
                    className="px-2.5 py-1.5 bg-slate-50 text-slate-400 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-slate-200"
                    title="เมื่อป้อนหรือแก้ไขข้อมูล ระบบจะบันทึกให้อัตโนมัติทันที"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>
                    <span>ระบบบันทึกอัตโนมัติพร้อมทำงาน</span>
                  </div>
                )}

                {/* Save template (JSON) */}
                <button
                  onClick={handleExportConfig}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 doc-shadow"
                  title="บันทึกหัวข้อบัญชี เลขบัญชี และข้อมูลที่ป้อนลงเครื่องเพื่อใช้ตรวจรอบหน้า"
                >
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  บันทึกต้นฉบับ (.json)
                </button>

                {/* Load template (JSON) */}
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputConfigRef}
                    accept=".json"
                    onChange={handleImportConfig}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputConfigRef.current?.click()}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 doc-shadow"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                    นำเข้าต้นฉบับ (.json)
                  </button>
                </div>

                {/* Print Scope Selector */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setPrintScope('current')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      printScope === 'current'
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    พิมพ์เฉพาะใบงานนี้
                  </button>
                  <button
                    onClick={() => setPrintScope('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      printScope === 'all'
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    พิมพ์ทุกใบงาน (5 ใบ)
                  </button>
                </div>

                {/* Print to PDF */}
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer doc-shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {printScope === 'all' ? 'สั่งพิมพ์ทุกใบงาน (5 ใบ)' : 'สั่งพิมพ์ใบงานนี้'}
                </button>

                {/* Export Excel */}
                <button
                  onClick={exportToExcel}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-950 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer doc-shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  ดาวน์โหลดเป็น Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Sliders for Dynamic Sizing & Styling of all tables */}
            <div className="bg-slate-100/60 rounded-xl p-3 border border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold text-slate-700 block">ปรับขนาดและมิติตาราง (Table Spacing & Sizes)</span>
                  <p className="text-[10px] text-slate-500">ปรับแต่งความสูงช่อง คอลัมน์ และขนาดอักษรเพื่อปรับแต่งหน้าพิมพ์</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Row Height Slider */}
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-500">ความสูงแถว:</span>
                  <input 
                    type="range" 
                    min={2} 
                    max={20} 
                    value={tableStyles.rowHeight} 
                    onChange={(e) => setTableStyles({ ...tableStyles, rowHeight: parseInt(e.target.value) })}
                    className="w-16 sm:w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-700 w-6 text-right">{tableStyles.rowHeight}px</span>
                </div>
                
                {/* Cell Padding X Slider */}
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-500">ความกว้างคอลัมน์:</span>
                  <input 
                    type="range" 
                    min={2} 
                    max={24} 
                    value={tableStyles.cellPaddingX} 
                    onChange={(e) => setTableStyles({ ...tableStyles, cellPaddingX: parseInt(e.target.value) })}
                    className="w-16 sm:w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-700 w-6 text-right">{tableStyles.cellPaddingX}px</span>
                </div>

                {/* Font Size Slider */}
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-500">ขนาดอักษร:</span>
                  <input 
                    type="range" 
                    min={8} 
                    max={16} 
                    value={tableStyles.fontSize} 
                    onChange={(e) => setTableStyles({ ...tableStyles, fontSize: parseInt(e.target.value) })}
                    className="w-16 sm:w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-700 w-6 text-right">{tableStyles.fontSize}pt</span>
                </div>
              </div>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Force all parent containers to expand vertically and be visible in print */
              html, body, #root,
              div[class*="min-h-screen"],
              div[class*="h-screen"],
              div[class*="h-[calc(100vh"],
              main,
              .flex-1,
              .wp-editor-workspace {
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                overflow-y: visible !important;
                overflow-x: visible !important;
                position: static !important;
                display: block !important;
                padding: 0mm !important;
                margin: 0mm !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }

              .wp-editor-content {
                max-width: none !important;
                width: 100% !important;
                margin: 0px !important;
                padding: 0px !important;
              }

              /* Hide other elements */
              .no-print,
              header,
              aside,
              .bg-white.border-b.border-slate-200.p-4.shrink-0 {
                display: none !important;
              }

              @page {
                size: A4 portrait;
                margin-top: 20mm !important;
                margin-bottom: 20mm !important;
                margin-left: 18mm !important;
                margin-right: 18mm !important;
              }
              .wp-print-container {
                padding: 0mm !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                background: transparent !important;
                color: #000000 !important;
              }
              /* Enforce headers and important texts to be crisp black in print */
              .wp-print-container h1,
              .wp-print-container h2,
              .wp-print-container h3,
              .wp-print-container h4,
              .wp-print-container strong {
                color: #000000 !important;
                font-weight: bold !important;
              }
              /* Tables styled professionally with solid borders and legible sizes */
              .wp-print-container table:not(.spreadsheet-table) {
                border-collapse: collapse !important;
                width: 100% !important;
                border: 1.5px solid #000000 !important;
                font-size: ${tableStyles.fontSize}pt !important;
                margin-top: 8px !important;
                margin-bottom: 16px !important;
              }
              .wp-print-container table:not(.spreadsheet-table) th {
                border: 1px solid #000000 !important;
                background-color: #f1f5f9 !important;
                color: #000000 !important;
                font-weight: bold !important;
                padding-top: ${tableStyles.rowHeight}px !important;
                padding-bottom: ${tableStyles.rowHeight}px !important;
                padding-left: ${tableStyles.cellPaddingX}px !important;
                padding-right: ${tableStyles.cellPaddingX}px !important;
                text-align: center !important;
              }
              .wp-print-container table:not(.spreadsheet-table) td {
                border: 1px solid #000000 !important;
                color: #000000 !important;
                padding-top: ${tableStyles.rowHeight}px !important;
                padding-bottom: ${tableStyles.rowHeight}px !important;
                padding-left: ${tableStyles.cellPaddingX}px !important;
                padding-right: ${tableStyles.cellPaddingX}px !important;
              }
              /* Spreadsheet Table Styles */
              .wp-print-container table.spreadsheet-table {
                border-collapse: collapse !important;
                width: 100% !important;
                border: 1px solid #cbd5e1 !important;
                font-size: ${tableStyles.fontSize}pt !important;
                margin-top: 8px !important;
                margin-bottom: 16px !important;
              }
              .wp-print-container table.spreadsheet-table td {
                border: 1px solid #cbd5e1 !important;
                padding-top: ${tableStyles.rowHeight}px !important;
                padding-bottom: ${tableStyles.rowHeight}px !important;
                padding-left: ${tableStyles.cellPaddingX}px !important;
                padding-right: ${tableStyles.cellPaddingX}px !important;
              }
              .wp-print-container input {
                border: none !important;
                outline: none !important;
                background: transparent !important;
                box-shadow: none !important;
                padding: 0px !important;
                margin: 0px !important;
                text-align: inherit !important;
                font-family: inherit !important;
                font-size: inherit !important;
                font-weight: inherit !important;
                color: #000000 !important;
                width: 100% !important;
                -webkit-appearance: none !important;
                appearance: none !important;
              }
              .wp-print-container input::placeholder {
                color: transparent !important;
              }
              /* Styled Audit Conclusions for maximum clarity in PDF print */
              .wp-print-container .print-conclusion-box {
                font-size: 12pt !important;
                font-weight: 500 !important;
                border: 1.5px solid #000000 !important;
                border-radius: 8px !important;
                padding: 12px !important;
                background-color: #f8fafc !important;
                color: #000000 !important;
                min-height: 110px !important;
                line-height: 1.6 !important;
                box-shadow: none !important;
              }
              /* Retain exact colors and backgrounds */
              .wp-print-container,
              .wp-print-container * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .wp-print-container .bg-slate-50 {
                background-color: #f8fafc !important;
              }
              .wp-print-container .bg-emerald-50 {
                background-color: #ecfdf5 !important;
              }
              .wp-print-container .bg-emerald-50/20 {
                background-color: rgba(236, 253, 245, 0.2) !important;
              }
              .wp-print-container .bg-slate-50/80 {
                background-color: rgba(248, 250, 252, 0.8) !important;
              }
              .page-break-after-always {
                page-break-after: always !important;
                break-after: page !important;
              }
              .wp-print-container .overflow-x-auto {
                overflow: visible !important;
                overflow-x: visible !important;
              }
              .wp-print-container table {
                page-break-inside: auto !important;
              }
              .wp-print-container tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
            }
          ` }} />

          {/* ==================== TAB 1: BANK DEPOSITS ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('bank')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{bankData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการเงินฝากธนาคาร และเงินฝากสหกรณ์อื่น</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {bankData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง A-1</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={bankData.auditorName || ''} onChange={(val) => setBankData({ ...bankData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{bankData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={bankData.inspectDateText || ''}
                              onChange={(e) => setBankData({ ...bankData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{bankData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={bankData.reviewerName || ''} onChange={(val) => setBankData({ ...bankData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{bankData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={bankData.reviewDateText !== undefined ? bankData.reviewDateText : getReviewDateText(bankData.inspectDateText)}
                              onChange={(e) => setBankData({ ...bankData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {bankData.reviewDateText !== undefined ? bankData.reviewDateText : getReviewDateText(bankData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Savings account sections */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[14pt] font-extrabold text-slate-800">1. ประเภทเงินฝากออมทรัพย์</h3>
                  <button onClick={addSavingRow} className="no-print px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3" /> เพิ่มรายการ
                  </button>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[12pt] text-center" style={{ fontSize: `${tableStyles.fontSize}pt` }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 py-2 w-12 font-bold" style={cellStyle}>ลำดับ</th>
                      <th className="border border-slate-300 py-2 w-28 font-bold" style={cellStyle}>เลขบัญชีงบทดลอง</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold" style={cellStyle}>ธนาคาร</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>สาขา</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>เลขที่บัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามบัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามธนาคาร</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold" style={cellStyle}>ผลต่าง</th>
                      <th className="border border-slate-300 py-2 w-12 font-bold no-print" style={cellStyle}>ลบ</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold w-48" style={cellStyle}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankData.savings.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300" style={cellStyle}>{idx + 1}</td>
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={s.glAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = [...bankData.savings];
                              next[idx].glAccount = val;
                              const calc = calculateBankBalanceFromGL(val, tbAccounts);
                              if (calc.foundAny) {
                                next[idx].bookBalance = calc.balance;
                              } else {
                                next[idx].bookBalance = 0;
                              }
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full bg-transparent outline-none text-center font-mono focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-left px-2 font-bold" style={cellStyle}>
                          <input 
                            type="text" 
                            value={s.bank} 
                            onChange={(e) => {
                              const next = [...bankData.savings];
                              next[idx].bank = e.target.value;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 px-2" style={cellStyle}>
                          <input 
                            type="text" 
                            value={s.branch} 
                            onChange={(e) => {
                              const next = [...bankData.savings];
                              next[idx].branch = e.target.value;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center px-1"
                          />
                        </td>
                        <td className="border border-slate-300 font-mono text-[11pt] px-2" style={cellStyle}>
                          <input 
                            type="text" 
                            value={s.accountNo} 
                            onChange={(e) => {
                              const next = [...bankData.savings];
                              next[idx].accountNo = e.target.value;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center font-mono px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={s.bookBalance} 
                            onChange={(val) => {
                              const next = [...bankData.savings];
                              next[idx].bookBalance = val;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={s.bankBalance} 
                            onChange={(val) => {
                              const next = [...bankData.savings];
                              next[idx].bankBalance = val;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                            allowBlankZero={true}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-600" style={cellStyle}>
                          {formatCur(s.bookBalance - s.bankBalance)}
                        </td>
                        <td className="border border-slate-300 text-center no-print" style={cellStyle}>
                          <button onClick={() => deleteSavingRow(s.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                        <td className="border border-slate-300 px-2 text-left" style={cellStyle}>
                          <input 
                            type="text" 
                            value={s.remarks || ''} 
                            placeholder="เขียนหมายเหตุ..."
                            onChange={(e) => {
                              const next = [...bankData.savings];
                              next[idx].remarks = e.target.value;
                              setBankData({ ...bankData, savings: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-600 italic text-[10pt]"
                          />
                        </td>
                      </tr>
                    ))}
                    {/* Sum line */}
                    <tr className="bg-slate-100 font-extrabold text-slate-900">
                      <td colSpan={5} className="border border-slate-300 text-right px-3" style={cellStyle}>รวมออมทรัพย์</td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3" style={cellStyle}>
                        {formatCur(bankData.savings.reduce((sum, s) => sum + (s.bookBalance - s.bankBalance), 0))}
                      </td>
                      <td className="border border-slate-300 no-print" style={cellStyle}></td>
                      <td className="border border-slate-300" style={cellStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* currents account sections */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[14pt] font-extrabold text-slate-800">2. ประเภทเงินฝากกระแสรายวัน</h3>
                  <button onClick={addCurrentRow} className="no-print px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3" /> เพิ่มรายการ
                  </button>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[12pt] text-center" style={{ fontSize: `${tableStyles.fontSize}pt` }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 py-2 w-12 font-bold" style={cellStyle}>ลำดับ</th>
                      <th className="border border-slate-300 py-2 w-28 font-bold" style={cellStyle}>เลขบัญชีงบทดลอง</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold" style={cellStyle}>ธนาคาร</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>สาขา</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>เลขที่บัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามบัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามธนาคาร</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold" style={cellStyle}>ผลต่าง</th>
                      <th className="border border-slate-300 py-2 w-12 font-bold no-print" style={cellStyle}>ลบ</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold w-48" style={cellStyle}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankData.currents.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300" style={cellStyle}>{idx + 1}</td>
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={c.glAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = [...bankData.currents];
                              next[idx].glAccount = val;
                              const calc = calculateBankBalanceFromGL(val, tbAccounts);
                              if (calc.foundAny) {
                                next[idx].bookBalance = calc.balance;
                              } else {
                                next[idx].bookBalance = 0;
                              }
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full bg-transparent outline-none text-center font-mono focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-left px-2 font-bold" style={cellStyle}>
                          <input 
                            type="text" 
                            value={c.bank} 
                            onChange={(e) => {
                              const next = [...bankData.currents];
                              next[idx].bank = e.target.value;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 px-2" style={cellStyle}>
                          <input 
                            type="text" 
                            value={c.branch} 
                            onChange={(e) => {
                              const next = [...bankData.currents];
                              next[idx].branch = e.target.value;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center px-1"
                          />
                        </td>
                        <td className="border border-slate-300 font-mono text-[11pt] px-2" style={cellStyle}>
                          <input 
                            type="text" 
                            value={c.accountNo} 
                            onChange={(e) => {
                              const next = [...bankData.currents];
                              next[idx].accountNo = e.target.value;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center font-mono px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={c.bookBalance} 
                            onChange={(val) => {
                              const next = [...bankData.currents];
                              next[idx].bookBalance = val;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={c.bankBalance} 
                            onChange={(val) => {
                              const next = [...bankData.currents];
                              next[idx].bankBalance = val;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                            allowBlankZero={true}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-600" style={cellStyle}>
                          {formatCur(c.bookBalance - c.bankBalance)}
                        </td>
                        <td className="border border-slate-300 text-center no-print" style={cellStyle}>
                          <button onClick={() => deleteCurrentRow(c.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                        <td className="border border-slate-300 px-2 text-left" style={cellStyle}>
                          <input 
                            type="text" 
                            value={c.remarks || ''} 
                            placeholder="เขียนหมายเหตุ..."
                            onChange={(e) => {
                              const next = [...bankData.currents];
                              next[idx].remarks = e.target.value;
                              setBankData({ ...bankData, currents: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-600 italic text-[10pt]"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-extrabold text-slate-900">
                      <td colSpan={5} className="border border-slate-300 text-right px-3" style={cellStyle}>รวมกระแสรายวัน</td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3" style={cellStyle}>
                        {formatCur(bankData.currents.reduce((sum, c) => sum + (c.bookBalance - c.bankBalance), 0))}
                      </td>
                      <td className="border border-slate-300 no-print" style={cellStyle}></td>
                      <td className="border border-slate-300" style={cellStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Coops deposits section */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-[14pt] font-extrabold text-slate-800">3. เงินฝากสหกรณ์อื่น</h3>
                  <button onClick={addCoopRow} className="no-print px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3 h-3" /> เพิ่มรายการ
                  </button>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[12pt] text-center" style={{ fontSize: `${tableStyles.fontSize}pt` }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 py-2 w-12 font-bold" style={cellStyle}>ลำดับ</th>
                      <th className="border border-slate-300 py-2 w-28 font-bold" style={cellStyle}>เลขบัญชีงบทดลอง</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold" style={cellStyle}>สหกรณ์</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>ดอกเบี้ย</th>
                      <th className="border border-slate-300 py-2 font-bold" style={cellStyle}>เลขที่บัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามบัญชี</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดตามสหกรณ์</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold" style={cellStyle}>ผลต่าง</th>
                      <th className="border border-slate-300 py-2 w-12 font-bold no-print" style={cellStyle}>ลบ</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold w-48" style={cellStyle}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankData.coops.map((cp, idx) => (
                      <tr key={cp.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300" style={cellStyle}>{idx + 1}</td>
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={cp.glAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const next = [...bankData.coops];
                              next[idx].glAccount = val;
                              const calc = calculateBankBalanceFromGL(val, tbAccounts);
                              if (calc.foundAny) {
                                next[idx].bookBalance = calc.balance;
                              } else {
                                next[idx].bookBalance = 0;
                              }
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full bg-transparent outline-none text-center font-mono focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-left px-2 font-bold" style={cellStyle}>
                          <input 
                            type="text" 
                            value={cp.name} 
                            onChange={(e) => {
                              const next = [...bankData.coops];
                              next[idx].name = e.target.value;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 px-2 font-bold" style={cellStyle}>
                          <input 
                            type="text" 
                            value={cp.rate} 
                            onChange={(e) => {
                              const next = [...bankData.coops];
                              next[idx].rate = e.target.value;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center font-bold px-1"
                          />
                        </td>
                        <td className="border border-slate-300 font-mono text-[11pt] px-2" style={cellStyle}>
                          <input 
                            type="text" 
                            value={cp.accountNo} 
                            onChange={(e) => {
                              const next = [...bankData.coops];
                              next[idx].accountNo = e.target.value;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center font-mono px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={cp.bookBalance} 
                            onChange={(val) => {
                              const next = [...bankData.coops];
                              next[idx].bookBalance = val;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-800 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={cp.bankBalance} 
                            onChange={(val) => {
                              const next = [...bankData.coops];
                              next[idx].bankBalance = val;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                            allowBlankZero={true}
                          />
                        </td>
                        <td className="border border-slate-300 text-right px-3 font-bold text-slate-600" style={cellStyle}>
                          {formatCur(cp.bookBalance - cp.bankBalance)}
                        </td>
                        <td className="border border-slate-300 text-center no-print" style={cellStyle}>
                          <button onClick={() => deleteCoopRow(cp.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                        <td className="border border-slate-300 px-2 text-left" style={cellStyle}>
                          <input 
                            type="text" 
                            value={cp.remarks || ''} 
                            placeholder="เขียนหมายเหตุ..."
                            onChange={(e) => {
                              const next = [...bankData.coops];
                              next[idx].remarks = e.target.value;
                              setBankData({ ...bankData, coops: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-600 italic text-[10pt]"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-extrabold text-slate-900">
                      <td colSpan={5} className="border border-slate-300 py-2 text-right px-3" style={cellStyle}>รวมเงินฝากสหกรณ์อื่น</td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3 text-emerald-700 bg-slate-100/80" style={cellStyle}>
                        {formatCur(bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0))}
                      </td>
                      <td className="border border-slate-300 text-right px-3" style={cellStyle}>
                        {formatCur(bankData.coops.reduce((sum, cp) => sum + (cp.bookBalance - cp.bankBalance), 0))}
                      </td>
                      <td className="border border-slate-300 no-print" style={cellStyle}></td>
                      <td className="border border-slate-300" style={cellStyle}></td>
                    </tr>
                    {/* Grand Total */}
                    <tr className="bg-emerald-50 font-extrabold text-emerald-900 text-lg">
                      <td colSpan={5} className="border border-slate-300 py-3 text-right px-3" style={cellStyle}>รวมทั้งสิ้น</td>
                      <td className="border border-slate-300 py-3 text-right px-3 text-emerald-800 bg-emerald-50/80" style={cellStyle}>
                        {formatCur(
                          bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0) +
                          bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0) +
                          bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0)
                        )}
                      </td>
                      <td className="border border-slate-300 py-3 text-right px-3 text-emerald-800 bg-emerald-50/80" style={cellStyle}>
                        {formatCur(
                          bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0) +
                          bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0) +
                          bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0)
                        )}
                      </td>
                      <td className="border border-slate-300 py-3 text-right px-3" style={cellStyle}>
                        {formatCur(
                          (bankData.savings.reduce((sum, s) => sum + s.bookBalance, 0) +
                          bankData.currents.reduce((sum, c) => sum + c.bookBalance, 0) +
                          bankData.coops.reduce((sum, cp) => sum + cp.bookBalance, 0)) -
                          (bankData.savings.reduce((sum, s) => sum + s.bankBalance, 0) +
                          bankData.currents.reduce((sum, c) => sum + c.bankBalance, 0) +
                          bankData.coops.reduce((sum, cp) => sum + cp.bankBalance, 0))
                        )}
                      </td>
                      <td className="border border-slate-300 no-print" style={cellStyle}></td>
                      <td className="border border-slate-300" style={cellStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Auditing methodologies checkboxes & notes */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    วิธีการตรวจสอบ (Audit Methods)
                  </h4>
                  <ul className="space-y-2.5 text-[11pt] text-slate-700">
                    {bankData.methods.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                        const next = [...bankData.methods];
                        next[i].checked = !next[i].checked;
                        setBankData({ ...bankData, methods: next });
                      }}>
                        <div className="mt-1 shrink-0">
                          {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                        </div>
                        <span>{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    สรุปผลการตรวจสอบ (Audit Conclusions)
                  </h4>
                  <div className="relative">
                    <textarea
                      value={bankData.conclusionNotes}
                      onChange={(e) => setBankData({ ...bankData, conclusionNotes: e.target.value })}
                      className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                      placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                    />
                    <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                      {bankData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          {/* ==================== TAB 2: ACCOUNTS RECEIVABLE ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('debtor')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{debtorData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ ลูกหนี้เงินกู้</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {debtorData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง C-1</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={debtorData.auditorName || ''} onChange={(val) => setDebtorData({ ...debtorData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{debtorData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={debtorData.inspectDateText || ''}
                              onChange={(e) => setDebtorData({ ...debtorData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{debtorData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={debtorData.reviewerName || ''} onChange={(val) => setDebtorData({ ...debtorData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{debtorData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={debtorData.reviewDateText !== undefined ? debtorData.reviewDateText : getReviewDateText(debtorData.inspectDateText)}
                              onChange={(e) => setDebtorData({ ...debtorData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {debtorData.reviewDateText !== undefined ? debtorData.reviewDateText : getReviewDateText(debtorData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spreadsheet-like Table, Methods, and Summaries using a self-contained IIFE for local calculations */}
              {(() => {
                const getInspectionDates = (dateText: string, inspectMonth: string) => {
                  const cleaned = (dateText || '').trim();
                  if (cleaned) {
                    const parts = cleaned.split(/[-–—]/);
                    if (parts.length === 2) {
                      const startDayPart = parts[0].trim();
                      const endDayPart = parts[1].trim();
                      
                      let startText = startDayPart;
                      let endText = endDayPart;
                      
                      if (/^\d+$/.test(startText)) {
                        const match = endDayPart.match(/^\d+\s+(.+)$/);
                        if (match && match[1]) {
                          startText = `${startText} ${match[1]}`;
                        } else if (inspectMonth) {
                          startText = `${startText} ${inspectMonth}`;
                        }
                      }
                      return { startDateText: startText, endDateText: endText };
                    }
                  }
                  const monthStr = inspectMonth || 'พฤษภาคม 2569';
                  return {
                    startDateText: `1 ${monthStr}`,
                    endDateText: getLastDayOfMonthText(monthStr)
                  };
                };

                const { startDateText: finalStartDateText, endDateText: finalEndDateText } = getInspectionDates(debtorData.inspectDateText, debtorData.inspectMonth);

                const regularEndBal = debtorData.rows.regular.begBal + debtorData.rows.regular.addAmt + (debtorData.rows.regular.otherAddAmt || 0) - debtorData.rows.regular.decAmt;
                const specialEndBal = debtorData.rows.special.begBal + debtorData.rows.special.addAmt + (debtorData.rows.special.otherAddAmt || 0) - debtorData.rows.special.decAmt;
                const emergencyEndBal = debtorData.rows.emergency.begBal + debtorData.rows.emergency.addAmt + (debtorData.rows.emergency.otherAddAmt || 0) - debtorData.rows.emergency.decAmt;
                const otherEndBal = debtorData.rows.other.begBal + debtorData.rows.other.addAmt + (debtorData.rows.other.otherAddAmt || 0) - debtorData.rows.other.decAmt;

                const regularDifference = regularEndBal - debtorData.rows.regular.summaryAmt;
                const specialDifference = specialEndBal - debtorData.rows.special.summaryAmt;
                const emergencyDifference = emergencyEndBal - debtorData.rows.emergency.summaryAmt;
                const otherDifference = otherEndBal - debtorData.rows.other.summaryAmt;

                const updateRowField = (key: 'regular' | 'special' | 'emergency' | 'other', fieldName: string, value: any) => {
                  const row = debtorData.rows[key];
                  const updatedRow = { ...row, [fieldName]: value };
                  
                  const otherAddAmt = fieldName === 'otherAddAmt' 
                    ? value 
                    : (fieldName === 'addAmt' 
                        ? ((row.trxDebit || 0) - value) 
                        : (row.otherAddAmt !== undefined ? row.otherAddAmt : (row.trxDebit || 0)));
                  
                  const begBal = fieldName === 'begBal' ? value : row.begBal;
                  const addAmt = fieldName === 'addAmt' ? value : row.addAmt;
                  const decAmt = fieldName === 'decAmt' ? value : row.decAmt;
                  const summaryAmt = fieldName === 'summaryAmt' ? value : row.summaryAmt;
                  
                  const endBal = begBal + addAmt + otherAddAmt - decAmt;
                  const difference = endBal - summaryAmt;
                  
                  updatedRow.otherAddAmt = otherAddAmt;
                  updatedRow.endBal = endBal;
                  updatedRow.difference = difference;
                  
                  setDebtorData({
                    ...debtorData,
                    rows: {
                      ...debtorData.rows,
                      [key]: updatedRow
                    }
                  });
                };

                return (
                  <>
                    {/* Debtor Table (Spreadsheet Style) */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-300 text-[11pt] table-fixed spreadsheet-table bg-white">
                        <colgroup>
                          <col className="w-[30%]" />
                          <col className="w-[17.5%]" />
                          <col className="w-[17.5%]" />
                          <col className="w-[17.5%]" />
                          <col className="w-[17.5%]" />
                        </colgroup>
                        <tbody>
                          {/* Row 1: Header */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black bg-slate-50/50">
                              <div className="flex items-center justify-between gap-1">
                                <span>ยอดตามบัญชี :</span>
                                <button
                                  type="button"
                                  onClick={() => setDebtorData(prev => ({ ...prev, hideGlAccountLine: !prev.hideGlAccountLine }))}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors no-print shrink-0"
                                  title={debtorData.hideGlAccountLine ? "แสดงรหัสบัญชีจากงบทดลอง" : "ซ่อนบรรทัดรหัสบัญชี"}
                                >
                                  {debtorData.hideGlAccountLine ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                </button>
                              </div>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[90%] text-center">
                                <input
                                  type="text"
                                  value={debtorData.rows.regular.name}
                                  onChange={(e) => updateRowField('regular', 'name', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[90%] text-center">
                                <input
                                  type="text"
                                  value={debtorData.rows.special.name}
                                  onChange={(e) => updateRowField('special', 'name', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[90%] text-center">
                                <input
                                  type="text"
                                  value={debtorData.rows.emergency.name}
                                  onChange={(e) => updateRowField('emergency', 'name', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[90%] text-center">
                                <input
                                  type="text"
                                  value={debtorData.rows.other.name}
                                  onChange={(e) => updateRowField('other', 'name', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-bold text-black text-xs"
                                />
                              </span>
                            </td>
                          </tr>

                          {!debtorData.hideGlAccountLine && (
                            <tr className="h-10 no-print">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-500 bg-slate-50/20 text-[10pt]">
                                รหัสบัญชี (จากงบทดลอง)
                              </td>
                              <td className="border border-slate-200 px-2 py-1 text-center font-mono bg-emerald-50/10">
                                <input
                                  type="text"
                                  value={debtorData.regularGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const calc = calculateDebtorRowValuesFromGL(val, tbAccounts);
                                    setDebtorData(prev => ({
                                      ...prev,
                                      regularGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        regular: {
                                          ...prev.rows.regular,
                                          begBal: calc.foundAny ? calc.begBal : prev.rows.regular.begBal,
                                          addAmt: 0.00,
                                          trxDebit: calc.foundAny ? calc.trxDebit : prev.rows.regular.trxDebit,
                                          otherAddAmt: calc.foundAny ? (calc.trxDebit - 0.00) : prev.rows.regular.otherAddAmt,
                                          decAmt: calc.foundAny ? calc.trxCredit : prev.rows.regular.decAmt,
                                          endBal: calc.foundAny ? (calc.begBal + 0.00 + (calc.trxDebit - 0.00) - calc.trxCredit) : prev.rows.regular.endBal
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800 text-[10.5pt]"
                                  placeholder="รหัสบัญชี"
                                />
                              </td>
                              <td className="border border-slate-200 px-2 py-1 text-center font-mono bg-emerald-50/10">
                                <input
                                  type="text"
                                  value={debtorData.specialGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const calc = calculateDebtorRowValuesFromGL(val, tbAccounts);
                                    setDebtorData(prev => ({
                                      ...prev,
                                      specialGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        special: {
                                          ...prev.rows.special,
                                          begBal: calc.foundAny ? calc.begBal : prev.rows.special.begBal,
                                          addAmt: 0.00,
                                          trxDebit: calc.foundAny ? calc.trxDebit : prev.rows.special.trxDebit,
                                          otherAddAmt: calc.foundAny ? (calc.trxDebit - 0.00) : prev.rows.special.otherAddAmt,
                                          decAmt: calc.foundAny ? calc.trxCredit : prev.rows.special.decAmt,
                                          endBal: calc.foundAny ? (calc.begBal + 0.00 + (calc.trxDebit - 0.00) - calc.trxCredit) : prev.rows.special.endBal
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800 text-[10.5pt]"
                                  placeholder="รหัสบัญชี"
                                />
                              </td>
                              <td className="border border-slate-200 px-2 py-1 text-center font-mono bg-emerald-50/10">
                                <input
                                  type="text"
                                  value={debtorData.emergencyGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const calc = calculateDebtorRowValuesFromGL(val, tbAccounts);
                                    setDebtorData(prev => ({
                                      ...prev,
                                      emergencyGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        emergency: {
                                          ...prev.rows.emergency,
                                          begBal: calc.foundAny ? calc.begBal : prev.rows.emergency.begBal,
                                          addAmt: 0.00,
                                          trxDebit: calc.foundAny ? calc.trxDebit : prev.rows.emergency.trxDebit,
                                          otherAddAmt: calc.foundAny ? (calc.trxDebit - 0.00) : prev.rows.emergency.otherAddAmt,
                                          decAmt: calc.foundAny ? calc.trxCredit : prev.rows.emergency.decAmt,
                                          endBal: calc.foundAny ? (calc.begBal + 0.00 + (calc.trxDebit - 0.00) - calc.trxCredit) : prev.rows.emergency.endBal
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800 text-[10.5pt]"
                                  placeholder="รหัสบัญชี"
                                />
                              </td>
                              <td className="border border-slate-200 px-2 py-1 text-center font-mono bg-emerald-50/10">
                                <input
                                  type="text"
                                  value={debtorData.otherGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const calc = calculateDebtorRowValuesFromGL(val, tbAccounts);
                                    setDebtorData(prev => ({
                                      ...prev,
                                      otherGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        other: {
                                          ...prev.rows.other,
                                          begBal: calc.foundAny ? calc.begBal : prev.rows.other.begBal,
                                          addAmt: 0.00,
                                          trxDebit: calc.foundAny ? calc.trxDebit : prev.rows.other.trxDebit,
                                          otherAddAmt: calc.foundAny ? (calc.trxDebit - 0.00) : prev.rows.other.otherAddAmt,
                                          decAmt: calc.foundAny ? calc.trxCredit : prev.rows.other.decAmt,
                                          endBal: calc.foundAny ? (calc.begBal + 0.00 + (calc.trxDebit - 0.00) - calc.trxCredit) : prev.rows.other.endBal
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800 text-[10.5pt]"
                                  placeholder="รหัสบัญชี"
                                />
                              </td>
                            </tr>
                          )}

                          {/* Row 2: ยอดยกมา */}
                          <tr className="h-12">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black font-bold">
                              ยอดยกมา ณ วันที่ {finalStartDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              <input
                                type="text"
                                value={debtorData.rows.regular.begBal === 0 ? '' : formatCur(debtorData.rows.regular.begBal)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('regular', 'begBal', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              <input
                                type="text"
                                value={debtorData.rows.special.begBal === 0 ? '' : formatCur(debtorData.rows.special.begBal)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('special', 'begBal', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              <input
                                type="text"
                                value={debtorData.rows.emergency.begBal === 0 ? '' : formatCur(debtorData.rows.emergency.begBal)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('emergency', 'begBal', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              <input
                                type="text"
                                value={debtorData.rows.other.begBal === 0 ? '' : formatCur(debtorData.rows.other.begBal)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('other', 'begBal', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>

                          {/* Row 3: กู้เพิ่มระหว่างงวด */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              กู้เพิ่มระหว่างงวด(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.regular.addAmt === 0 ? '' : formatCur(debtorData.rows.regular.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('regular', 'addAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.special.addAmt === 0 ? '' : formatCur(debtorData.rows.special.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('special', 'addAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.emergency.addAmt === 0 ? '' : formatCur(debtorData.rows.emergency.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('emergency', 'addAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.other.addAmt === 0 ? '' : formatCur(debtorData.rows.other.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('other', 'addAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>

                          {/* Row 4: จำนวนสัญญาที่กู้เพิ่ม */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              จำนวนสัญญาที่กู้เพิ่ม
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                              <input
                                type="text"
                                value={debtorData.rows.regular.addQty}
                                onChange={(e) => updateRowField('regular', 'addQty', e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="-"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                              <input
                                type="text"
                                value={debtorData.rows.special.addQty}
                                onChange={(e) => updateRowField('special', 'addQty', e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="-"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                              <input
                                type="text"
                                value={debtorData.rows.emergency.addQty}
                                onChange={(e) => updateRowField('emergency', 'addQty', e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="-"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                              <input
                                type="text"
                                value={debtorData.rows.other.addQty}
                                onChange={(e) => updateRowField('other', 'addQty', e.target.value)}
                                className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="-"
                              />
                            </td>
                          </tr>

                          {/* Row 4.5: รายการเพิ่มอื่น */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              รายการเพิ่มอื่น
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.regular.otherAddAmt === 0 ? '' : formatCur(debtorData.rows.regular.otherAddAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('regular', 'otherAddAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.special.otherAddAmt === 0 ? '' : formatCur(debtorData.rows.special.otherAddAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('special', 'otherAddAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.emergency.otherAddAmt === 0 ? '' : formatCur(debtorData.rows.emergency.otherAddAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('emergency', 'otherAddAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.other.otherAddAmt === 0 ? '' : formatCur(debtorData.rows.other.otherAddAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('other', 'otherAddAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>

                          {/* Row 5: ชำระหนี้ระหว่างงวด */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              ชำระหนี้ระหว่างงวด(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.regular.decAmt === 0 ? '' : formatCur(debtorData.rows.regular.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    updateRowField('regular', 'decAmt', val);
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                  placeholder="0.00"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.special.decAmt === 0 ? '' : formatCur(debtorData.rows.special.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    updateRowField('special', 'decAmt', val);
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                  placeholder="0.00"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.emergency.decAmt === 0 ? '' : formatCur(debtorData.rows.emergency.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    updateRowField('emergency', 'decAmt', val);
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                  placeholder="0.00"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.other.decAmt === 0 ? '' : formatCur(debtorData.rows.other.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    updateRowField('other', 'decAmt', val);
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                  placeholder="0.00"
                                />
                              </span>
                            </td>
                          </tr>

                          {/* Row 6: ยอดคงเหลือสิ้นงวด */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black bg-slate-50/20">
                              ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(regularEndBal)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(specialEndBal)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(emergencyEndBal)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(otherEndBal)}
                              </span>
                            </td>
                          </tr>

                          {/* Row 7: จำนวนสัญญาคงเหลือ */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black font-bold">
                              จำนวนสัญญาคงเหลือ ณ วันที่ {finalEndDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.regular.endQty}
                                  onChange={(e) => updateRowField('regular', 'endQty', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                  placeholder="-"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.special.endQty}
                                  onChange={(e) => updateRowField('special', 'endQty', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                  placeholder="-"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.emergency.endQty}
                                  onChange={(e) => updateRowField('emergency', 'endQty', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                  placeholder="-"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={debtorData.rows.other.endQty}
                                  onChange={(e) => updateRowField('other', 'endQty', e.target.value)}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                  placeholder="-"
                                />
                              </span>
                            </td>
                          </tr>

                          {/* Row 8: ยอดตามรายงานสรุป */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              ยอดตามรายงานสรุป(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.regular.summaryAmt === 0 ? '' : formatCur(debtorData.rows.regular.summaryAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('regular', 'summaryAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.special.summaryAmt === 0 ? '' : formatCur(debtorData.rows.special.summaryAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('special', 'summaryAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.emergency.summaryAmt === 0 ? '' : formatCur(debtorData.rows.emergency.summaryAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('emergency', 'summaryAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={debtorData.rows.other.summaryAmt === 0 ? '' : formatCur(debtorData.rows.other.summaryAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  updateRowField('other', 'summaryAmt', val);
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>

                          {/* Row 9: ผลต่าง */}
                          <tr className="h-10 bg-slate-50/40">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black">
                              ผลต่าง(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(regularDifference)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(specialDifference)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(emergencyDifference)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(otherDifference)}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Auditing statistics block */}
                    <div className="mt-6 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                      <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3">สถิติจำนวนสมาชิกเป็นหนี้ ณ สิ้นงวด</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xs text-slate-400 font-bold block mb-1">สามัญ/สัญญา</span>
                          <span className="text-lg font-bold text-slate-700 font-mono">
                            <input
                              type="text"
                              value={debtorData.memberCounts.regular}
                              onChange={(e) => setDebtorData({
                                ...debtorData,
                                memberCounts: { ...debtorData.memberCounts, regular: e.target.value }
                              })}
                              className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-slate-700"
                            />
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xs text-slate-400 font-bold block mb-1">ฉุกเฉิน/สัญญา</span>
                          <span className="text-lg font-bold text-slate-700 font-mono">
                            <input
                              type="text"
                              value={debtorData.memberCounts.emergency}
                              onChange={(e) => setDebtorData({
                                ...debtorData,
                                memberCounts: { ...debtorData.memberCounts, emergency: e.target.value }
                              })}
                              className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-slate-700"
                            />
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xs text-slate-400 font-bold block mb-1">พิเศษ/สัญญา</span>
                          <span className="text-lg font-bold text-slate-700 font-mono">
                            <input
                              type="text"
                              value={debtorData.memberCounts.special !== undefined ? debtorData.memberCounts.special : '1,337.00'}
                              onChange={(e) => setDebtorData({
                                ...debtorData,
                                memberCounts: { ...debtorData.memberCounts, special: e.target.value }
                              })}
                              className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-slate-700"
                            />
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-xs text-slate-400 font-bold block mb-1">ลูกหนี้อื่น (ดำเนินคดี,ตามคำพิพากษา)/สัญญา</span>
                          <span className="text-lg font-bold text-slate-700 font-mono">
                            <input
                              type="text"
                              value={debtorData.memberCounts.otherDebtor !== undefined ? debtorData.memberCounts.otherDebtor : '0.00'}
                              onChange={(e) => setDebtorData({
                                ...debtorData,
                                memberCounts: { ...debtorData.memberCounts, otherDebtor: e.target.value }
                              })}
                              className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-slate-700"
                            />
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100/80 cursor-not-allowed flex flex-col sm:flex-row sm:items-center sm:justify-between px-4">
                          <span className="text-xs md:text-sm text-emerald-800 font-bold text-left mb-1 sm:mb-0">
                            สรุปจำนวนสัญญาเงินกู้คงเหลือทั้งสิ้น (ราย/สัญญา)
                          </span>
                          <div className="text-lg font-extrabold text-emerald-700 font-mono text-center sm:text-right min-w-[120px]">
                            {computedTotal}
                          </div>
                        </div>
                        <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100/80 cursor-not-allowed flex flex-col sm:flex-row sm:items-center sm:justify-between px-4">
                          <span className="text-xs md:text-sm text-blue-800 font-bold text-left mb-1 sm:mb-0">
                            สรุปเงินกู้คงเหลือทั้งสิ้น (จำนวนบาท)
                          </span>
                          <div className="text-lg font-extrabold text-blue-700 font-mono text-center sm:text-right min-w-[120px]">
                            {formatCur(regularEndBal + specialEndBal + emergencyEndBal + otherEndBal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Audit Methods & Conclusion */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    วิธีการตรวจสอบ (Audit Methods)
                  </h4>
                  <ul className="space-y-2.5 text-[11pt] text-slate-700">
                    {debtorData.methods.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                        const next = [...debtorData.methods];
                        next[i].checked = !next[i].checked;
                        setDebtorData({ ...debtorData, methods: next });
                      }}>
                        <div className="mt-1 shrink-0">
                          {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                        </div>
                        <span>{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    ผลการตรวจสอบ (Audit Findings / Results)
                  </h4>
                  <ul className="space-y-2.5 text-[11pt] text-slate-700 mb-4">
                    {debtorData.conclusions && debtorData.conclusions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                        const next = [...(debtorData.conclusions || [])];
                        next[i].checked = !next[i].checked;
                        setDebtorData({ ...debtorData, conclusions: next });
                      }}>
                        <div className="mt-1 shrink-0">
                          {c.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                        </div>
                        <span>{c.text}</span>
                      </li>
                    ))}
                  </ul>

                  <h5 className="text-[11pt] font-extrabold text-slate-700 mb-2">สรุปผลการตรวจสอบ / ข้อสังเกตเพิ่มเติม:</h5>
                  <div className="relative">
                    <textarea
                      value={debtorData.conclusionNotes}
                      onChange={(e) => setDebtorData({ ...debtorData, conclusionNotes: e.target.value })}
                      className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                      placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                    />
                    <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                      {debtorData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          {/* ==================== TAB 3: DEPOSITS RECEIVED ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('deposit')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{depositData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ เงินรับฝาก</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {depositData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง F-1</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={depositData.auditorName || ''} onChange={(val) => setDepositData({ ...depositData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{depositData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={depositData.inspectDateText || ''}
                              onChange={(e) => setDepositData({ ...depositData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{depositData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={depositData.reviewerName || ''} onChange={(val) => setDepositData({ ...depositData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{depositData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={depositData.reviewDateText !== undefined ? depositData.reviewDateText : getReviewDateText(depositData.inspectDateText)}
                              onChange={(e) => setDepositData({ ...depositData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {depositData.reviewDateText !== undefined ? depositData.reviewDateText : getReviewDateText(depositData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spreadsheet-like Table, Methods, and Summaries using a self-contained IIFE for local calculations */}
              {(() => {
                const getInspectionDates = (dateText: string, inspectMonth: string) => {
                  const cleaned = (dateText || '').trim();
                  if (cleaned) {
                    const parts = cleaned.split(/[-–—]/);
                    if (parts.length === 2) {
                      const startDayPart = parts[0].trim();
                      const endDayPart = parts[1].trim();
                      
                      let startText = startDayPart;
                      let endText = endDayPart;
                      
                      if (/^\d+$/.test(startText)) {
                        const match = endDayPart.match(/^\d+\s+(.+)$/);
                        if (match && match[1]) {
                          startText = `${startText} ${match[1]}`;
                        } else if (inspectMonth) {
                          startText = `${startText} ${inspectMonth}`;
                        }
                      }
                      return { startDateText: startText, endDateText: endText };
                    }
                  }
                  const monthStr = inspectMonth || 'พฤษภาคม 2569';
                  return {
                    startDateText: `1 ${monthStr}`,
                    endDateText: getLastDayOfMonthText(monthStr)
                  };
                };

                const { startDateText: finalStartDateText, endDateText: finalEndDateText } = getInspectionDates(depositData.inspectDateText, depositData.inspectMonth);
                const savingsAccount = tbAccounts.find(a => a.code === (depositData.savingsGlAccount || '21410').trim());
                const savingDayAccount = tbAccounts.find(a => a.code === (depositData.savingDayGlAccount || '21414').trim());
                const savingsCalc = calculateDepositRowValues(savingsAccount);
                const savingDayCalc = calculateDepositRowValues(savingDayAccount);

                const savingsEndBal = depositData.rows.savings.begBal + depositData.rows.savings.addAmt + (depositData.rows.savings.otherAddAmt || 0) - depositData.rows.savings.decAmt;
                const savingDayEndBal = depositData.rows.savingDay.begBal + depositData.rows.savingDay.addAmt + (depositData.rows.savingDay.otherAddAmt || 0) - depositData.rows.savingDay.decAmt;
                const savingsDifference = savingsEndBal - depositData.rows.savings.summaryAmt;
                const savingDayDifference = savingDayEndBal - depositData.rows.savingDay.summaryAmt;

                return (
                  <>
                    {/* Deposit Received Table (Spreadsheet Style) */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-300 text-[11pt] table-fixed spreadsheet-table bg-white">
                        <colgroup>
                          <col className="w-[38%]" />
                          <col className="w-[21%]" />
                          <col className="w-[21%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                        </colgroup>
                        <tbody>
                          {/* Row 1: Header */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black bg-slate-50/50">
                              <div className="flex items-center justify-between gap-1">
                                <span>ยอดตามบัญชี :</span>
                                <button
                                  type="button"
                                  onClick={() => setDepositData(prev => ({ ...prev, hideGlAccountLine: !prev.hideGlAccountLine }))}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors no-print shrink-0"
                                  title={depositData.hideGlAccountLine ? "แสดงรหัสบัญชีจากงบทดลอง" : "ซ่อนบรรทัดรหัสบัญชี"}
                                >
                                  {depositData.hideGlAccountLine ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                </button>
                              </div>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[80%] text-center">ออมทรัพย์</span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black bg-slate-50/50">
                              <span className="border-b border-black pb-0.5 inline-block w-[80%] text-center">โครงการวันออม ปี2569</span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 bg-slate-50/50"></td>
                            <td className="border border-slate-200 px-3 py-1.5 bg-slate-50/50"></td>
                          </tr>

                          {/* Row 1.5: รหัสบัญชีจากงบทดลอง */}
                          {!depositData.hideGlAccountLine && (
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-slate-700 bg-slate-50/30">
                                รหัสบัญชีจากงบทดลอง
                              </td>
                              <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                                <input
                                  type="text"
                                  value={depositData.savingsGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = tbAccounts.find(a => a.code === val.trim());
                                    const calcValues = calculateDepositRowValues(matched);
                                    setDepositData(prev => ({
                                      ...prev,
                                      savingsGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        savings: {
                                          ...prev.rows.savings,
                                          begBal: matched ? calcValues.begBal : prev.rows.savings.begBal,
                                          addAmt: matched ? calcValues.addAmt : prev.rows.savings.addAmt,
                                          decAmt: matched ? calcValues.decAmt : prev.rows.savings.decAmt,
                                          endBal: matched ? calcValues.endBal : prev.rows.savings.endBal,
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800"
                                  placeholder="21410"
                                />
                              </td>
                              <td className="border border-slate-200 px-3 py-1.5 text-center font-mono">
                                <input
                                  type="text"
                                  value={depositData.savingDayGlAccount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = tbAccounts.find(a => a.code === val.trim());
                                    const calcValues = calculateDepositRowValues(matched);
                                    setDepositData(prev => ({
                                      ...prev,
                                      savingDayGlAccount: val,
                                      rows: {
                                        ...prev.rows,
                                        savingDay: {
                                          ...prev.rows.savingDay,
                                          begBal: matched ? calcValues.begBal : prev.rows.savingDay.begBal,
                                          addAmt: matched ? calcValues.addAmt : prev.rows.savingDay.addAmt,
                                          decAmt: matched ? calcValues.decAmt : prev.rows.savingDay.decAmt,
                                          endBal: matched ? calcValues.endBal : prev.rows.savingDay.endBal,
                                        }
                                      }
                                    }));
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-emerald-800"
                                  placeholder="21414"
                                />
                              </td>
                              <td className="border border-slate-200 px-3 py-1.5"></td>
                              <td className="border border-slate-200 px-3 py-1.5"></td>
                            </tr>
                          )}

                          {/* Row 2: ยอดยกมา */}
                          <tr className="h-12">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black font-bold">
                              ยอดยกมา ณ วันที่ {finalStartDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              {depositData.rows.savings.begBal === 0 ? '0.00' : formatCur(depositData.rows.savings.begBal)}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black font-bold bg-slate-50/10">
                              {depositData.rows.savingDay.begBal === 0 ? '0.00' : formatCur(depositData.rows.savingDay.begBal)}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 3: รับฝากเพิ่ม */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              รับฝากเพิ่ม(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={depositData.rows.savings.addAmt === 0 ? '' : formatCur(depositData.rows.savings.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  setDepositData({
                                    ...depositData,
                                    rows: {
                                      ...depositData.rows,
                                      savings: { ...depositData.rows.savings, addAmt: val, endBal: depositData.rows.savings.begBal + val + (depositData.rows.savings.otherAddAmt || 0) - depositData.rows.savings.decAmt }
                                    }
                                  });
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={depositData.rows.savingDay.addAmt === 0 ? '' : formatCur(depositData.rows.savingDay.addAmt)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/,/g, '');
                                  const val = parseFloat(raw) || 0;
                                  setDepositData({
                                    ...depositData,
                                    rows: {
                                      ...depositData.rows,
                                      savingDay: { ...depositData.rows.savingDay, addAmt: val, endBal: depositData.rows.savingDay.begBal + val + (depositData.rows.savingDay.otherAddAmt || 0) - depositData.rows.savingDay.decAmt }
                                    }
                                  });
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 4: รายการเพิ่มอื่น */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              รายการเพิ่มอื่น(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={depositData.rows.savings.otherAddAmt === 0 ? '' : depositData.rows.savings.otherAddAmt}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setDepositData({
                                    ...depositData,
                                    rows: {
                                      ...depositData.rows,
                                      savings: { ...depositData.rows.savings, otherAddAmt: val, endBal: depositData.rows.savings.begBal + depositData.rows.savings.addAmt + val - depositData.rows.savings.decAmt }
                                    }
                                  });
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder=""
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <input
                                type="text"
                                value={depositData.rows.savingDay.otherAddAmt === 0 ? '' : depositData.rows.savingDay.otherAddAmt}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setDepositData({
                                    ...depositData,
                                    rows: {
                                      ...depositData.rows,
                                      savingDay: { ...depositData.rows.savingDay, otherAddAmt: val, endBal: depositData.rows.savingDay.begBal + depositData.rows.savingDay.addAmt + val - depositData.rows.savingDay.decAmt }
                                    }
                                  });
                                }}
                                className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                placeholder=""
                              />
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 5: ถอน */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              ถอน(บาท)
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savings.decAmt === 0 ? '' : formatCur(depositData.rows.savings.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savings: { ...depositData.rows.savings, decAmt: val, endBal: depositData.rows.savings.begBal + depositData.rows.savings.addAmt + (depositData.rows.savings.otherAddAmt || 0) - val }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono text-black">
                              <span className="border-b border-black inline-block w-full text-right pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savingDay.decAmt === 0 ? '' : formatCur(depositData.rows.savingDay.decAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savingDay: { ...depositData.rows.savingDay, decAmt: val, endBal: depositData.rows.savingDay.begBal + depositData.rows.savingDay.addAmt + (depositData.rows.savingDay.otherAddAmt || 0) - val }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 6: ยอดยกไป */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black bg-slate-50/20">
                              ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(savingsEndBal)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-bold text-black font-mono bg-slate-50/20">
                              <span className="border-b-[3px] border-double border-black inline-block w-full text-right pb-0.5">
                                {formatCur(savingDayEndBal)}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 bg-slate-50/20"></td>
                            <td className="border border-slate-200 px-3 py-1.5 bg-slate-50/20"></td>
                          </tr>

                          {/* Row 7: จำนวนบัญชีคงเหลือ */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black font-bold">
                              จำนวนบัญชีคงเหลือ ณ วันที่ {finalEndDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savings.qty}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savings: { ...depositData.rows.savings, qty: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savingDay.qty}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savingDay: { ...depositData.rows.savingDay, qty: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 8: จำนวนรายคงเหลือ */}
                          <tr className="h-10">
                            <td className="border border-slate-200 px-3 py-1.5 text-left text-black">
                              จำนวนรายคงเหลือ ณ วันที่ {finalEndDateText}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savings.mQty}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savings: { ...depositData.rows.savings, mQty: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold text-black font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5">
                                <input
                                  type="text"
                                  value={depositData.rows.savingDay.mQty}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savingDay: { ...depositData.rows.savingDay, mQty: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono font-bold text-black"
                                />
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>

                          {/* Row 9: บัญชีคงเหลือทั้งสิ้น */}
                          <tr className="h-10 bg-slate-50/40">
                            <td className="border border-slate-200 px-3 py-1.5 text-left font-bold text-black">
                              บัญชีคงเหลือทั้งสิ้น
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-extrabold text-slate-900 font-mono">
                              <span className="border-b-[3px] border-double border-black inline-block w-[80%] text-center pb-0.5 font-extrabold">
                                {((parseInt(String(depositData.rows.savings.qty).replace(/,/g, '')) || 0) + (parseInt(String(depositData.rows.savingDay.qty).replace(/,/g, '')) || 0)).toLocaleString()}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                            <td className="border border-slate-200 px-3 py-1.5"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Audit Methods & Conclusion Sections */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          วิธีการตรวจสอบ (Audit Methods)
                        </h4>
                        <ul className="space-y-2.5 text-[11pt] text-slate-700">
                          {depositData.methods.map((m, i) => (
                            <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                              const next = [...depositData.methods];
                              next[i].checked = !next[i].checked;
                              setDepositData({ ...depositData, methods: next });
                            }}>
                              <div className="mt-1 shrink-0">
                                {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                              </div>
                              <span>{m.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-emerald-600" />
                          สรุปผลการตรวจสอบ (Audit Conclusions)
                        </h4>
                        <div className="relative">
                          <textarea
                            value={depositData.conclusionNotes}
                            onChange={(e) => setDepositData({ ...depositData, conclusionNotes: e.target.value })}
                            className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                            placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                          />
                          <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                            {depositData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* เปรียบเทียบกับสรุปยอดคงเหลือ Section */}
                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <h4 className="text-[13pt] font-extrabold text-slate-850 mb-3 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-emerald-600" />
                        เปรียบเทียบกับสรุปยอดคงเหลือ
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[11pt] table-fixed bg-white">
                          <colgroup>
                            <col className="w-[8%]" />
                            <col className="w-[24%]" />
                            <col className="w-[20%]" />
                            <col className="w-[20%]" />
                            <col className="w-[14%]" />
                            <col className="w-[14%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="border border-black py-1.5 px-2 font-bold text-center">ลำดับ</th>
                              <th className="border border-black py-1.5 px-3 font-bold text-left">ประเภทหนี้</th>
                              <th className="border border-black py-1.5 px-3 font-bold text-right">ยอดตามบัญชี</th>
                              <th className="border border-black py-1.5 px-3 font-bold text-right">ยอดตามสรุปยอด</th>
                              <th className="border border-black py-1.5 px-3 font-bold text-right">ผลต่าง</th>
                              <th className="border border-black py-1.5 px-3 font-bold text-left">หมายเหตุ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row 1 */}
                            <tr>
                              <td className="border border-black py-1.5 px-2 text-center">1.</td>
                              <td className="border border-black py-1.5 px-3 text-left font-bold">ออมทรัพย์</td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-bold">{formatCur(savingsEndBal)}</td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono">
                                <input
                                  type="text"
                                  value={depositData.rows.savings.summaryAmt === 0 ? '' : formatCur(depositData.rows.savings.summaryAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savings: { ...depositData.rows.savings, summaryAmt: val, difference: savingsEndBal - val }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black font-bold"
                                />
                              </td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                                {savingsDifference === 0 ? '-' : formatCur(savingsDifference)}
                              </td>
                              <td className="border border-black py-1.5 px-3 text-left text-black">
                                <input
                                  type="text"
                                  value={depositData.rows.savings.comment || ''}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savings: { ...depositData.rows.savings, comment: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-left outline-none focus:bg-emerald-50 rounded text-black"
                                  placeholder="ระบุหมายเหตุ..."
                                />
                              </td>
                            </tr>

                            {/* Row 2 */}
                            <tr>
                              <td className="border border-black py-1.5 px-2 text-center">2.</td>
                              <td className="border border-black py-1.5 px-3 text-left font-bold">โครงการวันออม ปี2569</td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-bold">{formatCur(savingDayEndBal)}</td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono">
                                <input
                                  type="text"
                                  value={depositData.rows.savingDay.summaryAmt === 0 ? '' : formatCur(depositData.rows.savingDay.summaryAmt)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/,/g, '');
                                    const val = parseFloat(raw) || 0;
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savingDay: { ...depositData.rows.savingDay, summaryAmt: val, difference: savingDayEndBal - val }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded font-mono text-black font-bold"
                                />
                              </td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-bold text-rose-600">
                                {savingDayDifference === 0 ? '-' : formatCur(savingDayDifference)}
                              </td>
                              <td className="border border-black py-1.5 px-3 text-left text-black">
                                <input
                                  type="text"
                                  value={depositData.rows.savingDay.comment || ''}
                                  onChange={(e) => {
                                    setDepositData({
                                      ...depositData,
                                      rows: {
                                        ...depositData.rows,
                                        savingDay: { ...depositData.rows.savingDay, comment: e.target.value }
                                      }
                                    });
                                  }}
                                  className="w-full bg-transparent text-left outline-none focus:bg-emerald-50 rounded text-black"
                                  placeholder="ระบุหมายเหตุ..."
                                />
                              </td>
                            </tr>

                            {/* Row 3 (รวม) */}
                            <tr className="font-bold bg-slate-50">
                              <td colSpan={2} className="border border-black py-1.5 px-3 text-center font-bold">รวม</td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-extrabold">
                                {formatCur(savingsEndBal + savingDayEndBal)}
                              </td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-extrabold">
                                {formatCur(depositData.rows.savings.summaryAmt + depositData.rows.savingDay.summaryAmt)}
                              </td>
                              <td className="border border-black py-1.5 px-3 text-right font-mono font-extrabold text-rose-600">
                                {formatCur(savingsDifference + savingDayDifference)}
                              </td>
                              <td className="border border-black py-1.5 px-3 bg-slate-50"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}

            </div>

          {/* ==================== TAB 3.2: DEPOSITS FROM OTHER COOPERATIVES ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('deposit_other')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{depositOtherData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ เงินรับฝากสหกรณ์อื่น</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {depositOtherData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง F-2</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={depositOtherData.auditorName || ''} onChange={(val) => setDepositOtherData({ ...depositOtherData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{depositOtherData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={depositOtherData.inspectDateText || ''}
                              onChange={(e) => setDepositOtherData({ ...depositOtherData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{depositOtherData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={depositOtherData.reviewerName || ''} onChange={(val) => setDepositOtherData({ ...depositOtherData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{depositOtherData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={depositOtherData.reviewDateText !== undefined ? depositOtherData.reviewDateText : getReviewDateText(depositOtherData.inspectDateText)}
                              onChange={(e) => setDepositOtherData({ ...depositOtherData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {depositOtherData.reviewDateText !== undefined ? depositOtherData.reviewDateText : getReviewDateText(depositOtherData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic spreadsheet Tables */}
              {(() => {
                const getInspectionDates = (dateText: string, inspectMonth: string) => {
                  const cleaned = (dateText || '').trim();
                  if (cleaned) {
                    const parts = cleaned.split(/[-–—]/);
                    if (parts.length === 2) {
                      const startDayPart = parts[0].trim();
                      const endDayPart = parts[1].trim();
                      
                      let startText = startDayPart;
                      let endText = endDayPart;
                      
                      if (/^\d+$/.test(startText)) {
                        const match = endDayPart.match(/^\d+\s+(.+)$/);
                        if (match && match[1]) {
                          startText = `${startText} ${match[1]}`;
                        } else if (inspectMonth) {
                          startText = `${startText} ${inspectMonth}`;
                        }
                      }
                      return { startDateText: startText, endDateText: endText };
                    }
                  }
                  const monthStr = inspectMonth || 'พฤษภาคม 2569';
                  return {
                    startDateText: `1 ${monthStr}`,
                    endDateText: getLastDayOfMonthText(monthStr)
                  };
                };

                const { startDateText: finalStartDateText, endDateText: finalEndDateText } = getInspectionDates(depositOtherData.inspectDateText, depositOtherData.inspectMonth);

                const updateRowT1 = (id: string, field: string, val: any) => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table1: prev.table1.map(r => {
                      if (r.id === id) {
                        const updated = { ...r, [field]: val };
                        updated.endBal = updated.begBal + updated.addAmt + updated.interest + updated.otherAdd - updated.closeAmt - updated.transInterest;
                        return updated;
                      }
                      return r;
                    })
                  }));
                };
                const updateRowT2 = (id: string, field: string, val: any) => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table2: prev.table2.map(r => {
                      if (r.id === id) {
                        const updated = { ...r, [field]: val };
                        updated.endBal = updated.begBal + updated.addAmt + updated.interest + updated.otherAdd - updated.closeAmt - updated.transInterest;
                        return updated;
                      }
                      return r;
                    })
                  }));
                };
                const addRowT1 = () => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table1: [...prev.table1, { id: Date.now().toString(), name: 'สหกรณ์ออมทรัพย์...', rate: '3.00%', begBal: 0, addAmt: 0, interest: 0, otherAdd: 0, closeAmt: 0, transInterest: 0, endBal: 0, count: 1 }]
                  }));
                };
                const addRowT2 = () => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table2: [...prev.table2, { id: Date.now().toString(), name: 'สหกรณ์ออมทรัพย์...', rate: '3.00%', begBal: 0, addAmt: 0, interest: 0, otherAdd: 0, closeAmt: 0, transInterest: 0, endBal: 0, count: 1 }]
                  }));
                };
                const deleteRowT1 = (id: string) => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table1: prev.table1.filter(r => r.id !== id)
                  }));
                };
                const deleteRowT2 = (id: string) => {
                  setDepositOtherData(prev => ({
                    ...prev,
                    table2: prev.table2.filter(r => r.id !== id)
                  }));
                };

                const calculateRowEndBal = (r: any) => {
                  return r.begBal + r.addAmt + r.interest + r.otherAdd - r.closeAmt - r.transInterest;
                };

                const t1Totals = depositOtherData.table1.reduce((acc, r) => ({
                  beg: acc.beg + r.begBal,
                  add: acc.add + r.addAmt,
                  int: acc.int + r.interest,
                  oth: acc.oth + r.otherAdd,
                  cls: acc.cls + r.closeAmt,
                  trf: acc.trf + r.transInterest,
                  end: acc.end + calculateRowEndBal(r),
                  cnt: acc.cnt + r.count
                }), { beg: 0, add: 0, int: 0, oth: 0, cls: 0, trf: 0, end: 0, cnt: 0 });

                const t2Totals = depositOtherData.table2.reduce((acc, r) => ({
                  beg: acc.beg + r.begBal,
                  add: acc.add + r.addAmt,
                  int: acc.int + r.interest,
                  oth: acc.oth + r.otherAdd,
                  cls: acc.cls + r.closeAmt,
                  trf: acc.trf + r.transInterest,
                  end: acc.end + calculateRowEndBal(r),
                  cnt: acc.cnt + r.count
                }), { beg: 0, add: 0, int: 0, oth: 0, cls: 0, trf: 0, end: 0, cnt: 0 });

                const grandTotals = {
                  beg: t1Totals.beg + t2Totals.beg,
                  add: t1Totals.add + t2Totals.add,
                  int: t1Totals.int + t2Totals.int,
                  oth: t1Totals.oth + t2Totals.oth,
                  cls: t1Totals.cls + t2Totals.cls,
                  trf: t1Totals.trf + t2Totals.trf,
                  end: t1Totals.end + t2Totals.end,
                  cnt: t1Totals.cnt + t2Totals.cnt
                };

                const renderVerticalTable = (
                  title: string,
                  coops: any[],
                  totals: any,
                  updater: (id: string, field: string, val: any) => void,
                  deleter: (id: string) => void,
                  onAdd: () => void
                ) => {
                  const renderNumericInput = (c: any, field: string, value: number, classes: string = "", isBold = false) => {
                    return (
                      <CoopNumericInput
                        value={value}
                        onChange={(val) => updater(c.id, field, val)}
                        className={classes}
                        isBold={isBold}
                      />
                    );
                  };

                  const renderTotalCell = (val: number, classes: string = "", isCurrency = true) => {
                    if (val === 0) {
                      return <span className="text-slate-300 font-bold font-mono">-</span>;
                    }
                    return <span className={classes}>{isCurrency ? formatCur(val) : val}</span>;
                  };

                  return (
                    <div className="mb-8 font-thai print:break-inside-auto">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 border border-slate-200 rounded-t-xl">
                        <span className="font-extrabold text-[12pt] text-slate-800">{title}</span>
                        <button
                          type="button"
                          onClick={onAdd}
                          className="print:hidden flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มสหกรณ์
                        </button>
                      </div>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full border-collapse border border-slate-300 text-[11pt] bg-white text-black min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-700 font-bold h-11 text-center">
                              <th className="border border-slate-300 px-3 py-1.5 text-left w-[28%] font-extrabold">รายละเอียด</th>
                              {coops.map((c, idx) => (
                                <th key={c.id} className="border border-slate-300 px-3 py-1.5 text-center min-w-[170px] bg-slate-50/20">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[10pt] text-slate-400 font-bold">ลำดับ {idx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => deleter(c.id)}
                                        className="print:hidden text-rose-500 hover:text-rose-700 p-0.5 transition-colors"
                                        title="ลบสหกรณ์นี้"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={c.name}
                                      onChange={(e) => updater(c.id, 'name', e.target.value)}
                                      className="w-full bg-transparent text-center font-extrabold text-slate-800 outline-none focus:bg-emerald-50 rounded py-0.5 text-[11pt] border-b border-transparent focus:border-emerald-300"
                                      placeholder="ชื่อสหกรณ์..."
                                    />
                                  </div>
                                </th>
                              ))}
                              <th className="border border-slate-300 px-3 py-1.5 text-center bg-emerald-50/30 font-extrabold text-emerald-800 w-[16%]">
                                รวมกลุ่ม
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row: อัตราดอกเบี้ย */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                อัตราดอกเบี้ย
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-center font-mono text-black">
                                  <input
                                    type="text"
                                    value={c.rate}
                                    onChange={(e) => updater(c.id, 'rate', e.target.value)}
                                    className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                    placeholder="0.00%"
                                  />
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-center bg-slate-50/10 text-slate-400 font-bold font-mono">
                                -
                              </td>
                            </tr>

                            {/* Row: ยอดยกมา */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700">
                                ยอดยกมา ณ วันที่ {finalStartDateText}
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'begBal', c.begBal, 'text-black font-bold', true)}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-bold font-mono text-slate-800">
                                {renderTotalCell(totals.beg, 'text-black font-bold font-mono')}
                              </td>
                            </tr>

                            {/* Row: ฝากเพิ่มระหว่างงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ฝากเพิ่มระหว่างงวด(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'addAmt', c.addAmt, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.add, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: ดอกเบี้ยจ่ายงวดนี้ */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-amber-800 font-bold bg-amber-50/5">
                                ดอกเบี้ยจ่ายงวดนี้(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-amber-50/5">
                                  {renderNumericInput(c, 'interest', c.interest, 'text-amber-700 font-bold')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-amber-50/10 font-mono text-amber-700 font-bold">
                                {renderTotalCell(totals.int, 'text-amber-700 font-bold font-mono')}
                              </td>
                            </tr>

                            {/* Row: รายการเพิ่มอื่น */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                รายการเพิ่มอื่น(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'otherAdd', c.otherAdd, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.oth, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: ถอนปิดบัญชี */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ถอนปิดบัญชี(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'closeAmt', c.closeAmt, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.cls, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: รายการถอนโอนดอกเบี้ยสิ้นงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-rose-800 font-bold bg-rose-50/5">
                                รายการถอนโอนดอกเบี้ยสิ้นงวด(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-rose-50/5">
                                  {renderNumericInput(c, 'transInterest', c.transInterest, 'text-rose-700 font-bold')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-rose-50/10 font-mono text-rose-700 font-bold">
                                {renderTotalCell(totals.trf, 'text-rose-700 font-bold font-mono')}
                              </td>
                            </tr>

                            {/* Row: ยอดคงเหลือ */}
                            <tr className="h-12 bg-emerald-50/10 font-bold">
                              <td className="border border-slate-200 px-3 py-1.5 text-left font-extrabold text-emerald-900 bg-emerald-50/5">
                                ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              {coops.map(c => {
                                const endBal = calculateRowEndBal(c);
                                return (
                                  <td key={c.id} className="border border-slate-200 px-3 py-1.5 text-right bg-emerald-50/5 font-mono font-extrabold text-emerald-800">
                                    <span className="border-b-[3px] border-double border-emerald-800 pb-0.5 inline-block w-full text-right font-mono">
                                      {endBal === 0 ? '-' : formatCur(endBal)}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="border border-slate-200 px-3 py-1.5 text-right bg-emerald-50/20 font-mono font-extrabold text-emerald-950">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full text-right font-mono">
                                  {totals.end === 0 ? '-' : formatCur(totals.end)}
                                </span>
                              </td>
                            </tr>

                            {/* Row: จำนวนบัญชี */}
                            <tr className="h-11">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                จำนวนบัญชีคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                  <input
                                    type="text"
                                    value={c.count}
                                    onChange={(e) => updater(c.id, 'count', parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-slate-800 font-bold text-center"
                                  />
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-center bg-slate-50/10 font-mono text-slate-800 font-bold">
                                {totals.cnt}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

                const renderSummaryTable = () => {
                  return (
                    <div className="mb-8 font-thai break-inside-avoid">
                      <div className="bg-emerald-700 text-white px-3 py-2 border border-emerald-800 rounded-t-xl font-extrabold text-[12pt]">
                        สรุปยอดรวมเงินรับฝากสหกรณ์อื่นทั้งหมด (Grand Summary)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-300 text-[11pt] bg-white text-black min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold h-11 text-center">
                              <th className="border border-slate-300 px-3 py-1.5 text-left w-[40%] font-extrabold">รายละเอียด</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold">รวมชุดที่ 1</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold">รวมชุดที่ 2</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold text-emerald-800 bg-emerald-50/30">รวมทั้งสิ้น</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row: ยоดยกมา */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                ยอดยกมา ณ วันที่ {finalStartDateText}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-slate-800">
                                {formatCur(t1Totals.beg)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-slate-800">
                                {formatCur(t2Totals.beg)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.beg)}
                              </td>
                            </tr>

                            {/* Row: ฝากเพิ่มระหว่างงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ฝากเพิ่มระหว่างงวด(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.add)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.add)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.add)}
                              </td>
                            </tr>

                            {/* Row: ดอกเบี้ยจ่ายงวดนี้ */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-amber-800 font-bold bg-amber-50/5">
                                ดอกเบี้ยจ่ายงวดนี้(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-amber-700">
                                {formatCur(t1Totals.int)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-amber-700">
                                {formatCur(t2Totals.int)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-amber-800 bg-amber-50/10">
                                {formatCur(grandTotals.int)}
                              </td>
                            </tr>

                            {/* Row: รายการเพิ่มอื่น */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                รายการเพิ่มอื่น(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.oth)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.oth)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.oth)}
                              </td>
                            </tr>

                            {/* Row: ถอนปิดบัญชี */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ถอนปิดบัญชี(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.cls)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.cls)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.cls)}
                              </td>
                            </tr>

                            {/* Row: รายการถอนโอนดอกเบี้ยสิ้นงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-rose-800 font-bold bg-rose-50/5">
                                รายการถอนโอนดอกเบี้ยสิ้นงวด(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-rose-700">
                                {formatCur(t1Totals.trf)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-rose-700">
                                {formatCur(t2Totals.trf)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-rose-800 bg-rose-50/10">
                                {formatCur(grandTotals.trf)}
                              </td>
                            </tr>

                            {/* Row: ยอดคงเหลือ */}
                            <tr className="h-12 bg-emerald-50 font-bold">
                              <td className="border border-slate-300 px-3 py-1.5 text-left font-extrabold text-emerald-950">
                                ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-extrabold text-emerald-900">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full">
                                  {formatCur(t1Totals.end)}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-extrabold text-emerald-900">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full">
                                  {formatCur(t2Totals.end)}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-black text-emerald-955 bg-emerald-100">
                                <span className="border-b-[3px] border-double border-emerald-950 pb-0.5 inline-block w-full">
                                  {formatCur(grandTotals.end)}
                                </span>
                              </td>
                            </tr>

                            {/* Row: จำนวนบัญชี */}
                            <tr className="h-11">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                จำนวนบัญชีคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                {t1Totals.cnt}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                {t2Totals.cnt}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center bg-emerald-50 font-mono text-emerald-900 font-extrabold">
                                {grandTotals.cnt}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {renderVerticalTable('เงินรับฝากสหกรณ์อื่น - ชุดที่ 1', depositOtherData.table1, t1Totals, updateRowT1, deleteRowT1, addRowT1)}
                    {renderVerticalTable('เงินรับฝากสหกรณ์อื่น - ชุดที่ 2', depositOtherData.table2, t2Totals, updateRowT2, deleteRowT2, addRowT2)}
                    {renderSummaryTable()}

                    {/* Audit Methods & Conclusion Sections */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          วิธีการตรวจสอบ (Audit Methods)
                        </h4>
                        <ul className="space-y-2.5 text-[11pt] text-slate-700">
                          {depositOtherData.methods.map((m, i) => (
                            <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                              const next = [...depositOtherData.methods];
                              next[i].checked = !next[i].checked;
                              setDepositOtherData({ ...depositOtherData, methods: next });
                            }}>
                              <div className="mt-1 shrink-0">
                                {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                              </div>
                              <span>{m.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-emerald-600" />
                          สรุปผลการตรวจสอบ (Audit Conclusions)
                        </h4>
                        <div className="relative">
                          <textarea
                            value={depositOtherData.conclusionNotes}
                            onChange={(e) => setDepositOtherData({ ...depositOtherData, conclusionNotes: e.target.value })}
                            className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                            placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                          />
                          <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                            {depositOtherData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

            </div>

          {/* ==================== TAB 3.3: BORROWINGS ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('loan')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{loanData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ เงินกู้ยืม</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {loanData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง F-3</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={loanData.auditorName || ''} onChange={(val) => setLoanData({ ...loanData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{loanData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={loanData.inspectDateText || ''}
                              onChange={(e) => setLoanData({ ...loanData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{loanData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={loanData.reviewerName || ''} onChange={(val) => setLoanData({ ...loanData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{loanData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={loanData.reviewDateText !== undefined ? loanData.reviewDateText : getReviewDateText(loanData.inspectDateText)}
                              onChange={(e) => setLoanData({ ...loanData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {loanData.reviewDateText !== undefined ? loanData.reviewDateText : getReviewDateText(loanData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Controls for toggling account codes and calculated interest columns */}
              <div className="print:hidden mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 font-thai">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-slate-500" />
                    <span className="font-extrabold text-[12pt] text-slate-700">การตั้งค่าและการคำนวณดอกเบี้ย (กระดาษทำการเงินกู้ยืม)</span>
                  </div>
                  <div className="text-[10pt] font-bold text-slate-400 pl-7">
                    สูตร: ยอดยกมา × อัตราดอกเบี้ย × (จำนวนวัน) / (ตัวหารปี)
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                  {/* Toggles */}
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={loanData.showAccountCode !== false}
                        onChange={(e) => setLoanData({ ...loanData, showAccountCode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="text-[11pt] font-bold text-slate-600 group-hover:text-slate-800 transition-colors">
                        แสดงรหัสบัญชี
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={loanData.showCalcInterest !== false}
                        onChange={(e) => setLoanData({ ...loanData, showCalcInterest: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="text-[11pt] font-bold text-slate-600 group-hover:text-slate-800 transition-colors">
                        แสดงดอกเบี้ยคำนวณตามสูตร
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={loanData.showDiffInterest !== false}
                        onChange={(e) => setLoanData({ ...loanData, showDiffInterest: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      <span className="text-[11pt] font-bold text-slate-600 group-hover:text-slate-800 transition-colors">
                        แสดงผลต่างดอกเบี้ยจ่าย
                      </span>
                    </label>
                  </div>

                  {/* Formula override inputs */}
                  <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[10pt] font-bold text-slate-600">จำนวนวันคำนวณ:</span>
                      <input
                        type="text"
                        value={loanData.calcDays ?? ''}
                        placeholder={String(getDaysInMonthGlobal(loanData.inspectMonth))}
                        onChange={(e) => setLoanData({ ...loanData, calcDays: e.target.value })}
                        className="w-16 px-2 py-0.5 text-center font-mono text-[10pt] bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                      <span className="text-[10pt] font-bold text-slate-600">ตัวหารปี:</span>
                      <input
                        type="text"
                        value={loanData.calcDivisor ?? ''}
                        placeholder="365"
                        onChange={(e) => setLoanData({ ...loanData, calcDivisor: e.target.value })}
                        className="w-16 px-2 py-0.5 text-center font-mono text-[10pt] bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic spreadsheet Tables */}
              {(() => {
                const getInspectionDates = (dateText: string, inspectMonth: string) => {
                  const cleaned = (dateText || '').trim();
                  if (cleaned) {
                    const parts = cleaned.split(/[-–—]/);
                    if (parts.length === 2) {
                      const startDayPart = parts[0].trim();
                      const endDayPart = parts[1].trim();
                      
                      let startText = startDayPart;
                      let endText = endDayPart;
                      
                      if (/^\d+$/.test(startText)) {
                        const match = endDayPart.match(/^\d+\s+(.+)$/);
                        if (match && match[1]) {
                          startText = `${startText} ${match[1]}`;
                        } else if (inspectMonth) {
                          startText = `${startText} ${inspectMonth}`;
                        }
                      }
                      return { startDateText: startText, endDateText: endText };
                    }
                  }
                  const monthStr = inspectMonth || 'พฤษภาคม 2569';
                  return {
                    startDateText: `1 ${monthStr}`,
                    endDateText: getLastDayOfMonthText(monthStr)
                  };
                };

                const { startDateText: finalStartDateText, endDateText: finalEndDateText } = getInspectionDates(loanData.inspectDateText, loanData.inspectMonth);

                const getDaysInMonth = (monthName: string): number => {
                  if (!monthName) return 31;
                  const name = monthName.trim();
                  if (name.includes('คม')) return 31;
                  if (name.includes('ยน')) return 30;
                  if (name.includes('กุมภาพันธ์')) {
                    const match = name.match(/\d+/);
                    if (match) {
                      const year = parseInt(match[0]);
                      const westernYear = year > 2400 ? year - 543 : year;
                      const isLeap = (westernYear % 4 === 0 && westernYear % 100 !== 0) || westernYear % 400 === 0;
                      return isLeap ? 29 : 28;
                    }
                    return 28;
                  }
                  return 31;
                };

                const parseInterestRate = (rateStr: string): number => {
                  if (!rateStr) return 0;
                  const cleaned = rateStr.replace(/[^0-9.]/g, '');
                  const parsed = parseFloat(cleaned);
                  return isNaN(parsed) ? 0 : parsed / 100;
                };

                const calcInterestVal = (c: any) => {
                  if (c.calcInterestOverride !== undefined && c.calcInterestOverride !== null && c.calcInterestOverride !== '') {
                    return Number(c.calcInterestOverride);
                  }
                  const rate = parseInterestRate(c.rate);
                  const daysVal = loanData.calcDays !== undefined && loanData.calcDays !== '' ? Number(loanData.calcDays) : getDaysInMonth(loanData.inspectMonth);
                  const divisorVal = loanData.calcDivisor !== undefined && loanData.calcDivisor !== '' ? Number(loanData.calcDivisor) : 365;
                  const days = isNaN(daysVal) ? 30 : daysVal;
                  const divisor = isNaN(divisorVal) || divisorVal === 0 ? 365 : divisorVal;
                  return c.begBal * rate * days / divisor;
                };

                const updateRowT1 = (id: string, field: string, val: any) => {
                  setLoanData(prev => ({
                    ...prev,
                    table1: prev.table1.map(r => {
                      if (r.id === id) {
                        const updated = { ...r, [field]: val };
                        if (field === 'code') {
                          const matched = tbAccounts.find(a => a.code === val.trim());
                          if (matched) {
                            const calcValues = calculateDepositRowValues(matched);
                            updated.begBal = calcValues.begBal;
                            updated.addAmt = calcValues.addAmt;
                            updated.closeAmt = calcValues.decAmt;
                          }
                        }
                        updated.endBal = updated.begBal + updated.addAmt + updated.otherAdd - updated.closeAmt;
                        return updated;
                      }
                      return r;
                    })
                  }));
                };
                const updateRowT2 = (id: string, field: string, val: any) => {
                  setLoanData(prev => ({
                    ...prev,
                    table2: prev.table2.map(r => {
                      if (r.id === id) {
                        const updated = { ...r, [field]: val };
                        if (field === 'code') {
                          const matched = tbAccounts.find(a => a.code === val.trim());
                          if (matched) {
                            const calcValues = calculateDepositRowValues(matched);
                            updated.begBal = calcValues.begBal;
                            updated.addAmt = calcValues.addAmt;
                            updated.closeAmt = calcValues.decAmt;
                          }
                        }
                        updated.endBal = updated.begBal + updated.addAmt + updated.otherAdd - updated.closeAmt;
                        return updated;
                      }
                      return r;
                    })
                  }));
                };
                const addRowT1 = () => {
                  setLoanData(prev => ({
                    ...prev,
                    table1: [...prev.table1, { id: Date.now().toString(), name: 'แหล่งเงินกู้ยืม...', code: '221100', rate: '3.00%', begBal: 0, addAmt: 0, interest: 0, otherAdd: 0, closeAmt: 0, transInterest: 0, endBal: 0, count: 1 }]
                  }));
                };
                const addRowT2 = () => {
                  setLoanData(prev => ({
                    ...prev,
                    table2: [...prev.table2, { id: Date.now().toString(), name: 'แหล่งเงินกู้ยืม...', code: '221200', rate: '3.00%', begBal: 0, addAmt: 0, interest: 0, otherAdd: 0, closeAmt: 0, transInterest: 0, endBal: 0, count: 1 }]
                  }));
                };
                const deleteRowT1 = (id: string) => {
                  setLoanData(prev => ({
                    ...prev,
                    table1: prev.table1.filter(r => r.id !== id)
                  }));
                };
                const deleteRowT2 = (id: string) => {
                  setLoanData(prev => ({
                    ...prev,
                    table2: prev.table2.filter(r => r.id !== id)
                  }));
                };

                const calculateRowEndBal = (r: any) => {
                  return r.begBal + r.addAmt + r.otherAdd - r.closeAmt;
                };

                const t1Totals = loanData.table1.reduce((acc, r) => ({
                  beg: acc.beg + r.begBal,
                  add: acc.add + r.addAmt,
                  int: acc.int + r.interest,
                  oth: acc.oth + r.otherAdd,
                  cls: acc.cls + r.closeAmt,
                  trf: acc.trf + (calcInterestVal(r) - r.interest),
                  end: acc.end + calculateRowEndBal(r),
                  cnt: acc.cnt + r.count
                }), { beg: 0, add: 0, int: 0, oth: 0, cls: 0, trf: 0, end: 0, cnt: 0 });

                const t2Totals = loanData.table2.reduce((acc, r) => ({
                  beg: acc.beg + r.begBal,
                  add: acc.add + r.addAmt,
                  int: acc.int + r.interest,
                  oth: acc.oth + r.otherAdd,
                  cls: acc.cls + r.closeAmt,
                  trf: acc.trf + (calcInterestVal(r) - r.interest),
                  end: acc.end + calculateRowEndBal(r),
                  cnt: acc.cnt + r.count
                }), { beg: 0, add: 0, int: 0, oth: 0, cls: 0, trf: 0, end: 0, cnt: 0 });

                const grandTotals = {
                  beg: t1Totals.beg + t2Totals.beg,
                  add: t1Totals.add + t2Totals.add,
                  int: t1Totals.int + t2Totals.int,
                  oth: t1Totals.oth + t2Totals.oth,
                  cls: t1Totals.cls + t2Totals.cls,
                  trf: t1Totals.trf + t2Totals.trf,
                  end: t1Totals.end + t2Totals.end,
                  cnt: t1Totals.cnt + t2Totals.cnt
                };

                const renderVerticalTable = (
                  title: string,
                  coops: any[],
                  totals: any,
                  updater: (id: string, field: string, val: any) => void,
                  deleter: (id: string) => void,
                  onAdd: () => void
                ) => {
                  const renderNumericInput = (c: any, field: string, value: number, classes: string = "", isBold = false) => {
                    return (
                      <CoopNumericInput
                        value={value}
                        onChange={(val) => updater(c.id, field, val)}
                        className={classes}
                        isBold={isBold}
                      />
                    );
                  };

                  const renderTotalCell = (val: number, classes: string = "", isCurrency = true) => {
                    if (val === 0) {
                      return <span className="text-slate-300 font-bold font-mono">-</span>;
                    }
                    return <span className={classes}>{isCurrency ? formatCur(val) : val}</span>;
                  };

                  return (
                    <div className="mb-8 font-thai print:break-inside-auto">
                      <div className="flex justify-between items-center bg-slate-50 px-3 py-2 border border-slate-200 rounded-t-xl">
                        <span className="font-extrabold text-[12pt] text-slate-800">{title}</span>
                        <button
                          type="button"
                          onClick={onAdd}
                          className="print:hidden flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> เพิ่มสัญญากู้ยืม
                        </button>
                      </div>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full border-collapse border border-slate-300 text-[11pt] bg-white text-black min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50/50 text-slate-700 font-bold h-11 text-center">
                              <th className="border border-slate-300 px-3 py-1.5 text-left w-[28%] font-extrabold">รายละเอียด</th>
                              {coops.map((c, idx) => (
                                <th key={c.id} className="border border-slate-300 px-3 py-1.5 text-center min-w-[170px] bg-slate-50/20">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[10pt] text-slate-400 font-bold">ลำดับ {idx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => deleter(c.id)}
                                        className="print:hidden text-rose-500 hover:text-rose-700 p-0.5 transition-colors"
                                        title="ลบสัญญานี้"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={c.name}
                                      onChange={(e) => updater(c.id, 'name', e.target.value)}
                                      className="w-full bg-transparent text-center font-extrabold text-slate-800 outline-none focus:bg-emerald-50 rounded py-0.5 text-[11pt] border-b border-transparent focus:border-emerald-300"
                                      placeholder="แหล่งเงินกู้ยืม..."
                                    />
                                  </div>
                                </th>
                              ))}
                              <th className="border border-slate-300 px-3 py-1.5 text-center bg-emerald-50/30 font-extrabold text-emerald-800 w-[16%]">
                                รวมกลุ่ม
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row: รหัสบัญชี */}
                            {loanData.showAccountCode !== false && (
                              <tr className="h-10">
                                <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                  รหัสบัญชี
                                </td>
                                {coops.map(c => (
                                  <td key={c.id} className="border border-slate-200 px-3 py-1 text-center font-mono text-black">
                                    <input
                                      type="text"
                                      value={c.code || ''}
                                      onChange={(e) => updater(c.id, 'code', e.target.value)}
                                      className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                      placeholder="รหัสบัญชี"
                                    />
                                  </td>
                                ))}
                                <td className="border border-slate-200 px-3 py-1 text-center bg-slate-50/10 text-slate-400 font-bold font-mono">
                                  -
                                </td>
                              </tr>
                            )}

                            {/* Row: อัตราดอกเบี้ย */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                อัตราดอกเบี้ย
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-center font-mono text-black">
                                  <input
                                    type="text"
                                    value={c.rate}
                                    onChange={(e) => updater(c.id, 'rate', e.target.value)}
                                    className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-black"
                                    placeholder="0.00%"
                                  />
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-center bg-slate-50/10 text-slate-400 font-bold font-mono">
                                -
                              </td>
                            </tr>

                            {/* Row: ดอกเบี้ยจ่ายคำนวณตามสูตร */}
                            {loanData.showCalcInterest !== false && (
                              <tr className="h-10 bg-amber-50/10 font-bold">
                                <td className="border border-slate-200 px-3 py-1 text-left text-amber-900 font-extrabold bg-amber-50/5">
                                  ดอกเบี้ยคำนวณตามสูตร (ยอดยกมา × อัตรา × {loanData.calcDays !== undefined && loanData.calcDays !== '' ? loanData.calcDays : getDaysInMonth(loanData.inspectMonth)} วัน / {loanData.calcDivisor !== undefined && loanData.calcDivisor !== '' ? loanData.calcDivisor : 365})
                                </td>
                                {coops.map(c => {
                                  const hasOverride = c.calcInterestOverride !== undefined && c.calcInterestOverride !== null && c.calcInterestOverride !== '';
                                  const defaultVal = (() => {
                                    const rate = parseInterestRate(c.rate);
                                    const daysVal = loanData.calcDays !== undefined && loanData.calcDays !== '' ? Number(loanData.calcDays) : getDaysInMonth(loanData.inspectMonth);
                                    const divisorVal = loanData.calcDivisor !== undefined && loanData.calcDivisor !== '' ? Number(loanData.calcDivisor) : 365;
                                    const days = isNaN(daysVal) ? 30 : daysVal;
                                    const divisor = isNaN(divisorVal) || divisorVal === 0 ? 365 : divisorVal;
                                    return c.begBal * rate * days / divisor;
                                  })();
                                  return (
                                    <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-amber-50/5">
                                      <CoopNumericInput
                                        value={hasOverride ? Number(c.calcInterestOverride) : defaultVal}
                                        onChange={(val) => updater(c.id, 'calcInterestOverride', val === 0 ? '' : val)}
                                        className="text-amber-800 font-bold font-mono"
                                        placeholder={defaultVal === 0 ? '-' : formatCur(defaultVal)}
                                      />
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 px-3 py-1 text-right bg-amber-50/10 text-amber-900 font-bold font-mono">
                                  {renderTotalCell(coops.reduce((sum, c) => sum + calcInterestVal(c), 0), 'text-amber-900 font-bold font-mono')}
                                </td>
                              </tr>
                            )}

                            {/* Row: ยอดยกมา */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700">
                                ยอดยกมา ณ วันที่ {finalStartDateText}
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'begBal', c.begBal, 'text-black font-bold', true)}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-bold font-mono text-slate-800">
                                {renderTotalCell(totals.beg, 'text-black font-bold font-mono')}
                              </td>
                            </tr>

                            {/* Row: กู้ยืมเพิ่มระหว่างงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                กู้ยืมเพิ่มระหว่างงวด(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'addAmt', c.addAmt, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.add, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: ดอกเบี้ยจ่ายงวดนี้ */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-amber-800 font-bold bg-amber-50/5">
                                ดอกเบี้ยจ่ายงวดนี้(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-amber-50/5">
                                  {renderNumericInput(c, 'interest', c.interest, 'text-amber-700 font-bold')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-amber-50/10 font-mono text-amber-700 font-bold">
                                {renderTotalCell(totals.int, 'text-amber-700 font-bold font-mono')}
                              </td>
                            </tr>

                            {/* Row: รายการเพิ่มอื่น */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                รายการเพิ่มอื่น(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'otherAdd', c.otherAdd, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.oth, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: ชำระคืนเงินกู้ยืม */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ชำระคืนเงินกู้ยืม(บาท)
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-white">
                                  {renderNumericInput(c, 'closeAmt', c.closeAmt, 'text-black')}
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-right bg-slate-50/10 font-mono text-slate-800">
                                {renderTotalCell(totals.cls, 'text-slate-800 font-mono')}
                              </td>
                            </tr>

                            {/* Row: รายการผลต่างดอกเบี้ยจ่าย */}
                            {loanData.showDiffInterest !== false && (
                              <tr className="h-10">
                                <td className="border border-slate-200 px-3 py-1 text-left text-rose-800 font-bold bg-rose-50/5">
                                  รายการผลต่างดอกเบี้ยจ่าย(บาท)
                                </td>
                                {coops.map(c => {
                                  const diffVal = calcInterestVal(c) - c.interest;
                                  return (
                                    <td key={c.id} className="border border-slate-200 px-3 py-1 text-right bg-rose-50/5 text-rose-700 font-bold font-mono">
                                      {diffVal === 0 ? '-' : formatCur(diffVal)}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 px-3 py-1 text-right bg-rose-50/10 font-mono text-rose-700 font-bold">
                                  {renderTotalCell(totals.trf, 'text-rose-700 font-bold font-mono')}
                                </td>
                              </tr>
                            )}

                            {/* Row: ยอดคงเหลือ */}
                            <tr className="h-12 bg-emerald-50/10 font-bold">
                              <td className="border border-slate-200 px-3 py-1.5 text-left font-extrabold text-emerald-900 bg-emerald-50/5">
                                ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              {coops.map(c => {
                                const endBal = calculateRowEndBal(c);
                                return (
                                  <td key={c.id} className="border border-slate-200 px-3 py-1.5 text-right bg-emerald-50/5 font-mono font-extrabold text-emerald-800">
                                    <span className="border-b-[3px] border-double border-emerald-800 pb-0.5 inline-block w-full text-right font-mono">
                                      {endBal === 0 ? '-' : formatCur(endBal)}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className="border border-slate-200 px-3 py-1.5 text-right bg-emerald-50/20 font-mono font-extrabold text-emerald-955">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full text-right font-mono">
                                  {totals.end === 0 ? '-' : formatCur(totals.end)}
                                </span>
                              </td>
                            </tr>

                            {/* Row: จำนวนบัญชี */}
                            <tr className="h-11">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                จำนวนสัญญาคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              {coops.map(c => (
                                <td key={c.id} className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                  <input
                                    type="text"
                                    value={c.count}
                                    onChange={(e) => updater(c.id, 'count', parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded font-mono text-slate-800 font-bold text-center"
                                  />
                                </td>
                              ))}
                              <td className="border border-slate-200 px-3 py-1 text-center bg-slate-50/10 font-mono text-slate-800 font-bold">
                                {totals.cnt}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

                const renderSummaryTable = () => {
                  return (
                    <div className="mb-8 font-thai break-inside-avoid">
                      <div className="bg-emerald-700 text-white px-3 py-2 border border-emerald-800 rounded-t-xl font-extrabold text-[12pt]">
                        สรุปยอดรวมเงินกู้ยืมทั้งหมด (Grand Summary)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-slate-300 text-[11pt] bg-white text-black min-w-[500px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 font-bold h-11 text-center">
                              <th className="border border-slate-300 px-3 py-1.5 text-left w-[40%] font-extrabold">รายละเอียด</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold">รวมกลุ่มที่ 1</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold">รวมกลุ่มที่ 2</th>
                              <th className="border border-slate-300 px-3 py-1.5 text-right w-[20%] font-extrabold text-emerald-800 bg-emerald-50/30">รวมทั้งสิ้น</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Row: ยอดยกมา */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                ยอดยกมา ณ วันที่ {finalStartDateText}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-slate-800">
                                {formatCur(t1Totals.beg)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-slate-800">
                                {formatCur(t2Totals.beg)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.beg)}
                              </td>
                            </tr>

                            {/* Row: กู้ยืมเพิ่มระหว่างงวด */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                กู้ยืมเพิ่มระหว่างงวด(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.add)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.add)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.add)}
                              </td>
                            </tr>

                            {/* Row: ดอกเบี้ยจ่ายงวดนี้ */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-amber-800 font-bold bg-amber-50/5">
                                ดอกเบี้ยจ่ายงวดนี้(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-amber-700">
                                {formatCur(t1Totals.int)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-amber-700">
                                {formatCur(t2Totals.int)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-amber-800 bg-amber-50/10">
                                {formatCur(grandTotals.int)}
                              </td>
                            </tr>

                            {/* Row: รายการเพิ่มอื่น */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                รายการเพิ่มอื่น(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.oth)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.oth)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.oth)}
                              </td>
                            </tr>

                            {/* Row: ชำระคืนเงินกู้ยืม */}
                            <tr className="h-10">
                              <td className="border border-slate-200 px-3 py-1 text-left text-slate-700">
                                ชำระคืนเงินกู้ยืม(บาท)
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t1Totals.cls)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono text-slate-800">
                                {formatCur(t2Totals.cls)}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/5">
                                {formatCur(grandTotals.cls)}
                              </td>
                            </tr>

                            {/* Row: รายการผลต่างดอกเบี้ยจ่าย */}
                            {loanData.showDiffInterest !== false && (
                              <tr className="h-10">
                                <td className="border border-slate-200 px-3 py-1 text-left text-rose-800 font-bold bg-rose-50/5">
                                  รายการผลต่างดอกเบี้ยจ่าย(บาท)
                                </td>
                                <td className="border border-slate-200 px-3 py-1 text-right font-mono text-rose-700">
                                  {formatCur(t1Totals.trf)}
                                </td>
                                <td className="border border-slate-200 px-3 py-1 text-right font-mono text-rose-700">
                                  {formatCur(t2Totals.trf)}
                                </td>
                                <td className="border border-slate-200 px-3 py-1 text-right font-mono font-bold text-rose-800 bg-rose-50/10">
                                  {formatCur(grandTotals.trf)}
                                </td>
                              </tr>
                            )}

                            {/* Row: ยอดคงเหลือ */}
                            <tr className="h-12 bg-emerald-50 font-bold">
                              <td className="border border-slate-300 px-3 py-1.5 text-left font-extrabold text-emerald-955">
                                ยอดคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-extrabold text-emerald-900">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full">
                                  {formatCur(t1Totals.end)}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-extrabold text-emerald-900">
                                <span className="border-b-[3px] border-double border-emerald-900 pb-0.5 inline-block w-full">
                                  {formatCur(t2Totals.end)}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-black text-emerald-955 bg-emerald-100">
                                <span className="border-b-[3px] border-double border-emerald-950 pb-0.5 inline-block w-full">
                                  {formatCur(grandTotals.end)}
                                </span>
                              </td>
                            </tr>

                            {/* Row: จำนวนบัญชี */}
                            <tr className="h-11">
                              <td className="border border-slate-200 px-3 py-1 text-left font-bold text-slate-700 bg-slate-50/5">
                                จำนวนสัญญาคงเหลือ ณ วันที่ {finalEndDateText}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                {t1Totals.cnt}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center font-mono font-bold text-slate-800">
                                {t2Totals.cnt}
                              </td>
                              <td className="border border-slate-200 px-3 py-1 text-center bg-emerald-50 font-mono text-emerald-900 font-extrabold">
                                {grandTotals.cnt}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {renderVerticalTable('เงินกู้ยืม - กลุ่มที่ 1', loanData.table1, t1Totals, updateRowT1, deleteRowT1, addRowT1)}
                    {renderVerticalTable('เงินกู้ยืม - กลุ่มที่ 2', loanData.table2, t2Totals, updateRowT2, deleteRowT2, addRowT2)}
                    {renderSummaryTable()}

                    {/* Audit Methods & Conclusion Sections */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          วิธีการตรวจสอบ (Audit Methods)
                        </h4>
                        <ul className="space-y-2.5 text-[11pt] text-slate-700">
                          {loanData.methods.map((m, i) => (
                            <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                              const next = [...loanData.methods];
                              next[i].checked = !next[i].checked;
                              setLoanData({ ...loanData, methods: next });
                            }}>
                              <div className="mt-1 shrink-0">
                                {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                              </div>
                              <span>{m.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-emerald-600" />
                          สรุปผลการตรวจสอบ (Audit Conclusions)
                        </h4>
                        <div className="relative">
                          <textarea
                            value={loanData.conclusionNotes}
                            onChange={(e) => setLoanData({ ...loanData, conclusionNotes: e.target.value })}
                            className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                            placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                          />
                          <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                            {loanData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

            </div>

          {/* ==================== TAB 4: SHARE CAPITAL ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('share')}`}>
            {(() => {
              const begMembersGeneral = shareData.begMembersGeneral !== undefined ? shareData.begMembersGeneral : 2280;
              const begMembersAssociate = shareData.begMembersAssociate !== undefined ? shareData.begMembersAssociate : 103;

              const newMembersGeneral = shareData.newMembersGeneral !== undefined ? shareData.newMembersGeneral : 10;
              const newMembersAssociate = shareData.newMembersAssociate !== undefined ? shareData.newMembersAssociate : 1;

              const resignedMembersGeneral = shareData.resignedMembersGeneral !== undefined ? shareData.resignedMembersGeneral : 1;
              const resignedMembersAssociate = shareData.resignedMembersAssociate !== undefined ? shareData.resignedMembersAssociate : 0;

              const totalNewMembers = newMembersGeneral + newMembersAssociate;
              const totalResignedMembers = resignedMembersGeneral + resignedMembersAssociate;

              const endMembersGeneral = begMembersGeneral + newMembersGeneral - resignedMembersGeneral;
              const endMembersAssociate = begMembersAssociate + newMembersAssociate - resignedMembersAssociate;
              const endMembersTotal = endMembersGeneral + endMembersAssociate;

              return (
                <>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{shareData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ ทุนเรือนหุ้น</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {shareData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง H-1</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={shareData.auditorName || ''} onChange={(val) => setShareData({ ...shareData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{shareData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={shareData.inspectDateText || ''}
                              onChange={(e) => setShareData({ ...shareData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{shareData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={shareData.reviewerName || ''} onChange={(val) => setShareData({ ...shareData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{shareData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={shareData.reviewDateText !== undefined ? shareData.reviewDateText : getReviewDateText(shareData.inspectDateText)}
                              onChange={(e) => setShareData({ ...shareData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {shareData.reviewDateText !== undefined ? shareData.reviewDateText : getReviewDateText(shareData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Share Capital details table */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center no-print">
                  <div className="text-slate-500 text-sm font-semibold font-thai">สรุปรายละเอียด ทุนเรือนหุ้น</div>
                  <button
                    type="button"
                    onClick={() => setShareData(prev => ({ ...prev, hideGlAccount: !prev.hideGlAccount }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors text-xs font-semibold shrink-0"
                    title={shareData.hideGlAccount ? "แสดงคอลัมน์รหัสบัญชี" : "ซ่อนคอลัมน์รหัสบัญชี"}
                  >
                    {shareData.hideGlAccount ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>แสดงรหัสบัญชี</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>ซ่อนรหัสบัญชี</span>
                      </>
                    )}
                  </button>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[12pt]" style={{ fontSize: `${tableStyles.fontSize}pt` }}>
                  <thead>
                    <tr className="bg-slate-50 text-center">
                      {!shareData.hideGlAccount && (
                        <th className="border border-slate-300 py-2 font-bold text-center px-2 w-32" style={cellStyle}>รหัสบัญชี</th>
                      )}
                      <th className="border border-slate-300 py-2 font-bold text-left px-4" style={cellStyle}>รายการรายละเอียด</th>
                      <th className="border border-slate-300 py-2 font-bold text-right px-4 w-48 bg-slate-50/80" style={cellStyle}>จำนวนเงิน (บาท)</th>
                      <th className="border border-slate-300 py-2 font-bold text-left px-4" style={cellStyle}>รายละเอียดเพิ่มเติม</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={shareData.begBalGlAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextData = { ...shareData, begBalGlAccount: val };
                              const matched = tbAccounts.find(a => a.code === val.trim());
                              if (matched) {
                                let amt = matched.begCredit;
                                if (matched.numbers && matched.numbers.length >= 2) {
                                  let valAmt = matched.numbers[1];
                                  if (matched.numbers.length === 4) {
                                    valAmt = (matched.numbers[0] || 0) + (matched.numbers[2] || 0) - (matched.numbers[1] || 0);
                                  } else if (matched.numbers.length >= 6) {
                                    valAmt = (matched.numbers[1] || 0) + (matched.numbers[3] || 0) - (matched.numbers[2] || 0);
                                  }
                                  amt = valAmt;
                                }
                                nextData.begBal = amt;
                                nextData.endBal = amt + nextData.otherAdditions - nextData.resignedAmt;
                              }
                              setShareData(nextData);
                            }}
                            className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded px-1 font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="border border-slate-300 px-4 font-bold" style={cellStyle}>
                        ยอดยกมา 1 {shareData.inspectMonth || 'พฤษภาคม 2569'}
                      </td>
                      <td className="border border-slate-300 px-4 text-right font-mono font-bold" style={cellStyle}>
                        <NumberInput 
                          value={shareData.begBal} 
                          placeholder="0.00"
                          onChange={(val) => {
                            setShareData({ ...shareData, begBal: val, endBal: val + shareData.otherAdditions - shareData.resignedAmt });
                          }}
                          className="w-full bg-transparent text-right outline-none font-bold focus:bg-emerald-50 rounded px-1"
                        />
                      </td>
                      <td className="border border-slate-300 px-4 text-slate-500" style={cellStyle}>
                        <div className="flex flex-col gap-1 py-1">
                          <input 
                            type="text" 
                            value={shareData.begBalDetails !== undefined ? shareData.begBalDetails : 'ยоดยกมาจากงวดก่อน'} 
                            onChange={(e) => setShareData({ ...shareData, begBalDetails: e.target.value })}
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-700 font-semibold print:bg-transparent"
                          />
                          <div className="flex items-center gap-2 text-xs text-slate-600 no-print flex-wrap">
                            <span>สมาชิกยกมา:</span>
                            <span className="text-[10px]">สามัญ</span>
                            <input 
                              type="number" 
                              value={begMembersGeneral} 
                              onChange={(e) => setShareData({ ...shareData, begMembersGeneral: parseInt(e.target.value) || 0 })}
                              className="border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="text-[10px]">สมทบ</span>
                            <input 
                              type="number" 
                              value={begMembersAssociate} 
                              onChange={(e) => setShareData({ ...shareData, begMembersAssociate: parseInt(e.target.value) || 0 })}
                              className="border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="font-bold whitespace-nowrap text-emerald-800">รวม {(begMembersGeneral + begMembersAssociate).toLocaleString()} ราย</span>
                          </div>
                          <div className="hidden print:block text-[11px] text-slate-700 leading-tight">
                            จำนวนสมาชิกยกมา: สามัญ {begMembersGeneral.toLocaleString()} ราย, สมทบ {begMembersAssociate.toLocaleString()} ราย (รวม {(begMembersGeneral + begMembersAssociate).toLocaleString()} ราย)
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={shareData.newMemberGlAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextData = { ...shareData, newMemberGlAccount: val };
                              const matched = tbAccounts.find(a => a.code === val.trim());
                              if (matched) {
                                nextData.newMemberAmt = matched.trxCredit;
                              }
                              setShareData(nextData);
                            }}
                            className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded px-1 font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="border border-slate-300 px-4 font-bold" style={cellStyle}>สมาชิกเข้าใหม่ระหว่างงวด</td>
                      <td className="border border-slate-300 px-4 text-right font-mono text-slate-700" style={cellStyle}>
                        <NumberInput 
                          value={shareData.newMemberAmt} 
                          placeholder="0.00"
                          onChange={(val) => {
                            setShareData({ ...shareData, newMemberAmt: val });
                          }}
                          className="w-full bg-transparent text-right outline-none text-slate-700 focus:bg-emerald-50 rounded px-1"
                        />
                      </td>
                      <td className="border border-slate-300 px-4 text-slate-600" style={cellStyle}>
                        <div className="flex flex-col gap-1 py-1">
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-bold">เข้าใหม่:</span>
                            <span className="no-print text-[10px]">สามัญ</span>
                            <input 
                              type="number" 
                              value={newMembersGeneral} 
                              onChange={(e) => {
                                const gen = parseInt(e.target.value) || 0;
                                const tot = gen + newMembersAssociate;
                                const rate = shareData.entranceFeePerPerson || 100.00;
                                setShareData({
                                  ...shareData,
                                  newMembersGeneral: gen,
                                  newMemberQty: String(tot),
                                  entranceFee: tot * rate
                                });
                              }}
                              className="no-print border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="no-print text-[10px]">สมทบ</span>
                            <input 
                              type="number" 
                              value={newMembersAssociate} 
                              onChange={(e) => {
                                const assoc = parseInt(e.target.value) || 0;
                                const tot = newMembersGeneral + assoc;
                                const rate = shareData.entranceFeePerPerson || 100.00;
                                setShareData({
                                  ...shareData,
                                  newMembersAssociate: assoc,
                                  newMemberQty: String(tot),
                                  entranceFee: tot * rate
                                });
                              }}
                              className="no-print border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="font-bold text-slate-900">รวม {totalNewMembers.toLocaleString()} ราย</span>
                          </div>
                          <div className="hidden print:block text-[11px] text-slate-700 leading-tight">
                            จำนวนสมาชิกเข้าใหม่: สามัญ {newMembersGeneral.toLocaleString()} ราย, สมทบ {newMembersAssociate.toLocaleString()} ราย
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={shareData.entranceFeeGlAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextData = { ...shareData, entranceFeeGlAccount: val };
                              const matched = tbAccounts.find(a => a.code === val.trim());
                              if (matched) {
                                nextData.entranceFee = matched.trxCredit;
                                const rate = shareData.entranceFeePerPerson || 100.00;
                                nextData.newMemberQty = String(matched.trxCredit / rate) + '.00';
                              }
                              setShareData(nextData);
                            }}
                            className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded px-1 font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="border border-slate-300 px-4 font-bold" style={cellStyle}>
                        ค่าธรรมเนียมแรกเข้า (รายละ{" "}
                        <input 
                          type="number"
                          value={shareData.entranceFeePerPerson !== undefined ? shareData.entranceFeePerPerson : 100}
                          onChange={(e) => {
                            const rate = parseFloat(e.target.value) || 0;
                            const qty = parseFloat(shareData.newMemberQty) || 0;
                            setShareData({
                              ...shareData,
                              entranceFeePerPerson: rate,
                              entranceFee: qty * rate
                            });
                          }}
                          className="mx-1 border border-slate-200 rounded px-1 w-16 text-center text-xs inline-block focus:bg-emerald-50 font-mono"
                        />{" "}
                        บาท)
                      </td>
                      <td className="border border-slate-300 px-4 text-right font-mono text-slate-700" style={cellStyle}>
                        <NumberInput 
                          value={shareData.entranceFee} 
                          placeholder="0.00"
                          onChange={(val) => {
                            setShareData({ ...shareData, entranceFee: val });
                          }}
                          className="w-full bg-transparent text-right outline-none text-slate-700 focus:bg-emerald-50 rounded px-1"
                        />
                      </td>
                      <td className="border border-slate-300 px-4 text-slate-500" style={cellStyle}>
                        <input 
                          type="text" 
                          value={shareData.entranceFeeDetails !== undefined ? shareData.entranceFeeDetails : 'ค่าธรรมเนียมแรกเข้ารับจริง'} 
                          onChange={(e) => setShareData({ ...shareData, entranceFeeDetails: e.target.value })}
                          className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-700 font-normal print:bg-transparent"
                        />
                      </td>
                    </tr>
                    <tr>
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={shareData.otherAdditionsGlAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextData = { ...shareData, otherAdditionsGlAccount: val };
                              const matched = tbAccounts.find(a => a.code === val.trim());
                              if (matched) {
                                let amt = matched.trxCredit;
                                if (matched.numbers && matched.numbers.length >= 3) {
                                  amt = matched.numbers[matched.numbers.length - 3];
                                }
                                nextData.otherAdditions = amt;
                                nextData.endBal = shareData.begBal + amt - shareData.resignedAmt;
                              }
                              setShareData(nextData);
                            }}
                            className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded px-1 font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="border border-slate-300 px-4 font-bold" style={cellStyle}>รายการเพิ่มอื่นระหว่างงวด (ซื้อหุ้นเพิ่ม)</td>
                      <td className="border border-slate-300 px-4 text-right font-mono font-bold text-slate-800" style={cellStyle}>
                        <NumberInput 
                          value={shareData.otherAdditions} 
                          placeholder="0.00"
                          onChange={(val) => {
                            setShareData({ ...shareData, otherAdditions: val, endBal: shareData.begBal + val - shareData.resignedAmt });
                          }}
                          className="w-full bg-transparent text-right outline-none font-bold focus:bg-emerald-50 rounded px-1"
                        />
                      </td>
                      <td className="border border-slate-300 px-4 text-slate-500" style={cellStyle}>
                        <input 
                          type="text" 
                          value={shareData.otherAdditionsDetails !== undefined ? shareData.otherAdditionsDetails : 'รายการรับชำระค่าหุ้นรายเดือน'} 
                          onChange={(e) => setShareData({ ...shareData, otherAdditionsDetails: e.target.value })}
                          className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-700 font-normal print:bg-transparent"
                        />
                      </td>
                    </tr>
                    <tr>
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 px-2 font-mono text-center" style={cellStyle}>
                          <input 
                            type="text" 
                            value={shareData.resignedAmtGlAccount || ''} 
                            placeholder="รหัสบัญชี"
                            onChange={(e) => {
                              const val = e.target.value;
                              const nextData = { ...shareData, resignedAmtGlAccount: val };
                              const matched = tbAccounts.find(a => a.code === val.trim());
                              if (matched) {
                                let amt = matched.trxDebit;
                                if (matched.numbers && matched.numbers.length >= 4) {
                                  amt = matched.numbers[matched.numbers.length - 4];
                                }
                                nextData.resignedAmt = amt;
                                nextData.endBal = shareData.begBal + shareData.otherAdditions - amt;
                              }
                              setShareData(nextData);
                            }}
                            className="w-full bg-transparent text-center outline-none focus:bg-emerald-50 rounded px-1 font-mono text-sm"
                          />
                        </td>
                      )}
                      <td className="border border-slate-300 px-4 font-bold" style={cellStyle}>สมาชิกลาออกระหว่างงวด (ถอนคืน)</td>
                      <td className="border border-slate-300 px-4 text-right font-mono text-slate-700" style={cellStyle}>
                        <NumberInput 
                          value={shareData.resignedAmt} 
                          placeholder="0.00"
                          onChange={(val) => {
                            setShareData({ ...shareData, resignedAmt: val, endBal: shareData.begBal + shareData.otherAdditions - val });
                          }}
                          className="w-full bg-transparent text-right outline-none focus:bg-emerald-50 rounded px-1"
                        />
                      </td>
                      <td className="border border-slate-300 px-4 text-slate-600" style={cellStyle}>
                        <div className="flex flex-col gap-1 py-1">
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-bold">ลาออก:</span>
                            <span className="no-print text-[10px]">สามัญ</span>
                            <input 
                              type="number" 
                              value={resignedMembersGeneral} 
                              onChange={(e) => {
                                const gen = parseInt(e.target.value) || 0;
                                const tot = gen + resignedMembersAssociate;
                                setShareData({
                                  ...shareData,
                                  resignedMembersGeneral: gen,
                                  resignedQty: String(tot)
                                });
                              }}
                              className="no-print border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="no-print text-[10px]">สมทบ</span>
                            <input 
                              type="number" 
                              value={resignedMembersAssociate} 
                              onChange={(e) => {
                                const assoc = parseInt(e.target.value) || 0;
                                const tot = resignedMembersGeneral + assoc;
                                setShareData({
                                  ...shareData,
                                  resignedMembersAssociate: assoc,
                                  resignedQty: String(tot)
                                });
                              }}
                              className="no-print border border-slate-200 rounded px-1 w-12 text-center text-[10px] focus:bg-emerald-50"
                            />
                            <span className="font-bold text-slate-900">รวม {totalResignedMembers.toLocaleString()} ราย</span>
                          </div>
                          <div className="hidden print:block text-[11px] text-slate-700 leading-tight">
                            จำนวนลาออก: สามัญ {resignedMembersGeneral.toLocaleString()} ราย, สมทบ {resignedMembersAssociate.toLocaleString()} ราย
                          </div>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 text-[13pt] font-extrabold text-emerald-900">
                      {!shareData.hideGlAccount && (
                        <td className="border border-slate-300 text-center font-bold font-mono text-slate-500" style={cellStyle}>-</td>
                      )}
                      <td className="border border-slate-300 px-4 text-left" style={cellStyle}>
                        ยอดยกไป {getLastDayOfMonthText(shareData.inspectMonth)}
                      </td>
                      <td className="border border-slate-300 px-4 text-right font-mono text-emerald-800 bg-emerald-50/80" style={cellStyle}>
                        {formatCur(shareData.endBal)}
                      </td>
                      <td className="border border-slate-300 px-4" style={cellStyle}>
                        <div className="flex flex-col text-xs text-emerald-950 py-0.5 font-bold">
                          <div className="text-[12pt] font-extrabold text-emerald-800">
                            สมาชิกสิ้นงวด: {endMembersTotal.toLocaleString()} ราย
                          </div>
                          <div className="text-[10px] font-normal text-slate-600 leading-tight">
                            (สามัญ {endMembersGeneral.toLocaleString()} ราย | สมทบ {endMembersAssociate.toLocaleString()} ราย)
                          </div>
                          <div className="text-[9px] font-mono font-normal text-slate-500 leading-none mt-1">
                            { (begMembersGeneral + begMembersAssociate).toLocaleString() } + { totalNewMembers.toLocaleString() } - { totalResignedMembers.toLocaleString() } = { endMembersTotal.toLocaleString() }
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Methods & Conclusions */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    วิธีการตรวจสอบ (Audit Methods)
                  </h4>
                  <ul className="space-y-2.5 text-[11pt] text-slate-700">
                    {shareData.methods.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                        const next = [...shareData.methods];
                        next[i].checked = !next[i].checked;
                        setShareData({ ...shareData, methods: next });
                      }}>
                        <div className="mt-1 shrink-0">
                          {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                        </div>
                        <span>{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    สรุปผลการตรวจสอบ (Audit Conclusions)
                  </h4>
                  <div className="relative">
                    <textarea
                      value={shareData.conclusionNotes}
                      onChange={(e) => setShareData({ ...shareData, conclusionNotes: e.target.value })}
                      className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                      placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                    />
                    <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                      {shareData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                    </div>
                  </div>
                </div>
              </div>

                </>
              );
            })()}
            </div>

          {/* ==================== TAB 5: RESERVES & ACCUMULATED CAPITAL ==================== */}
          <div className={`bg-white rounded-2xl border border-slate-200 p-[20mm_18mm] print:p-0 relative text-black text-left font-thai min-h-[297mm] leading-relaxed doc-shadow wp-print-container ${getTabClass('reserve')}`}>
              
              {/* Document Header block */}
              <div className="flex justify-between items-start border-b-2 border-dashed border-slate-300 pb-5 mb-5 font-thai">
                <div className="text-left font-thai max-w-[58%] pt-1">
                  <div className="text-[18pt] font-extrabold tracking-wide leading-tight text-slate-900">{reserveData.cooperativeName || 'สหกรณ์ออมทรัพย์ตำรวจภูธรจังหวัดพระนครศรีอยุธยา จำกัด'}</div>
                  <div className="text-[16pt] font-extrabold mt-2 leading-normal text-slate-800">กระดาษทำการ ทุนสะสมตามข้อบังคับ ระเบียบและอื่นๆ</div>
                  <div className="text-[13pt] font-bold mt-2 text-slate-600">สำหรับงวดเข้าตรวจ: {reserveData.periodText}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="text-right text-[10pt] text-slate-400 font-mono select-none mb-1">ดัชนีอ้างอิง H-3</div>
                  <table className="border-collapse border border-black text-[12pt] leading-tight font-thai bg-white">
                    <thead>
                      <tr>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-24"></th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-44">ชื่อ</th>
                        <th className="border border-black px-3 py-1 font-bold text-center bg-slate-50 w-36">วันที่</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้จัดทำ</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={reserveData.auditorName || ''} onChange={(val) => setReserveData({ ...reserveData, auditorName: val })} placeholder="ชื่อผู้จัดทำ" />
                          </div>
                          <div className="hidden print:block text-center">{reserveData.auditorName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={reserveData.inspectDateText || ''}
                              onChange={(e) => setReserveData({ ...reserveData, inspectDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่จัดทำ"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">{reserveData.inspectDateText || ''}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black px-3 py-1 font-bold text-center bg-slate-50">ผู้สอบทาน</td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <NameSelector value={reserveData.reviewerName || ''} onChange={(val) => setReserveData({ ...reserveData, reviewerName: val })} placeholder="ชื่อผู้สอบทาน" />
                          </div>
                          <div className="hidden print:block text-center">{reserveData.reviewerName || ''}</div>
                        </td>
                        <td className="border border-black px-3 py-1 text-center font-bold text-slate-800">
                          <div className="print:hidden">
                            <input
                              type="text"
                              value={reserveData.reviewDateText !== undefined ? reserveData.reviewDateText : getReviewDateText(reserveData.inspectDateText)}
                              onChange={(e) => setReserveData({ ...reserveData, reviewDateText: e.target.value })}
                              className="w-full text-center bg-transparent border-0 font-bold font-thai text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500 rounded p-1"
                              placeholder="วันที่สอบทาน"
                            />
                          </div>
                          <div className="hidden print:block text-center font-extrabold">
                            {reserveData.reviewDateText !== undefined ? reserveData.reviewDateText : getReviewDateText(reserveData.inspectDateText)}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table details */}
              <div className="flex justify-between items-center mt-6">
                <h3 className="text-[14pt] font-extrabold text-slate-800">ทุนสะสมตามข้อบังคับ ระเบียบและอื่นๆ</h3>
                <button onClick={addReserveRow} className="no-print px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" /> เพิ่มรายการ
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <table className="w-full border-collapse border border-slate-300 text-[12pt] text-center" style={{ fontSize: `${tableStyles.fontSize}pt` }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-300 py-2 w-28 font-bold" style={cellStyle}>รหัสบัญชี</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold" style={cellStyle}>รายการทุนสะสม</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ยอดคงเหลือต้นงวด</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>เพิ่ม ระหว่างงวด</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold bg-slate-50/80" style={cellStyle}>ลด ระหว่างงวด</th>
                      <th className="border border-slate-300 py-2 text-right px-3 font-bold" style={cellStyle}>ยอดคงเหลือสิ้นงวด</th>
                      <th className="border border-slate-300 py-2 w-12 font-bold no-print" style={cellStyle}>ลบ</th>
                      <th className="border border-slate-300 py-2 text-left px-3 font-bold w-48" style={cellStyle}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reserveData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="border border-slate-300 font-mono text-[11pt]" style={cellStyle}>
                          <input 
                            type="text" 
                            value={row.code} 
                            onChange={(e) => {
                              const next = [...reserveData.rows];
                              next[idx].code = e.target.value;
                              setReserveData({ ...reserveData, rows: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded text-center font-mono px-1"
                          />
                        </td>
                        <td className="border border-slate-300 text-left px-3 font-bold" style={cellStyle}>
                          <input 
                            type="text" 
                            value={row.name} 
                            onChange={(e) => {
                              const next = [...reserveData.rows];
                              next[idx].name = e.target.value;
                              setReserveData({ ...reserveData, rows: next });
                            }} 
                            className="w-full bg-transparent outline-none font-bold text-slate-800 focus:bg-emerald-50 rounded px-1"
                          />
                        </td>
                        <td className="border border-slate-300 px-3 font-mono text-right bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={row.begBal} 
                            onChange={(val) => {
                              const next = [...reserveData.rows];
                              next[idx].begBal = val;
                              next[idx].endBal = val + row.addAmt - row.decAmt;
                              setReserveData({ ...reserveData, rows: next });
                            }}
                            className="w-full text-right outline-none font-bold text-slate-800 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 px-3 font-mono text-slate-700 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={row.addAmt} 
                            onChange={(val) => {
                              const next = [...reserveData.rows];
                              next[idx].addAmt = val;
                              next[idx].endBal = row.begBal + val - row.decAmt;
                              setReserveData({ ...reserveData, rows: next });
                            }}
                            className="w-full text-right outline-none text-slate-700 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 px-3 font-mono text-slate-700 bg-emerald-50/20" style={cellStyle}>
                          <NumberInput 
                            value={row.decAmt} 
                            onChange={(val) => {
                              const next = [...reserveData.rows];
                              next[idx].decAmt = val;
                              next[idx].endBal = row.begBal + row.addAmt - val;
                              setReserveData({ ...reserveData, rows: next });
                            }}
                            className="w-full text-right outline-none text-slate-700 bg-transparent"
                            style={cellStyle}
                          />
                        </td>
                        <td className="border border-slate-300 px-3 font-bold font-mono text-slate-800 bg-slate-50/30" style={cellStyle}>
                          {formatCur(row.endBal)}
                        </td>
                        <td className="border border-slate-300 text-center no-print" style={cellStyle}>
                          <button onClick={() => deleteReserveRow(idx)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </td>
                        <td className="border border-slate-300 px-2 text-left" style={cellStyle}>
                          <input 
                            type="text" 
                            value={row.remarks || ''} 
                            placeholder="เขียนหมายเหตุ..."
                            onChange={(e) => {
                              const next = [...reserveData.rows];
                              next[idx].remarks = e.target.value;
                              setReserveData({ ...reserveData, rows: next });
                            }} 
                            className="w-full bg-transparent outline-none focus:bg-emerald-50 rounded px-1 text-slate-600 italic text-[10pt]"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-50 text-[13pt] font-extrabold text-emerald-900">
                      <td colSpan={2} className="border border-slate-300 py-2.5 px-3 text-right" style={cellStyle}>รวมทั้งสิ้น</td>
                      <td className="border border-slate-300 py-2.5 px-3 text-right font-mono" style={cellStyle}>
                        {formatCur(reserveData.rows.reduce((sum, r) => sum + r.begBal, 0))}
                      </td>
                      <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-slate-700" style={cellStyle}>
                        {formatCur(reserveData.rows.reduce((sum, r) => sum + r.addAmt, 0))}
                      </td>
                      <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-slate-700" style={cellStyle}>
                        {formatCur(reserveData.rows.reduce((sum, r) => sum + r.decAmt, 0))}
                      </td>
                      <td className="border border-slate-300 py-2.5 px-3 text-right font-mono text-emerald-800" style={cellStyle}>
                        {formatCur(reserveData.rows.reduce((sum, r) => sum + r.endBal, 0))}
                      </td>
                      <td className="border border-slate-300 no-print" style={cellStyle}></td>
                      <td className="border border-slate-300" style={cellStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Checklists & notes */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    วิธีการตรวจสอบ (Audit Methods)
                  </h4>
                  <ul className="space-y-2.5 text-[11pt] text-slate-700">
                    {reserveData.methods.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 cursor-pointer" onClick={() => {
                        const next = [...reserveData.methods];
                        next[i].checked = !next[i].checked;
                        setReserveData({ ...reserveData, methods: next });
                      }}>
                        <div className="mt-1 shrink-0">
                          {m.checked ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}
                        </div>
                        <span>{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[13pt] font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-600" />
                    สรุปผลการตรวจสอบ (Audit Conclusions)
                  </h4>
                  <div className="relative">
                    <textarea
                      value={reserveData.conclusionNotes}
                      onChange={(e) => setReserveData({ ...reserveData, conclusionNotes: e.target.value })}
                      className="w-full text-[11pt] border border-slate-200 rounded-xl p-3 h-28 focus:outline-emerald-500 bg-slate-50/50 resize-none font-thai print:hidden"
                      placeholder="ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ..."
                    />
                    <div className="hidden print:block text-[11pt] border border-slate-200 rounded-xl p-3 min-h-28 font-thai bg-slate-50/50 whitespace-pre-wrap text-slate-800 text-left print-conclusion-box">
                      {reserveData.conclusionNotes || 'ระบุข้อสังเกต หรือ ผลลัพธ์จากการตรวจสอบ...'}
                    </div>
                  </div>
                </div>
              </div>

            </div>

        </div>
      </div>

    </div>

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
    </>
  );
}
