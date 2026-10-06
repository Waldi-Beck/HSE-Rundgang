import { expect, test } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const shots = path.resolve('docs/screenshots');
const fixture = path.resolve('tests/fixtures/mangel-fluchtweg.jpg');

test('Rundgang anlegen, Mangel mit Foto erfassen, abschliessen und exportieren', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // US5: Leerzustand
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Noch kein Rundgang erfasst' })).toBeVisible();
  await expect(page.getByText('QPS_HSE_00064')).toBeVisible();
  await expect(page.getByText('Gültig ab 05.10.2026')).toBeVisible();

  // US1: neuer Rundgang, erster im Monat -> Monatsrundgang vorgeschlagen
  await page.getByTestId('new-walk').click();
  await expect(page).toHaveURL(/#\/rundgang\/.+\/daten/);
  await expect(page.getByRole('radio', { name: /Monatsrundgang/ })).toHaveAttribute('aria-checked', 'true');
  // für einen kompakten Test auf Wochenrundgang wechseln
  await page.getByRole('radio', { name: /Wochenrundgang/ }).click();
  await page.getByLabel('Durchgeführt von').fill('Waldemar Becker');
  await page.getByLabel('Bereich').fill('xTec Werkstatt, Lager, QLabs');
  await page.getByTestId('to-checklist').click();

  // Rubriken A, C, F, G sichtbar, B nicht
  await expect(page.getByRole('heading', { name: /Alle Bereiche/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Engineering/ })).toHaveCount(0);

  // US2: A1 Nicht OK -> Mängel-Formular
  await page.getByTestId('rate-A1-nok').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: /Mangel Nr. 1 zu A1/ })).toBeVisible();
  await sheet.getByLabel('Mangel / Gefahr').fill('Fluchtweg vor Notausgang Werkstatt mit Palettenstapel verstellt');
  await sheet.getByLabel('Massnahme').fill('Paletten sofort ins Lager umstellen, Bodenmarkierung erneuern');
  await sheet.getByLabel('Verantwortlich').fill('Lager xTec');
  await sheet.getByTestId('prio-H').click();
  const walkDate = await page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await expect(sheet.getByLabel('Frist')).toHaveValue(walkDate);
  await sheet.getByTestId('photo-camera').setInputFiles(fixture);
  await expect(sheet.getByTestId('photo-list').locator('img')).toHaveCount(1);
  // Foto wurde auf max. 1600 px verkleinert
  const dims = await sheet.getByTestId('photo-list').locator('img').evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(dims).toEqual([1600, 1200]);
  await sheet.getByTestId('photo-list').evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await page.screenshot({ path: `${shots}/02-mangel-mit-foto.png` });
  await sheet.getByTestId('defect-save').click();
  await expect(sheet).toHaveCount(0);

  // restliche Punkte je Rubrik auf OK
  const restOk = page.getByRole('button', { name: /Restliche \d+ Punkte auf OK setzen/ });
  for (let i = 0; i < 5 && (await restOk.count()) > 0; i++) {
    const before = await restOk.count();
    await restOk.first().click();
    await expect(restOk).toHaveCount(before - 1);
  }
  await expect(page.getByRole('button', { name: /Restliche \d+ Punkte/ })).toHaveCount(0);
  await expect(page.getByText('27/27 bewertet')).toBeVisible();
  await page.locator('#item-A1').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -170));
  await page.screenshot({ path: `${shots}/01-checkliste.png` });

  // US3: Abschluss
  await page.getByRole('link', { name: 'Weiter zum Abschluss' }).click();
  await expect(page.getByTestId('count-checked')).toHaveText('27');
  await expect(page.getByTestId('count-ok')).toHaveText('26');
  await expect(page.getByTestId('count-nok')).toHaveText('1');
  await expect(page.getByTestId('count-na')).toHaveText('0');

  // Abschluss ohne Ergebnis/Unterschrift wird verhindert
  await page.getByTestId('close-walk').click();
  await expect(page.getByTestId('close-errors')).toContainText('Unterschrift');

  await page.getByRole('radio', { name: /Offene Massnahmen/ }).click();
  const canvas = page.getByTestId('sig-Durchführende/r');
  await canvas.evaluate((c) => c.scrollIntoView({ block: 'center' }));
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 90);
  await page.mouse.down();
  for (const [dx, dy] of [[60, 40], [90, 80], [130, 30], [170, 90], [210, 50], [260, 70]]) {
    await page.mouse.move(box.x + dx, box.y + dy, { steps: 4 });
  }
  await page.mouse.up();
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
  process.env.KEEP_PDF && (await pdf.saveAs(process.env.KEEP_PDF));
  await pdf.saveAs(pdfPath);
  const head = readFileSync(pdfPath).subarray(0, 5).toString();
  expect(head).toBe('%PDF-');
  expect(statSync(pdfPath).size).toBeGreaterThan(50_000); // Foto eingebettet

  // US4: Folgerundgang zeigt offenen Mangel
  await page.getByRole('link', { name: 'Übersicht', exact: true }).click();
  await page.getByTestId('new-walk').click();
  await expect(page.getByTestId('open-points')).toContainText('Fluchtweg vor Notausgang');

  // US5: JSON-Sicherung
  await page.getByRole('link', { name: 'Sicherung', exact: true }).click();
  const [json] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-json').click()]);
  const jsonPath = test.info().outputPath(json.suggestedFilename());
  await json.saveAs(jsonPath);
  const backup = JSON.parse(readFileSync(jsonPath, 'utf8'));
  expect(backup.format).toBe('qps-hse-rundgang-backup');
  expect(backup.walks).toHaveLength(2);
  expect(backup.photos).toHaveLength(1);

  expect(errors).toEqual([]);
});
