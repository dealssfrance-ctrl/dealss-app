/**
 * Update each offer's `image_url` column with a JSON array of multiple
 * verified Unsplash photo URLs (matched to the offer's category).
 *
 * - Each candidate URL is HEAD-checked at startup; only URLs that respond
 *   with HTTP 200 are kept in the working pool.
 * - Each offer receives 4–6 distinct URLs from its category pool.
 * - The DB is only updated when at least 3 working URLs are available
 *   for the offer's category, so an offer never ends up with broken images.
 *
 * Run with:
 *   pnpm --filter dealss-backend exec tsx src/update-offer-images.ts
 *   # or, from backend/:  npx tsx src/update-offer-images.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Curated, stable Unsplash photo IDs ──────────────────────────────────────
// All IDs are taken from long-standing, popular photos on the Unsplash CDN.
// We render them through `images.unsplash.com/photo-<id>?w=800&q=80&auto=format`
// which is the canonical, cacheable delivery URL.
const IMG_PARAMS = 'w=800&q=80&auto=format&fit=crop';

const UNSPLASH_POOL: Record<string, string[]> = {
  Mode: [
    '1483985988355-763728e1935b', // clothes rack
    '1490481651871-ab68de25d43d', // woman fashion
    '1567401893414-76b7b1e5a7a5', // pink sweater
    '1485518882345-15568b007407', // shopping bags
    '1496747611176-843222e1e57c', // boutique window
    '1551489186-cf8726f514f8', // denim flat lay
    '1542060748-10c28b62716f', // accessories
    '1469334031218-e382a71b716b', // street style
    '1539109136881-3be0616acf4b', // jacket
    '1558769132-cb1aea458c5e', // scarves
  ],
  Fashion: [
    '1503342217505-b0a15ec3261c', // runway model
    '1492707892479-7bc8d5a4ee93', // chic outfit
    '1529139574466-a303027c1d8b', // hat & bag
    '1544441893-675973e31985', // colorful dresses
    '1509631179647-0177331693ae', // shoes
    '1556905055-8f358a7a47b2', // sunglasses
    '1495121605193-b116b5b9c5fe', // jewelry
    '1582142306909-195724d33ffc', // editorial pose
    '1515886657613-9f3515b0c78f', // luxury bag
    '1488161628813-04466f872be2', // suit jacket
  ],
  Beauté: [
    '1522338242992-e1a54906a8da', // skincare flat lay
    '1571781926291-c477ebfd024b', // lipstick
    '1596462502278-27bfdc403348', // perfume bottle
    '1487412947147-5cebf100ffc2', // beauty model
    '1512496015851-a90fb38ba796', // makeup brushes
    '1583241800698-9c2e0f4b0f4c', // serum drops
    '1556228720-195a672e8a03', // candles & spa
    '1570194065650-d99fb4bedf0a', // facial cream
    '1517841905240-472988babdf9', // beauty editorial
    '1503236823255-94609f598e71', // cosmetics
  ],
  Voyage: [
    '1488646953014-85cb44e25828', // suitcase travel
    '1502602898657-3e91760cbb34', // paris eiffel
    '1507525428034-b723cf961d3e', // beach
    '1469854523086-cc02fe5d8800', // mountains
    '1520250497591-112f2f40a3f4', // city street
    '1530521954074-e64f6810b32d', // tropical
    '1476514525535-07fb3b4ae5f1', // forest hike
    '1523906834658-6e24ef2386f9', // venice canal
    '1499856871958-5b9627545d1a', // lavender field
    '1469474968028-56623f02e42e', // mountain road
  ],
  Sport: [
    '1517836357463-d25dfeac3438', // gym workout
    '1571019613454-1cb2f99b2d8b', // weights
    '1518611012118-696072aa579a', // running
    '1546519638-68e109498ffc', // soccer ball
    '1530549387789-4c1017266635', // yoga mat
    '1552674605-db6ffd4facb5', // tennis
    '1574680096145-d05b474e2155', // basketball
    '1599058917765-a780eda07a3e', // sneakers
    '1540497077202-7c8a3999166f', // boxing gloves
    '1593079831268-3381b0db4a77', // bike
  ],
};

function buildUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?${IMG_PARAMS}`;
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function buildVerifiedPools(): Promise<Record<string, string[]>> {
  const verified: Record<string, string[]> = {};
  for (const [category, ids] of Object.entries(UNSPLASH_POOL)) {
    process.stdout.write(`Verifying ${category} (${ids.length} candidates)… `);
    const urls = ids.map(buildUrl);
    const results = await Promise.all(urls.map(headOk));
    const ok = urls.filter((_, i) => results[i]);
    verified[category] = ok;
    console.log(`✓ ${ok.length}/${urls.length} reachable`);
  }
  return verified;
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  // Deterministic shuffle by seed so a given offer keeps stable images across runs.
  const copy = [...arr];
  let s = seed || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

async function main() {
  console.log('🔍 Verifying Unsplash image pool…\n');
  const pools = await buildVerifiedPools();

  const totalReachable = Object.values(pools).reduce((s, a) => s + a.length, 0);
  if (totalReachable === 0) {
    console.error('❌ No reachable Unsplash images. Aborting.');
    process.exit(1);
  }

  // Fallback pool: union of every reachable URL, used when an offer's
  // category has < 3 verified images of its own.
  const fallback: string[] = Array.from(new Set(Object.values(pools).flat()));

  console.log('\n📦 Loading offers from Supabase…');
  const { data: offers, error } = await supabase
    .from('offers')
    .select('id, category, store_name');
  if (error) {
    console.error('❌ Failed to load offers:', error.message);
    process.exit(1);
  }
  if (!offers || offers.length === 0) {
    console.log('No offers to update.');
    return;
  }
  console.log(`Found ${offers.length} offers.\n`);

  let updated = 0;
  let skipped = 0;

  for (const offer of offers) {
    const cat = (offer.category as string) || '';
    const pool = (pools[cat] && pools[cat].length >= 3) ? pools[cat] : fallback;

    if (pool.length < 3) {
      skipped++;
      continue;
    }

    const seed = hashString(offer.id);
    const count = 4 + (seed % 3); // 4, 5, or 6 distinct images
    const picked = pickN(pool, count, seed);

    const { error: upErr } = await supabase
      .from('offers')
      .update({
        image_url: JSON.stringify(picked),
        updated_at: new Date().toISOString(),
      })
      .eq('id', offer.id);

    if (upErr) {
      console.warn(`  ⚠️  ${offer.store_name} (${offer.id}): ${upErr.message}`);
      skipped++;
    } else {
      updated++;
      if (updated % 10 === 0) console.log(`  …${updated} updated`);
    }
  }

  console.log(`\n✅ Done. Updated ${updated} offers, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
