# Quickstart: HSE Rundgang

```powershell
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Acceptance walk-through

1. Overview shows last round, next due date, monthly-check state and defect totals.
2. Create a walk. Date, beginning time and monthly 2.2 suggestion are prefilled; enter end time and placeholder name `Max Muster`.
3. In 2.1 choose QLabs and mark R4 as Mangel. Defect editor is prefilled with QLabs/R4.
4. Add description, hazard, immediate action, action, priority, responsible person and a camera fixture photo; save.
5. In the QPS/QLabs/xTec matrix use Rest OK per column. If 2.2 is checked, assess M1-M9 too.
6. Choose a result, draw signature and close. Incomplete fields must block closure.
7. Download PDF with date and immutable walk number; inspect every page.
8. Export XLSX and verify `Rundgänge`, `Mängel` and their register columns.
9. Create a second walk. Verify previous open defect appears and overview/register counts match.
10. Mark a test defect `Nachkontrolle erforderlich`, enter a new date, and verify that it becomes the effective due date.
