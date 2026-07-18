import { test, expect } from '@playwright/test';
import https from 'https';

async function createUser(username: string, password: string) {
  const payload = JSON.stringify({ userName: username, password });

  return await new Promise<{ userID: string; username: string }>(
    (resolve, reject) => {
      const req = https.request(
        {
          hostname: 'demoqa.com',
          path: '/Account/v1/User',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(JSON.parse(body));
            } else {
              reject(
                new Error(`Create user failed: ${res.statusCode}\n${body}`),
              );
            }
          });
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    },
  );
}

test('register, login, add book, delete book, and logout', async ({ page }) => {
  const uniqueSuffix = Date.now();
  const username = `demoqauser${uniqueSuffix}`;
  const password = 'Test@1234!';
  const bookTitle = 'Git Pocket Guide';

  await createUser(username, password);

  await page.goto('https://demoqa.com/login');
  await page.locator('#userName').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/profile/);
  await page.goto('https://demoqa.com/books');

  await page.locator('#searchBox').fill(bookTitle);
  await page.getByText(bookTitle).first().click();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: /add to your collection/i }).click();

  await page.goto('https://demoqa.com/profile');
  await expect(page.getByText(bookTitle)).toBeVisible();

  await page.getByRole('button', { name: 'Delete All Books' }).click();
  await expect(page.getByText('Do you want to delete all books?')).toBeVisible();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await expect(page.getByText('Do you want to delete all books?')).not.toBeVisible();
  await expect(page.getByText(bookTitle)).not.toBeVisible();

  const logoutButton = page.getByRole('button', { name: /log out/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    await page.goto('https://demoqa.com/login');
  }

  await page.waitForLoadState('networkidle');
});
