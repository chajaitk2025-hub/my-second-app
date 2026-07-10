# Project Guidelines and Design Standards

All future AI agents working on this project must strictly adhere to the following rules, design choices, and formatting constraints to maintain consistency.

## 1. Official Letterhead Formatting (หัวกระดาษจดหมายอย่างเป็นทางการ)
* **Left-Aligned Header**: The company letterhead details must always be aligned to the left, following official Thai administrative/office correspondence standards. Do NOT center the header contents.
* **No Logo**: Do not display the TK Logo image in the letterhead. Keep it clean and elegant with text only.
* **Company Name (Thai)**: "บริษัททีเค แอคเค้าท์ แอนด์ แอสโซซิเอท จำกัด" must be styled with a font size of exactly **18pt**, ultra-bold (`font-extrabold`), tracking-wide, and `leading-tight`.
* **Sub-Header Details**: All other header details must be styled with a font size of exactly **16pt** to ensure a neat, formal, and organized layout:
  * English Name: "TK Account & Associate CO.,Ltd" with size **16pt**, font-normal.
  * Address Line: "110/404 ซอยรามคำแหง 188 แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10510" with size **16pt**.
  * Tax & Contact Line: "เลขประจำตัวผู้เสียภาษีอากร 0105556199549 โทร 086- 549-9814 : E-mail- Thatikarn_sr @ hotmail.com" with size **16pt**.
* **Header Divider**: Use a dashed border (`border-b-2 border-dashed`) under the header.

## 2. Page Margins (ระยะขอบหน้ากระดาษ)
* **Dimensions**: Page margins must be strictly set to the Thai and international official standards:
  * **Left & Right Margins**: 1.8 cm (**18mm**)
  * **Top & Bottom Margins**: 2.0 cm (**20mm**)
* This spacing must be perfectly preserved and consistently applied to **both** the interactive screen preview canvas and the final printed output/PDF layout.

## 3. Letter Content Styling
* **Inspection Dates**: The text displaying the inspection dates ("วันที่เข้าตรวจ" or `inspectionDatesText`) should **not have an underline**. It must be styled with a bold weight (`font-extrabold`) only, with no border or underline decoration.
* **Font**: Use the Th Sarabun or formal Thai-compatible sans-serif font rendering (`font-thai` or custom font family) for legal and administrative correspondence look-and-feel.

## 4. Liabilities and Equity Working Papers Rules (กฎกระดาษทำการหนี้สินและส่วนของเจ้าของ/ทุน)
* **Trial Balance Mapping Difference**: 
  * 1. **กระดาษทำการเงินรับฝาก** (Deposits Working Paper)
  * 2. **กระดาษทำการทุนเรือนหุ้น** (Share Capital Working Paper)
  * 3. **กระดาษทำการทุนสะสม** (Accumulated Funds Working Paper)
  * These 3 working papers belong to Liabilities and Equity (หมวดหนี้สินและทุน). They pull values from the credit side (End Credit) of the Trial Balance (งบทดลอง) by default, unlike assets which pull from the debit side (End Debit). 
* **Editing Restriction / Guardrail**:
  * **Strict Instruction**: Do NOT modify or edit any of these three working papers unless the user's prompt explicitly includes the confirmation phrase **"OKแก้ไขได้"**. If that phrase is absent, leave these working papers exactly as they are.

Please read and respect these constraints for any subsequent feature updates, layout changes, or document generation tasks.
