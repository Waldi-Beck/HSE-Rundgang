import { expect, test } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const shots = path.resolve('docs/screenshots');
const fixture = path.resolve('tests/fixtures/mangel-fluchtweg.jpg');
const ROOMS = ['engineering', 'qlabs', 'qmeasure', 'xtec-lager', 'xtec-werkstatt'];

async function restOkEverywhere(page: import('@playwright/test').Page) {
  for (const room of ROOMS) {
    await page.getByTestId(`area-tab-${room}`).click();
    const rest = page.getByTestId('rest-ok');
    await expect(rest).toBeVisible();
    await rest.click();
    await expect(page.getByTestId(`area-tab-${room}`)).toContainText('15/15');
  }
}

async function sign(page: import('@playwright/test').Page) {
  const canvas = page.getByTestId('sig-Durchführende/r');
  await canvas.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 65);
  await page.mouse.down();
  for (const [x, y] of [[60, 35], [100, 60], [145, 25], [190, 65], [240, 38]]) await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
  await page.mouse.up();
}

test('neuer Rundgang, optionale Monatspunkte, Mangel mit Foto, Abschluss, Register und Exporte', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Übersicht' })).toBeVisible();
  await expect(page.getByText('QPS_HSE_00064')).toBeVisible();
  await expect(page.getByText('Gültig ab 05.10.2026')).toBeVisible();

  await page.getByTestId('new-walk').click();
  const docNr = (await page.getByTestId('walk-docnr').textContent())?.trim();
  expect(docNr).toMatch(/^HSE-RG-\d{4}-001$/);
  await page.getByLabel('Durchgeführt von').fill('Max Muster');
  const endTime = await page.getByLabel('Uhrzeit Beginn').evaluate((element: HTMLInputElement) => {
    const [hour, minute] = element.value.split(':').map(Number);
    const end = (hour * 60 + minute + 30) % 1440;
    return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  });
  await page.getByLabel('Uhrzeit Ende').fill(endTime);
  await expect(page.getByLabel('Dauer')).toHaveValue('0:30');
  await expect(page.getByTestId('monthly-checked')).toBeChecked();
  await page.getByTestId('to-checklist').click();

  for (const room of ROOMS) await expect(page.getByTestId(`area-tab-${room}`)).toBeVisible();
  await expect(page.getByTestId('area-tab-monatlich')).toBeVisible();
  await page.getByTestId('area-tab-qlabs').click();
  await expect(page.getByRole('heading', { name: 'QLabs', exact: true })).toBeVisible();
  await expect(page.getByText('VKF-Brandschutzvorschriften (BSV 2015)').first()).toBeVisible();
  await page.getByTestId('rate-R4@qlabs-mangel').click();

  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: /Mangel 2026-\d{2}-\d{2}-M01/ })).toBeVisible();
  await expect(sheet.getByLabel('Kontrollpunkt')).toHaveValue('R4');
  await expect(sheet.getByLabel('Bereich')).toHaveValue('qlabs');
  await sheet.getByLabel('Beschreibung des Mangels').fill('Feuerlöscher hinter Material abgestellt');
  await sheet.getByLabel('Festgestellte Gefahr').fill('Löscher im Ereignisfall nicht erreichbar');
  await sheet.getByLabel('Sofortmassnahme').fill('Material sofort entfernt');
  await sheet.getByLabel('Massnahme', { exact: true }).fill('Bodenfläche vor dem Löscher markieren');
  await sheet.getByLabel('Verantwortlich').fill('Max Muster');
  await sheet.getByTestId('prio-H').click();
  await sheet.getByTestId('photo-camera').setInputFiles(fixture);
  await expect(sheet.getByTestId('photo-list').locator('img')).toHaveCount(1);
  await sheet.screenshot({ path: `${shots}/02-mangel-mit-foto.png` });
  await sheet.getByTestId('defect-save').click();
  await expect(sheet).toHaveCount(0);

  await restOkEverywhere(page);
  for (const room of ROOMS) await expect(page.getByTestId(`area-tab-${room}`)).toContainText('15/15');
  await page.getByTestId('area-tab-monatlich').click();
  await page.getByLabel('Bereich M1').selectOption({ label: 'QLabs' });
  await page.getByTestId('rate-M1-mangel').click();
  const monthlySheet = page.getByRole('dialog');
  await expect(monthlySheet.getByLabel('Kontrollpunkt')).toHaveValue('M1');
  await expect(monthlySheet.getByLabel('Bereich')).toHaveValue('QLabs');
  await monthlySheet.getByLabel('Beschreibung des Mangels').fill('Inhalt des Erste-Hilfe-Kastens unvollständig');
  await monthlySheet.getByLabel('Festgestellte Gefahr').fill('Material für erste Hilfe fehlt');
  await monthlySheet.getByLabel('Verantwortlich').fill('Max Muster');
  await monthlySheet.getByTestId('prio-M').click();
  await monthlySheet.getByTestId('defect-save').click();
  await expect(monthlySheet).toHaveCount(0);
  for (let index = 1; index <= 9; index++) {
    const monthlyArea = page.getByTestId(`monthly-area-M${index}`);
    const area = index === 1 ? 'QLabs' : 'Engineering';
    await monthlyArea.selectOption({ label: area });
    await expect(monthlyArea).toHaveValue(area);
  }
  const monthlyRest = page.getByTestId('rest-ok');
  if (await monthlyRest.count()) await monthlyRest.click();
  await page.screenshot({ path: `${shots}/01-checkliste.png` });

  await page.getByRole('link', { name: /3\. Mängel/ }).click();
  await expect(page.getByText(/2026-\d{2}-\d{2}-M01/).first()).toBeVisible();
  await page.getByRole('link', { name: /4\. Abschluss/ }).click();
  await page.getByTestId('close-walk').click();
  await expect(page.getByTestId('close-errors')).toContainText('Unterschrift');
  await page.getByRole('radio', { name: /offenen Massnahmen/i }).click();
  await sign(page);
  await page.getByTestId('close-walk').click();
  await expect(page.getByText(/Abgeschlossen am/)).toBeVisible();
  await page.screenshot({ path: `${shots}/03-abschluss.png` });

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-pdf').click()]);
  expect(pdf.suggestedFilename()).toBe(`HSE-Rundgang_${new Date().toISOString().slice(0, 10)}_${docNr}.pdf`);
  const pdfPath = test.info().outputPath(pdf.suggestedFilename());
  if (process.env.KEEP_PDF) await pdf.saveAs(process.env.KEEP_PDF);
  await pdf.saveAs(pdfPath);
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-');
  expect(statSync(pdfPath).size).toBeGreaterThan(30_000);

  await page.getByRole('link', { name: 'Register', exact: true }).click();
  await page.getByRole('tab', { name: 'Rundgänge' }).click();
  await expect(page.getByTestId(/round-row/).first()).toContainText(docNr!);
  await page.getByRole('tab', { name: 'Mängel' }).click();
  await expect(page.getByText('2026-').first()).toBeVisible();
  await expect(page.getByText('Feuerlöscher hinter Material abgestellt')).toBeVisible();
  await page.getByRole('tab', { name: 'Prüftermine' }).click();
  await expect(page.getByTestId('inspection-description-inspection-01')).toHaveValue('Sicherheitsdatenblätter auf Aktualität prüfen');

  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel exportieren' }).click()]);
  expect(xlsx.suggestedFilename()).toMatch(/^HSE-Rundgang_Register_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const xlsxPath = test.info().outputPath(xlsx.suggestedFilename());
  if (process.env.KEEP_XLSX) await xlsx.saveAs(process.env.KEEP_XLSX);
  await xlsx.saveAs(xlsxPath);
  expect(statSync(xlsxPath).size).toBeGreaterThan(5_000);

  await page.getByRole('link', { name: 'Übersicht', exact: true }).click();
  await expect(page.getByTestId('overview-round-count')).toHaveText('1');
  await page.getByTestId('new-walk').click();
  const secondDocNr = (await page.getByTestId('walk-docnr').textContent())?.trim();
  expect(secondDocNr).toMatch(/^HSE-RG-\d{4}-002$/);
  await expect(page.getByTestId('open-points')).toContainText('Feuerlöscher hinter Material abgestellt');
  expect(errors).toEqual([]);
});
