# LabCare Clinical Laboratory - PRD

## Original Problem Statement
Build an app for a Clinical Laboratory named LabCare to generate patient blood test reports. Must run on both Windows and mobile. Logo and test list PDF (Umar Clinical Laboratory ~700 tests) provided.

## User Choices
- Staff login only (admin + lab tech)
- Features: patient records, test report generation, printable PDF, test history & trends analytics
- Preloaded ~50 most common blood tests (CBC, LFT, RFT, Lipid, Sugar, Thyroid, etc.) with editable reference ranges
- Brand: LabCare Clinical Laboratory, currency PKR
- Deliverable: Responsive web app + installable PWA (Windows & mobile)

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT auth (httpOnly cookie + Bearer fallback), bcrypt password hashing
- Frontend: React 19 + React Router 7 + Tailwind + shadcn components + lucide-react + recharts
- PWA: manifest.json + theme color #BE123C

## User Personas
- Admin / Chief Pathologist (full access, catalog edits, approvals)
- Lab Technician (data entry, report generation)

## What's Implemented (2026-02-04)
- JWT auth (login, logout, me, admin seed)
- Patient CRUD (8 seeded Pakistani patients with MR numbers LC-2026-XXXX)
- Test catalog CRUD (54 seeded tests across 9 categories: Hematology, Biochemistry, Endocrinology, Immunology, Virology, Microbiology, Serology, Cardiac, Urinalysis, Pathology)
- Report generation flow: patient + multi-test selection + numeric result entry + auto H/L/N flagging + PKR total
- Printable A4 PDF via browser print, with lab branding, patient info, test results table, reference ranges, pathologist signature
- Reports list with search; patient detail with history
- Trend analytics (recharts line chart with normal range shading)
- Mobile responsive sidebar + PWA manifest
- Design system: crimson #BE123C + navy #0F172A + teal #0D9488, Manrope/IBM Plex Sans/JetBrains Mono fonts

## Credentials
Admin: admin@labcare.com / admin123

## Prioritized Backlog
### P1 (Next phase)
- Role differentiation (admin vs technician views)
- Full 700+ test import from the uploaded Umar PDF
- Barcode/QR on reports for verification
- Export report as true PDF via server-side rendering (currently browser print)
- Daily/monthly revenue reports and tax invoice formatting

### P2
- SMS/WhatsApp report delivery to patients
- Lab logo upload in settings
- Multi-lab / multi-branch support
- Audit log of edits
- Backup/restore
