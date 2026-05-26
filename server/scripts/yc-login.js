/**
 * Guarda sesión YC en perfil persistente de Chrome (account + workatastartup).
 * Uso: npm run yc:login (desde la raíz del repo ApplyOS)
 *
 * Importante: todo el login tiene que ser en la ventana que abre este script.
 * Si verificás el mail en Chrome normal, esa sesión NO queda en ApplyOS.
 */
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import {
  launchWaasBrowser,
  needsYcLogin,
  isYcAccountLoggedInView,
  PROFILE_DIR,
} from '../services/autoApply/browserSession.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

function getActivePage(context) {
  const pages = context.pages().filter((p) => !p.isClosed());
  return pages[0] || null;
}

async function main() {
  const user = process.env.YC_APPLY_USERNAME || process.env.YC_APPLY_EMAIL;
  const password = process.env.YC_APPLY_PASSWORD;

  console.log('\n🔐 ApplyOS — Login YC (perfil persistente)\n');
  console.log(`Perfil: ${PROFILE_DIR}\n`);
  console.log('Se abrirá una ventana de Chrome SOLO para ApplyOS.');
  console.log('NO la cierres hasta ver «Sesión guardada» abajo.');
  console.log('Si YC te pide verificar el email, hacelo en ESA misma ventana (no en otro Chrome).\n');

  const context = await launchWaasBrowser({ headless: false });
  let page = context.pages()[0] || (await context.newPage());

  await page.goto('https://account.ycombinator.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  let mustInteract = await needsYcLogin(page);
  if (mustInteract && (await isYcAccountLoggedInView(page))) {
    mustInteract = false;
  }
  if (mustInteract && user && password) {
    const loginInput = page.locator('#ycid-input');
    await loginInput.waitFor({ state: 'visible', timeout: 15000 });
    await loginInput.fill(user);
    await page.locator('#password-input').fill(password);
    console.log('→ Credenciales rellenadas. Pulsa «Log In» en el navegador (y captcha si sale).\n');
  } else if (!mustInteract) {
    console.log('→ Esta ventana ya tiene sesión en account.ycombinator.com. Seguimos…\n');
  }

  if (mustInteract) {
    await waitForEnter(
      'Cuando hayas iniciado sesión y verificado el email EN ESA VENTANA, pulsa ENTER aquí… ',
    );
  }

  page = getActivePage(context);
  if (!page) {
    console.error(
      '\n❌ Se cerró el navegador de Playwright antes de tiempo.\n' +
        '   Volvé a ejecutar npm run yc:login y NO cierres la ventana hasta el final.\n' +
        '   Cerrá otros Chrome que usen el mismo perfil si el error se repite.\n',
    );
    await context.close().catch(() => {});
    process.exit(1);
  }

  try {
    await page.goto('https://account.ycombinator.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.goto('https://www.workatastartup.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  } catch (err) {
    console.error(
      '\n❌',
      err.message,
      '\n\nLa ventana de Chrome se cerró o perdió la conexión antes de guardar.\n' +
        '• No cierres el Chrome que abrió ApplyOS hasta ver «Sesión guardada».\n' +
        '• No ejecutes dos veces yc:login a la vez (bloquea el perfil).\n' +
        '• Volvé a ejecutar: npm run yc:login\n',
    );
    await context.close().catch(() => {});
    process.exit(1);
  }

  const ok = !(await needsYcLogin(page));
  await context.close();

  if (!ok) {
    console.error('\n❌ Aún pide login en Work at a Startup. Completá el inicio en la ventana y volvé a ejecutar npm run yc:login\n');
    process.exit(1);
  }

  console.log('\n✅ Sesión guardada en el perfil de ApplyOS.');
  console.log('Reiniciá npm run dev si el server ya estaba corriendo.\n');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
