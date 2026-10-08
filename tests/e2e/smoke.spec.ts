import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const shots = path.resolve('docs/screenshots');
const fixture = path.resolve('tests/fixtures/mangel-fluchtweg.jpg');
const AREAS = ['gaenge', 'engineering', 'qlabs', 'qmeasure', 'xtec-lager', 'xtec-werkstatt'];

async function restOkEverywhere(page: Page, steps: string[]) {
  for (const id of steps) {
    await page.getByTestId(`area-tab-${id}`).click();
    await expect(page.getByTestId(`area-tab-${id}`)).toHaveAttribute('aria-current', 'step');
    const restOk = page.getByRole('button', { name: /Restliche \d+ Punkte auf OK setzen/ });
    if (await restOk.count()) await restOk.click();
    await expect(restOk).toHaveCount(0);
  }
}

async function sign(page: Page) {
  const canvas = page.getByTestId('sig-Durchführende/r');
  await canvas.evaluate((c) => c.scrollIntoView({ block: 'center' }));
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 90);
  await page.mouse.down();
  for (const [dx, dy] of [[60, 40], [90, 80], [130, 30], [170, 90], [210, 50], [260, 70]]) {
    await page.mouse.move(box.x + dx, box.y + dy, { steps: 4 });
  }
  await page.mouse.up();
}

test('Wochenrundgang Raum für Raum, Mangel mit Foto und Bereich, abschliessen und exportieren', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // US5: Leerzustand, Kopfdaten unverändert
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Noch kein Rundgang erfasst' })).toBeVisible();
  await expect(page.getByText('QPS_HSE_00064')).toBeVisible();
  await expect(page.getByText('Gültig ab 05.10.2026')).toBeVisible();

  // US1: neuer Rundgang, erster im Monat -> Monatsrundgang vorgeschlagen
  await page.getByTestId('new-walk').click();
  await expect(page).toHaveURL(/#\/rundgang\/.+\/daten/);
  await expect(page.getByRole('radio', { name: /Monatsrundgang \(2\.1 \+ 2\.2\)/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: /Wochenrundgang \(2\.1\)/ }).click();
  await page.getByLabel('Durchgeführt von').fill('Waldemar Becker');
  await page.getByLabel('Begleitperson').fill('Roman Paharukov');
  await expect(page.getByLabel('Bereich', { exact: true })).toHaveCount(0); // Feld "Bereich" entfällt in Kapitel 1
  await page.getByTestId('to-checklist').click();

  // Bereichswahl: 6 Bereiche, kein 2.2 beim Wochenrundgang
  for (const a of AREAS) await expect(page.getByTestId(`area-tab-${a}`)).toBeVisible();
  await expect(page.getByTestId('area-tab-monatlich')).toHaveCount(0);
  await page.getByTestId('area-tab-qlabs').click();
  await expect(page.getByRole('heading', { name: 'QLabs', exact: true })).toBeVisible();
  await expect(page.getByText('VKF-Brandschutzvorschriften').first()).toBeVisible(); // Grundlage je Punkt

  // US2: W4 in QLabs auf Mangel -> Formular mit Punkt und Bereich vorbelegt
  await page.getByTestId('rate-W4@qlabs-mangel').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: /Mangel Nr. 1 zu W4 \/ QLabs/ })).toBeVisible();
  await expect(sheet.getByLabel('Pkt. (Checklistenpunkt)')).toHaveValue('W4');
  await expect(sheet.getByLabel('Bereich')).toHaveValue('qlabs');
  await sheet.getByLabel('Mangel / Gefahr').fill('Feuerlöscher im Labor hinter Palette mit Glasbruchbehältern verstellt');
  await sheet.getByLabel('Massnahme').fill('Palette sofort umstellen, Bodenmarkierung vor dem Löscher anbringen');
  await sheet.getByLabel('Verantwortlich').fill('QLabs, Laborleitung');
  await sheet.getByTestId('prio-H').click();
  const due = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await expect(sheet.getByLabel('Frist')).toHaveValue(due);
  await sheet.getByTestId('photo-camera').setInputFiles(fixture);
  await expect(sheet.getByTestId('photo-list').locator('img')).toHaveCount(1);
  const dims = await sheet.getByTestId('photo-list').locator('img').evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(dims).toEqual([1600, 1200]); // auf max. 1600 px verkleinert
  await sheet.getByTestId('photo-list').evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.screenshot({ path: `${shots}/02-mangel-mit-foto.png` });
  await sheet.getByTestId('defect-save').click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('#item-W4-qlabs')).toContainText('Mangel-Nr.');

  // "Rest OK" je Bereich
  await restOkEverywhere(page, AREAS);
  for (const a of AREAS) await expect(page.getByTestId(`area-tab-${a}`)).toContainText('16/16');
  await expect(page.getByTestId('area-tab-qlabs')).toContainText('1 Mangel');
  await expect(page.getByText('96/96 bewertet')).toBeVisible();
  await page.getByTestId('area-tab-qlabs').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${shots}/01-checkliste.png` });

  // US3: Abschluss
  await page.getByTestId('area-tab-xtec-werkstatt').click();
  await page.getByRole('link', { name: 'Weiter zum Abschluss' }).click();
  await expect(page.getByTestId('count-defects')).toHaveText('1');
  await expect(page.getByTestId('count-critical')).toHaveText('0');
  await page.getByTestId('close-walk').click();
  await expect(page.getByTestId('close-errors')).toContainText('Unterschrift');
  await page.getByRole('radio', { name: /Offene Massnahmen/ }).click();
  await sign(page);
  await page.getByTestId('close-walk').click();
  await expect(page.getByText(/Abgeschlossen am/)).toBeVisible();
  await expect(page.getByTestId('close-errors')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 6000 }); // Toast abwarten
  await page.screenshot({ path: `${shots}/03-abschluss.png` });

  // PDF-Export mit Namenskonvention
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf').click()]);
  expect(pdf.suggestedFilename()).toMatch(/^HSE-Rundgang_\d{4}-KW\d{2}\.pdf$/);
  const pdfPath = test.info().outputPath(pdf.suggestedFilename());
  if (process.env.KEEP_PDF) await pdf.saveAs(process.env.KEEP_PDF);
  await pdf.saveAs(pdfPath);
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-');
  expect(statSync(pdfPath).size).toBeGreaterThan(50_000); // Foto eingebettet

  // US4: Folgerundgang zeigt offenen Mangel mit Punkt und Bereich
  await page.getByRole('link', { name: 'Übersicht', exact: true }).click();
  await page.getByTestId('new-walk').click();
  const open = page.getByTestId('open-points');
  await expect(open).toContainText('W4 / QLabs');
  await expect(open).toContainText('Feuerlöscher im Labor');

  // US5: JSON-Sicherung im neuen Format
  await page.getByRole('link', { name: 'Sicherung', exact: true }).click();
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
  const jsonPath = test.info().outputPath(json.suggestedFilename());
  await json.saveAs(jsonPath);
  const backup = JSON.parse(readFileSync(jsonPath, 'utf8'));
  expect(backup.format).toBe('qps-hse-rundgang-backup');
  expect(backup.formatVersion).toBe(2);
  expect(backup.walks).toHaveLength(2);
  expect(backup.defects[0]).toMatchObject({ itemId: 'W4', area: 'qlabs' });
  expect(backup.photos).toHaveLength(1);

  expect(errors).toEqual([]);
});

test('Monatsrundgang: 2.2 mit Mangel "Alle Bereiche / allgemein"', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByTestId('new-walk').click();
  await expect(page.getByRole('radio', { name: /Monatsrundgang/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Durchgeführt von').fill('Waldemar Becker');
  await page.getByTestId('to-checklist').click();

  await page.getByTestId('area-tab-monatlich').click();
  await expect(page.getByRole('heading', { name: '2.2 Monatlich' })).toBeVisible();
  await page.getByTestId('rate-M2-mangel').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByLabel('Bereich')).toHaveValue('');
  await sheet.getByLabel('Mangel / Gefahr').fill('Prüfplakette Feuerlöscher abgelaufen (09/2026)');
  await sheet.getByTestId('defect-save').click();
  await expect(sheet.getByText('Fehlt: Bereich')).toBeVisible(); // Bereich ist Pflicht
  await sheet.getByLabel('Bereich').selectOption({ label: 'Alle Bereiche / allgemein' });
  await sheet.getByTestId('prio-K').click();
  await sheet.getByTestId('defect-save').click();
  await expect(sheet).toHaveCount(0);

  await restOkEverywhere(page, [...AREAS, 'monatlich']);
  await expect(page.getByText('105/105 bewertet')).toBeVisible();
  await page.getByRole('link', { name: 'Weiter zum Abschluss' }).click();
  await expect(page.getByTestId('count-critical')).toHaveText('1');
  await expect(page.getByRole('radio', { name: /Kritischer Mangel/ })).toContainText('Vorschlag');
  await page.getByRole('radio', { name: /Kritischer Mangel/ }).click();
  await sign(page);
  await page.getByTestId('close-walk').click();
  await expect(page.getByText(/Abgeschlossen am/)).toBeVisible();

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf').click()]);
  const pdfPath = test.info().outputPath(pdf.suggestedFilename());
  if (process.env.KEEP_PDF_MONTHLY) await pdf.saveAs(process.env.KEEP_PDF_MONTHLY);
  await pdf.saveAs(pdfPath);
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-');

  expect(errors).toEqual([]);
});
