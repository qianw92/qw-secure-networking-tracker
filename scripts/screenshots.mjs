/**
 * Captures the README screenshots against the live deployment.
 *
 *   node scripts/screenshots.mjs
 *
 * Credentials come from apps/api/.env.local, which is gitignored -- no
 * password is written into this file. Run it again after a UI change and the
 * evidence regenerates rather than going stale.
 */
import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const APP = process.env.APP_URL ?? 'https://qw-network-tracker.vercel.app'
const OUT = 'docs/screenshots'

/** Read TEST_USER_* out of the gitignored env file. */
async function credentials() {
  const raw = await readFile('apps/api/.env.local', 'utf8')
  const get = (key) =>
    raw.split('\n').find((l) => l.startsWith(`${key}=`))?.slice(key.length + 1).trim()
  return {
    a: { email: get('TEST_USER_A_EMAIL'), password: get('TEST_USER_A_PASSWORD') },
    b: { email: get('TEST_USER_B_EMAIL'), password: get('TEST_USER_B_PASSWORD') },
  }
}

/**
 * `full` captures the whole scrollable page. Needed wherever the contact
 * list is the point: at a phone width the list sits below the add form, so a
 * viewport-only shot proves nothing.
 */
const shot = (page, name, { full = false } = {}) =>
  page
    .screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full })
    .then(() => console.log(`  ✓ ${name}.png${full ? ' (full page)' : ''}`))

async function signIn(page, who) {
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('you@berkeley.edu').fill(who.email)
  await page.locator('#password').fill(who.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForSelector('text=Add a contact', { timeout: 30_000 })
  await page.waitForTimeout(1500)
}

async function signOut(page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForSelector('text=Welcome back', { timeout: 30_000 })
}

const run = async () => {
  await mkdir(OUT, { recursive: true })
  const { a, b } = await credentials()
  if (!a.email || !b.email) throw new Error('TEST_USER_* missing from apps/api/.env.local')

  const browser = await chromium.launch()

  // ---- desktop ----
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await shot(page, '01-sign-in')

  await signIn(page, a)

  // Validation: submit a blank name.
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.waitForTimeout(800)
  await shot(page, '03-validation-error')

  // Create.
  await page.locator('#add-name').fill('Ada Okafor')
  await page.locator('#add-company').fill('Figma')
  await page.locator('#add-role').fill('Design Lead')
  await page.locator('#add-met_where').fill('Haas Design Night')
  await page.locator('#add-notes').fill('Offered to review my portfolio in October.')
  await shot(page, '04-add-contact-filled')
  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.waitForTimeout(2500)
  await shot(page, '05-contact-created', { full: true })

  // Refresh: the contact survives because it lives in Postgres.
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await shot(page, '06-survives-refresh', { full: true })

  // Expanded row showing notes.
  await page.getByRole('button', { name: /Show details for Ada Okafor/ }).click()
  await page.waitForTimeout(700)
  await shot(page, '07-row-expanded-notes', { full: true })

  // Edit.
  const row = page.locator('tbody tr', { hasText: 'Ada Okafor' }).first()
  await row.getByRole('button', { name: 'Edit' }).click()
  await page.waitForTimeout(900)
  await page.locator('#edit-role').fill('Principal Designer')
  await shot(page, '08-edit-dialog')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.waitForTimeout(2500)
  await shot(page, '09-edit-saved', { full: true })

  // Delete.
  const row2 = page.locator('tbody tr', { hasText: 'Ada Okafor' }).first()
  await row2.getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(900)
  await shot(page, '10-delete-confirm')
  await page.getByRole('button', { name: 'Delete contact' }).click()
  await page.waitForTimeout(2500)
  await shot(page, '11-deleted', { full: true })

  // Two-account proof: same app, same database, different views.
  await shot(page, '12-user-a-contacts', { full: true })
  await signOut(page)
  await shot(page, '13-signed-out')
  await signIn(page, b)
  await shot(page, '14-user-b-sees-nothing', { full: true })

  await ctx.close()

  // ---- mobile ----
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const mpage = await mob.newPage()
  await mpage.goto(APP, { waitUntil: 'networkidle' })
  await mpage.waitForTimeout(1200)
  await shot(mpage, '15-mobile-sign-in')
  await signIn(mpage, a)
  await shot(mpage, '16-mobile-contacts', { full: true })
  await mob.close()

  await browser.close()
  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
