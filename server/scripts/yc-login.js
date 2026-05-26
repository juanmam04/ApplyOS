/**
 * Guarda sesión YC en perfil persistente de Chrome (account + workatastartup).
 * Uso: cd server && npm run yc:login
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchWaasBrowser, needsYcLogin, PROFILE_DIR } from '../services/autoApply/browserSession.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

async function main() {
  const user = process.env.YC_APPLY_USERNAME || process.env.YC_APPLY_EMAIL;
  const password = process.env.YC_APPLY_PASSWORD;

  console.log('\n🔐 ApplyOS — Login YC (perfil persistente)\n');
  console.log(`Perfil: ${PROFILE_DIR}\n`);
  console.log('1. Se abre Chrome');
  console.log('2. Inicia sesión en YC (resuelve captcha si aparece)');
  console.log('3. Visita workatastartup.com para confirmar');
  console.log('4. Pulsa ENTER aquí cuando estés logueado\n');

  const context = await launchWaasBrowser({ headless: false });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://account.ycombinator.com/', { waitUntil: 'domcontentloaded' });

  if (user && password && (await needsYcLogin(page))) {
    await page.locator('#ycid-input').fill(user);
    await page.locator('#password-input').fill(password);
    console.log('→ Credenciales rellenadas. Pulsa Log In en el navegador.\n');
  }

  await new Promise(resolve => process.stdin.once('data', resolve));

  await page.goto('https://account.ycombinator.com/', { waitUntil: 'domcontentloaded' });
  await page.goto('https://www.workatastartup.com/', { waitUntil: 'domcontentloaded' });

  const ok = !(await needsYcLogin(page));
  await context.close();

  if (!ok) {
    console.error('\n❌ Aún pide login. Completa el inicio de sesión y vuelve a ejecutar npm run yc:login\n');
    process.exit(1);
  }

  console.log('\n✅ Sesión guardada.');
  console.log('Si tu perfil WaaS no está al 100%, completa Skills en el navegador y pulsa ENTER otra vez.\n');
  console.log('Luego usa «Aplicar (auto)» en ApplyOS.\n');
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
