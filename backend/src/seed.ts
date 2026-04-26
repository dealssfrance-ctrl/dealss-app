#!/usr/bin/env node
/**
 * Dealss – Database Seed Script
 *
 * Usage (from /backend):
 *   pnpm seed            → safe mode: aborts if seed data already exists
 *   pnpm seed --force    → deletes ALL data and re-seeds unconditionally
 *   pnpm seed --dry-run  → validates seed data without writing to the DB
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Supabase client (service role bypasses RLS) ───────────────────────────────

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Category constants ────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['Mode', 'Fashion', 'Beauté', 'Voyage', 'Sport'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

/** Throws at seed-build time if a category string is not in the allowed list. */
function cat(value: string): Category {
  if (!(VALID_CATEGORIES as readonly string[]).includes(value)) {
    throw new Error(`Invalid category "${value}". Allowed: ${VALID_CATEGORIES.join(', ')}`);
  }
  return value as Category;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns an ISO timestamp N days before today, with a random hour offset. */
function daysAgo(n: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

// ── Seed users ────────────────────────────────────────────────────────────────
// password is empty string: these users are managed via Supabase Auth.
// Create matching Auth accounts manually or via Supabase dashboard if login is needed.

const SEED_USERS = [
  {
    id: 'seed_usr_1',
    email: 'sophie.martin@dealss.fr',
    password: '',
    name: 'Sophie Martin',
    created_at: daysAgo(90),
    updated_at: daysAgo(90),
  },
  {
    id: 'seed_usr_2',
    email: 'thomas.dubois@dealss.fr',
    password: '',
    name: 'Thomas Dubois',
    created_at: daysAgo(75),
    updated_at: daysAgo(75),
  },
  {
    id: 'seed_usr_3',
    email: 'amelie.rousseau@dealss.fr',
    password: '',
    name: 'Amélie Rousseau',
    created_at: daysAgo(60),
    updated_at: daysAgo(60),
  },
  {
    id: 'seed_usr_4',
    email: 'lucas.bernard@dealss.fr',
    password: '',
    name: 'Lucas Bernard',
    created_at: daysAgo(45),
    updated_at: daysAgo(45),
  },
] as const;

type UserId = (typeof SEED_USERS)[number]['id'];

// ── Seed offers ───────────────────────────────────────────────────────────────
// Images: picsum.photos/seed/{slug}/400/300 — deterministic, always available.

interface SeedOffer {
  id: string;
  store_name: string;
  discount: string;
  description: string;
  category: Category;
  image_url: string;
  status: 'active' | 'inactive' | 'pending';
  user_id: UserId;
  user_name: string;
  created_at: string;
  updated_at: string;
}

function img(slug: string): string {
  return `https://picsum.photos/seed/${slug}/400/300`;
}

const SEED_OFFERS: SeedOffer[] = [
  // ── MODE (collective / haute couture / saisonnière) ─────────────────────────
  {
    id: 'seed_mode_1',
    store_name: 'Zara',
    discount: '20%',
    description: 'Nouvelle collection automne-hiver 2026 : manteaux oversized, robes en velours et ensembles tailoring. Les tendances du défilé accessibles en avant-première pour les collaborateurs.',
    category: cat('Mode'),
    image_url: img('mode-zara-aw26'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(80, 9),
    updated_at: daysAgo(80, 9),
  },
  {
    id: 'seed_mode_2',
    store_name: 'H&M',
    discount: '30%',
    description: 'Soldes mi-saison sur l\'ensemble du prêt-à-porter : robes de transition, blazers structurés et pulls cachemire. Stock limité, profitez-en avant la rupture.',
    category: cat('Mode'),
    image_url: img('mode-hm-soldes'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(72, 14),
    updated_at: daysAgo(72, 14),
  },
  {
    id: 'seed_mode_3',
    store_name: 'Mango',
    discount: '25%',
    description: 'Collection Tendances Hiver : trench-coats en laine mélangée, pantalons larges et chemisiers satinés. Inspiré des derniers défilés parisiens, disponible en boutique et en ligne.',
    category: cat('Mode'),
    image_url: img('mode-mango-winter'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(65, 11),
    updated_at: daysAgo(65, 11),
  },
  {
    id: 'seed_mode_4',
    store_name: "Ba&sh",
    discount: '15%',
    description: 'Style parisien féminin et décontracté : robes midi, tops à smocks et vestes en tweed. La marque incontournable du vestiaire français à prix réduit pour les employés.',
    category: cat('Mode'),
    image_url: img('mode-bash-paris'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(58, 10),
    updated_at: daysAgo(58, 10),
  },
  {
    id: 'seed_mode_5',
    store_name: 'Sandro',
    discount: '20%',
    description: 'Manteaux et vestes de créateur : duffle-coats en laine bouillie, perfecto en cuir véritable et blazers croisés. Finitions haut de gamme à tarif préférentiel.',
    category: cat('Mode'),
    image_url: img('mode-sandro-coats'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(50, 16),
    updated_at: daysAgo(50, 16),
  },
  {
    id: 'seed_mode_6',
    store_name: 'The Kooples',
    discount: '35%',
    description: 'Fin de collection printemps-été : combinaisons, robes à imprimés et vestes en cuir rock-chic. La griffe parisienne au style affirmé soldée jusqu\'à -35%.',
    category: cat('Mode'),
    image_url: img('mode-kooples-rock'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(42, 8),
    updated_at: daysAgo(42, 8),
  },
  {
    id: 'seed_mode_7',
    store_name: 'Claudie Pierlot',
    discount: '20%',
    description: 'Nouvelle ligne printemps : robes à fleurs, tops en soie et pantalons à pince. Des pièces intemporelles dans l\'esprit de la femme parisienne moderne.',
    category: cat('Mode'),
    image_url: img('mode-claudie-spring'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(35, 13),
    updated_at: daysAgo(35, 13),
  },
  {
    id: 'seed_mode_8',
    store_name: 'Comptoir des Cotonniers',
    discount: '25%',
    description: 'Essentiels premium de la garde-robe : chemises en coton pima, pantalons évasés et pulls en mérinos. Coupe précise, matières nobles, prix employé exceptionnel.',
    category: cat('Mode'),
    image_url: img('mode-comptoir-essentials'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(28, 10),
    updated_at: daysAgo(28, 10),
  },

  // ── FASHION (individuel / expérimental / avant-garde) ───────────────────────
  {
    id: 'seed_fashion_1',
    store_name: 'Balenciaga',
    discount: '20%',
    description: 'Speed Trainer & Triple S : les sneakers qui ont redéfini le streetwear de luxe. Coloris exclusifs de la saison disponibles avec remise employé — quantités très limitées.',
    category: cat('Fashion'),
    image_url: img('fashion-balenciaga-speed'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(78, 9),
    updated_at: daysAgo(78, 9),
  },
  {
    id: 'seed_fashion_2',
    store_name: 'Off-White',
    discount: '25%',
    description: 'Collection Industrial Belt & Arrows : hoodies, tee-shirts et accessoires emblématiques de Virgil Abloh. Pièces de référence pour les passionnés de fashion culture.',
    category: cat('Fashion'),
    image_url: img('fashion-offwhite-arrows'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(70, 15),
    updated_at: daysAgo(70, 15),
  },
  {
    id: 'seed_fashion_3',
    store_name: 'Jacquemus',
    discount: '20%',
    description: 'Le Chiquito & Le Bambino : les it-bags provençaux qui font l\'unanimité sur les réseaux. Collection Soleil disponible en édition limitée avec tarif préférentiel collaborateurs.',
    category: cat('Fashion'),
    image_url: img('fashion-jacquemus-chiquito'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(63, 11),
    updated_at: daysAgo(63, 11),
  },
  {
    id: 'seed_fashion_4',
    store_name: 'Ami Paris',
    discount: '15%',
    description: 'Collection Cœur : pulls, chemises et accessoires ornés du logo cœur signature d\'Alexandre Mattiussi. Mode parisienne douce et affirmée, portée par toute une génération.',
    category: cat('Fashion'),
    image_url: img('fashion-ami-coeur'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(55, 14),
    updated_at: daysAgo(55, 14),
  },
  {
    id: 'seed_fashion_5',
    store_name: 'Coperni',
    discount: '30%',
    description: 'Swipe Bag & Cyber Bag : les sacs devenus objets de désir après le défilé spray-paint. Maroquinerie tech-couture à la croisée du digital et du luxe — pièces collector.',
    category: cat('Fashion'),
    image_url: img('fashion-coperni-swipe'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(48, 10),
    updated_at: daysAgo(48, 10),
  },
  {
    id: 'seed_fashion_6',
    store_name: 'Marine Serre',
    discount: '25%',
    description: 'Série Moon Print : body et robes à l\'imprimé lune caractéristique de la créatrice. Mode circulaire et avant-gardiste, reconnue parmi les plus innovantes de sa génération.',
    category: cat('Fashion'),
    image_url: img('fashion-marineserre-moon'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(40, 12),
    updated_at: daysAgo(40, 12),
  },
  {
    id: 'seed_fashion_7',
    store_name: 'Casablanca',
    discount: '20%',
    description: 'Silk Varsity & Tennis Club : pièces en soie imprimée inspirées de la dolce vita des années 70. La marque la plus colorée et narrative du moment, portée par les icônes du rap et du sport.',
    category: cat('Fashion'),
    image_url: img('fashion-casablanca-silk'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(32, 9),
    updated_at: daysAgo(32, 9),
  },
  {
    id: 'seed_fashion_8',
    store_name: 'Sporty & Rich',
    discount: '30%',
    description: 'Collection 94 Country Club : sweats, tee-shirts et casquettes brodés au style sportswear preppy. Né sur Instagram, devenu référence mondiale du wellness aesthetics.',
    category: cat('Fashion'),
    image_url: img('fashion-sportyrich-94'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(25, 16),
    updated_at: daysAgo(25, 16),
  },

  // ── BEAUTÉ ──────────────────────────────────────────────────────────────────
  {
    id: 'seed_beaute_1',
    store_name: 'Sephora',
    discount: '20%',
    description: 'Palette Signature Yeux : 12 teintes sélectionnées par les makeup artists maison, du nude sophistiqué au smoky intense. Longue tenue 24h, idéale pour un maquillage quotidien ou de soirée.',
    category: cat('Beauté'),
    image_url: img('beaute-sephora-palette'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(76, 10),
    updated_at: daysAgo(76, 10),
  },
  {
    id: 'seed_beaute_2',
    store_name: "L'Occitane",
    discount: '30%',
    description: 'Coffrets Beurre de Karité : crème corps, sérum mains et gommage visage issus du karité bio du Burkina Faso. Formules ultra-riches certifiées naturelles, emblèmes de la marque depuis 40 ans.',
    category: cat('Beauté'),
    image_url: img('beaute-loccitane-karite'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(68, 13),
    updated_at: daysAgo(68, 13),
  },
  {
    id: 'seed_beaute_3',
    store_name: 'Clarins',
    discount: '25%',
    description: 'Double Sérum & Crème Multi-Intensive : la synergie anti-âge star de la marque, enrichie en 21 extraits de plantes. Visible sur la densité et l\'éclat dès 7 jours d\'utilisation.',
    category: cat('Beauté'),
    image_url: img('beaute-clarins-serum'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(60, 11),
    updated_at: daysAgo(60, 11),
  },
  {
    id: 'seed_beaute_4',
    store_name: 'Nuxe',
    discount: '20%',
    description: 'Huile Prodigieuse Or : l\'huile multi-usages iconique enrichie de particules d\'or 24k. Corps, visage, cheveux et ongles — un seul produit pour un éclat lumineux toute la journée.',
    category: cat('Beauté'),
    image_url: img('beaute-nuxe-huile'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(52, 9),
    updated_at: daysAgo(52, 9),
  },
  {
    id: 'seed_beaute_5',
    store_name: 'Caudalie',
    discount: '15%',
    description: 'Vinoperfect Sérum Concentré Éclat : le sérum anti-taches numéro 1 en pharmacie, à base de viniférine. Efface les imperfections et unifie le teint pour une peau lumineuse.',
    category: cat('Beauté'),
    image_url: img('beaute-caudalie-vinoperfect'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(44, 15),
    updated_at: daysAgo(44, 15),
  },
  {
    id: 'seed_beaute_6',
    store_name: 'Lancôme',
    discount: '35%',
    description: 'Génifique Advanced Sérum : le sérum anti-âge best-seller boosté au microbiome, enrichi en bifidobactérie. Texture légère à absorption immédiate pour une peau repulpée et éclatante.',
    category: cat('Beauté'),
    image_url: img('beaute-lancome-genifique'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(37, 10),
    updated_at: daysAgo(37, 10),
  },
  {
    id: 'seed_beaute_7',
    store_name: 'Yves Rocher',
    discount: '25%',
    description: 'Collection Eaux de Parfum Botaniques : 6 nouvelles fragrances inspirées des jardins du monde, sans ingrédients controversés. Des parfums frais, longs en bouche et engagés pour la planète.',
    category: cat('Beauté'),
    image_url: img('beaute-yvesrocher-parfum'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(29, 11),
    updated_at: daysAgo(29, 11),
  },
  {
    id: 'seed_beaute_8',
    store_name: 'Sisley',
    discount: '20%',
    description: 'Gamme Phyto-Blanc : fluide solaire SPF50+, crème de nuit et concentré correcteur de taches. Soin de luxe à base de plantes blanches pour un teint porcelaine et protégé.',
    category: cat('Beauté'),
    image_url: img('beaute-sisley-phytoblanc'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(21, 14),
    updated_at: daysAgo(21, 14),
  },

  // ── VOYAGE ──────────────────────────────────────────────────────────────────
  {
    id: 'seed_voyage_1',
    store_name: 'Air France',
    discount: '25%',
    description: 'Vols Paris-New York et Paris-Montréal en classe Économique et Premium : tarifs négociés pour les salariés avec franchise bagages améliorée. Réservation jusqu\'au 31 mai 2026.',
    category: cat('Voyage'),
    image_url: img('voyage-airfrance-transatlantic'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(74, 8),
    updated_at: daysAgo(74, 8),
  },
  {
    id: 'seed_voyage_2',
    store_name: 'Club Med',
    discount: '30%',
    description: 'Séjours All-Inclusive en Méditerranée et Caraïbes : vols + hébergement + repas + activités inclus. Villages 4 et 5 tridents disponibles pour l\'été 2026, prix employé garanti.',
    category: cat('Voyage'),
    image_url: img('voyage-clubmed-allinclusive'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(66, 16),
    updated_at: daysAgo(66, 16),
  },
  {
    id: 'seed_voyage_3',
    store_name: 'Booking.com',
    discount: '20%',
    description: 'City breaks Europe : week-ends à Rome, Barcelone, Amsterdam et Prague. Hôtels 4★ avec petit-déjeuner inclus, annulation gratuite jusqu\'à 48h avant. Idéal pour les longs week-ends.',
    category: cat('Voyage'),
    image_url: img('voyage-booking-europe'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(58, 12),
    updated_at: daysAgo(58, 12),
  },
  {
    id: 'seed_voyage_4',
    store_name: 'Corsair',
    discount: '40%',
    description: 'Vols Paris-Antilles et Paris-Réunion : réductions exceptionnelles sur les vols directs vers la Guadeloupe, la Martinique et La Réunion. Tarifs valables pour les départs de juin à septembre 2026.',
    category: cat('Voyage'),
    image_url: img('voyage-corsair-antilles'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(51, 9),
    updated_at: daysAgo(51, 9),
  },
  {
    id: 'seed_voyage_5',
    store_name: 'Accor Hotels',
    discount: '20%',
    description: 'Suites et chambres Premium dans les hôtels parisiens du groupe : Sofitel, Pullman et MGallery. Petit-déjeuner offert pour les réservations de 2 nuits minimum.',
    category: cat('Voyage'),
    image_url: img('voyage-accor-paris-suite'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(43, 11),
    updated_at: daysAgo(43, 11),
  },
  {
    id: 'seed_voyage_6',
    store_name: 'Eurostar',
    discount: '30%',
    description: 'Paris-Londres aller-retour en Standard Premier : siège grand confort, repas inclus et accès salon Eurostar. Départs quotidiens depuis Paris Gare du Nord, trajet en 2h15.',
    category: cat('Voyage'),
    image_url: img('voyage-eurostar-london'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(36, 14),
    updated_at: daysAgo(36, 14),
  },
  {
    id: 'seed_voyage_7',
    store_name: 'TUI',
    discount: '25%',
    description: 'Forfaits Îles Canaries et Majorque : vol + hôtel 4★ tout inclus pour 7 nuits. Départs depuis Paris, Lyon et Marseille. Idéal pour recharger les batteries au soleil à petit prix.',
    category: cat('Voyage'),
    image_url: img('voyage-tui-canaries'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(28, 10),
    updated_at: daysAgo(28, 10),
  },
  {
    id: 'seed_voyage_8',
    store_name: 'FRAM',
    discount: '20%',
    description: 'Circuits Marrakech & Essaouira : 5 jours en riad de charme avec visites guidées, hammam traditionnel et dîner gastronomique inclus. Une immersion dans l\'art de vivre marocain.',
    category: cat('Voyage'),
    image_url: img('voyage-fram-marrakech'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(20, 9),
    updated_at: daysAgo(20, 9),
  },

  // ── SPORT ────────────────────────────────────────────────────────────────────
  {
    id: 'seed_sport_1',
    store_name: 'Nike',
    discount: '25%',
    description: 'Air Max DN & Air Max Plus : les dernières itérations de l\'Air Max avec unité d\'air visible 270°. Amorti exceptionnel pour le lifestyle et la course légère. Coloris exclusifs de saison.',
    category: cat('Sport'),
    image_url: img('sport-nike-airmax'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(82, 8),
    updated_at: daysAgo(82, 8),
  },
  {
    id: 'seed_sport_2',
    store_name: 'Adidas',
    discount: '30%',
    description: 'Ultraboost Light 24 & Solarglide ST : la référence mondiale en matière d\'amorti Boost pour la course sur route. Tige Primeknit adaptative et semelle Carbon-Infused pour les longues distances.',
    category: cat('Sport'),
    image_url: img('sport-adidas-ultraboost'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(74, 15),
    updated_at: daysAgo(74, 15),
  },
  {
    id: 'seed_sport_3',
    store_name: 'Decathlon',
    discount: '20%',
    description: 'Équipement trail complet : chaussures Evadict MT3, veste coupe-vent imperméable et sac d\'hydratation 12L. Tout le nécessaire pour s\'élancer sur les sentiers, de débutant à expert.',
    category: cat('Sport'),
    image_url: img('sport-decathlon-trail'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(67, 10),
    updated_at: daysAgo(67, 10),
  },
  {
    id: 'seed_sport_4',
    store_name: 'New Balance',
    discount: '25%',
    description: '990v6 & Fresh Foam X 1080 : les modèles cultes entièrement reconçus. Made in USA pour le 990, amorti Fresh Foam maximal pour le 1080. Des chaussures pour courir et pour vivre.',
    category: cat('Sport'),
    image_url: img('sport-newbalance-990'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(60, 12),
    updated_at: daysAgo(60, 12),
  },
  {
    id: 'seed_sport_5',
    store_name: 'Under Armour',
    discount: '30%',
    description: 'Gamme d\'entraînement RUSH & Threadborne : vêtements de compression avec tissu infusé de caféine pour optimiser la récupération musculaire. Collection complète homme et femme.',
    category: cat('Sport'),
    image_url: img('sport-underarmour-rush'),
    status: 'active',
    user_id: 'seed_usr_1',
    user_name: 'Sophie Martin',
    created_at: daysAgo(52, 9),
    updated_at: daysAgo(52, 9),
  },
  {
    id: 'seed_sport_6',
    store_name: 'Salomon',
    discount: '20%',
    description: 'Speedcross 6 GTX & XA Pro 3D : les chaussures trail-running Salomon avec membrane Gore-Tex imperméable. Grip Contagrip MD pour toutes conditions, de la forêt mouillée au sentier rocheux.',
    category: cat('Sport'),
    image_url: img('sport-salomon-speedcross'),
    status: 'active',
    user_id: 'seed_usr_2',
    user_name: 'Thomas Dubois',
    created_at: daysAgo(44, 11),
    updated_at: daysAgo(44, 11),
  },
  {
    id: 'seed_sport_7',
    store_name: 'Asics',
    discount: '15%',
    description: 'Gel-Nimbus 26 & Gel-Kayano 31 : les chaussures de running longue distance par excellence. Technologie FF BLAST+ Eco pour un amorti durable et un retour d\'énergie optimal sur route.',
    category: cat('Sport'),
    image_url: img('sport-asics-nimbus'),
    status: 'active',
    user_id: 'seed_usr_3',
    user_name: 'Amélie Rousseau',
    created_at: daysAgo(37, 14),
    updated_at: daysAgo(37, 14),
  },
  {
    id: 'seed_sport_8',
    store_name: 'Hoka',
    discount: '20%',
    description: 'Clifton 9 & Bondi 8 : les chaussures maximalistes qui ont révolutionné la course à pied. Amorti pleine longueur ultra-léger, drop bas et géométrie de semelle qui propulse naturellement.',
    category: cat('Sport'),
    image_url: img('sport-hoka-clifton'),
    status: 'active',
    user_id: 'seed_usr_4',
    user_name: 'Lucas Bernard',
    created_at: daysAgo(29, 8),
    updated_at: daysAgo(29, 8),
  },
];

// ── Seed reviews ──────────────────────────────────────────────────────────────
// Only for a representative subset of offers to simulate organic activity.

interface SeedReview {
  id: string;
  offer_id: string;
  user_id: UserId;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

const SEED_REVIEWS: SeedReview[] = [
  // Mode
  { id: 'seed_rev_1',  offer_id: 'seed_mode_1', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 5, comment: 'Manteau reçu en 48h, qualité top et la réduction est vraiment intéressante. Je recommande !', created_at: daysAgo(78, 14) },
  { id: 'seed_rev_2',  offer_id: 'seed_mode_1', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 4, comment: 'Belle collection, coupe parfaite. Livraison rapide.', created_at: daysAgo(77, 11) },
  { id: 'seed_rev_3',  offer_id: 'seed_mode_3', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 5, comment: 'Le trench est magnifique, exactement comme en photo. Taille fidèle.', created_at: daysAgo(63, 16) },
  { id: 'seed_rev_4',  offer_id: 'seed_mode_5', user_id: 'seed_usr_1', user_name: 'Sophie Martin',   rating: 4, comment: 'Très bon rapport qualité-prix pour un manteau Sandro. Coutures impeccables.', created_at: daysAgo(48, 9) },
  { id: 'seed_rev_5',  offer_id: 'seed_mode_6', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 3, comment: 'Bonne qualité mais les tailles sont petites, prendre une taille au-dessus.', created_at: daysAgo(40, 13) },
  // Fashion
  { id: 'seed_rev_6',  offer_id: 'seed_fashion_1', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 5, comment: 'Les Speed Trainer sont parfaits, super confortables et le coloris est incroyable.', created_at: daysAgo(76, 10) },
  { id: 'seed_rev_7',  offer_id: 'seed_fashion_1', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 4, comment: 'Très satisfait, authentifiées avec le certificat. Livraison soignée.', created_at: daysAgo(75, 15) },
  { id: 'seed_rev_8',  offer_id: 'seed_fashion_3', user_id: 'seed_usr_1', user_name: 'Sophie Martin',   rating: 5, comment: 'Le Chiquito est encore plus beau en vrai qu\'en photo. La pochette dorée est un bijou.', created_at: daysAgo(61, 11) },
  { id: 'seed_rev_9',  offer_id: 'seed_fashion_5', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 5, comment: 'Le Swipe Bag est une pièce d\'art. Très fière de cet achat, c\'est ma pièce préférée de la saison.', created_at: daysAgo(46, 14) },
  { id: 'seed_rev_10', offer_id: 'seed_fashion_7', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 4, comment: 'La soie est d\'une qualité exceptionnelle. Parfait pour une tenue de soirée originale.', created_at: daysAgo(30, 9) },
  // Beauté
  { id: 'seed_rev_11', offer_id: 'seed_beaute_2', user_id: 'seed_usr_1', user_name: 'Sophie Martin',   rating: 5, comment: 'Le coffret Karité est mon incontournable depuis 3 ans. La qualité et le parfum sont sublimes.', created_at: daysAgo(66, 10) },
  { id: 'seed_rev_12', offer_id: 'seed_beaute_3', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 4, comment: 'Le Double Sérum Clarins est vraiment efficace. Visible sur l\'éclat du teint en moins d\'une semaine.', created_at: daysAgo(58, 13) },
  { id: 'seed_rev_13', offer_id: 'seed_beaute_6', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 5, comment: 'Le Génifique est mon sérum anti-âge numéro 1. Ma peau est transformée, j\'en suis accro !', created_at: daysAgo(35, 11) },
  { id: 'seed_rev_14', offer_id: 'seed_beaute_7', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 3, comment: 'Fragrances agréables mais tenue en bouche courte. Bien pour un usage quotidien léger.', created_at: daysAgo(27, 15) },
  // Voyage
  { id: 'seed_rev_15', offer_id: 'seed_voyage_1', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 5, comment: 'Voyage New York en Premium Economy vraiment confortable. Service impeccable et ponctualité parfaite.', created_at: daysAgo(72, 8) },
  { id: 'seed_rev_16', offer_id: 'seed_voyage_2', user_id: 'seed_usr_1', user_name: 'Sophie Martin',   rating: 5, comment: 'Club Med Marrakech : paradisiaque. Tout est inclus, animations excellentes et cuisine raffinée. À refaire !', created_at: daysAgo(64, 16) },
  { id: 'seed_rev_17', offer_id: 'seed_voyage_4', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 5, comment: 'La Réunion est un rêve. Vol Corsair très correct et le prix était imbattable. Bravo pour ce bon plan !', created_at: daysAgo(49, 12) },
  { id: 'seed_rev_18', offer_id: 'seed_voyage_6', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 4, comment: 'Eurostar Standard Premier très agréable. Repas de qualité et le salon Gare du Nord est bien équipé.', created_at: daysAgo(34, 10) },
  // Sport
  { id: 'seed_rev_19', offer_id: 'seed_sport_1', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 5, comment: 'Les Air Max DN sont incroyablement confortables dès le premier port. Le coloris violet est saisissant.', created_at: daysAgo(80, 14) },
  { id: 'seed_rev_20', offer_id: 'seed_sport_2', user_id: 'seed_usr_3', user_name: 'Amélie Rousseau', rating: 5, comment: 'Les Ultraboost Light 24 pour mon semi-marathon : parfaites ! Légèreté et amorti au top du top.', created_at: daysAgo(72, 9) },
  { id: 'seed_rev_21', offer_id: 'seed_sport_3', user_id: 'seed_usr_1', user_name: 'Sophie Martin',   rating: 4, comment: 'Le pack trail Decathlon est excellent pour le rapport qualité-prix. Idéal pour débuter sur les sentiers.', created_at: daysAgo(65, 11) },
  { id: 'seed_rev_22', offer_id: 'seed_sport_6', user_id: 'seed_usr_2', user_name: 'Thomas Dubois',   rating: 5, comment: 'Speedcross 6 GTX sur terrain boueux : grip exceptionnel. La membrane Gore-Tex tient vraiment ses promesses.', created_at: daysAgo(42, 15) },
  { id: 'seed_rev_23', offer_id: 'seed_sport_8', user_id: 'seed_usr_4', user_name: 'Lucas Bernard',   rating: 5, comment: 'Hoka Clifton 9 : enfin des chaussures qui ne fatiguent pas mes genoux sur longue distance. Révolutionnaire.', created_at: daysAgo(27, 10) },
];

// ── Seed traffic data ─────────────────────────────────────────────────────────
// 60 days of realistic daily traffic with weekday peaks and a gentle growth trend.

interface SeedTraffic {
  id: string;
  date: string;
  visits: number;
  page_views: number;
  unique_users: number;
  bounce_rate: number;
  avg_session_duration: number;
}

function generateTraffic(): SeedTraffic[] {
  const rows: SeedTraffic[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 60; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay(); // 0=Sun, 6=Sat

    const isWeekend = dow === 0 || dow === 6;
    const growthFactor = 1 + (60 - i) * 0.008; // ~48% growth over 60 days
    const base = isWeekend ? 220 : 420;
    const noise = () => (Math.random() - 0.5) * 80;

    const visits = Math.round((base + noise()) * growthFactor);
    const page_views = Math.round(visits * (2.2 + Math.random() * 0.8));
    const unique_users = Math.round(visits * (0.62 + Math.random() * 0.12));
    const bounce_rate = Math.round((28 + Math.random() * 18) * 10) / 10;
    const avg_session_duration = Math.round(180 + Math.random() * 240);

    const dateStr = d.toISOString().slice(0, 10);
    rows.push({
      id: `seed_traffic_${dateStr}`,
      date: dateStr,
      visits,
      page_views,
      unique_users,
      bounce_rate,
      avg_session_duration,
    });
  }
  return rows;
}

const SEED_TRAFFIC = generateTraffic();

// ── Validation ────────────────────────────────────────────────────────────────

function validateSeedData(): void {
  console.log('Validating seed data...');
  const errors: string[] = [];

  const userIds = new Set(SEED_USERS.map(u => u.id));
  const offerIds = new Set<string>();

  // Users
  const userEmails = new Set<string>();
  for (const u of SEED_USERS) {
    if (!u.id || !u.email || !u.name) errors.push(`User ${u.id}: missing required field`);
    if (userEmails.has(u.email)) errors.push(`Duplicate email: ${u.email}`);
    userEmails.add(u.email);
  }

  // Offers
  const offerIdsArr: string[] = [];
  for (const o of SEED_OFFERS) {
    if (!o.id || !o.store_name || !o.discount || !o.description || !o.category || !o.image_url)
      errors.push(`Offer ${o.id}: missing required field`);
    if (!userIds.has(o.user_id)) errors.push(`Offer ${o.id}: unknown user_id "${o.user_id}"`);
    if (!(VALID_CATEGORIES as readonly string[]).includes(o.category))
      errors.push(`Offer ${o.id}: invalid category "${o.category}"`);
    offerIdsArr.push(o.id);
    offerIds.add(o.id);
  }
  const dupOffers = offerIdsArr.filter((id, i) => offerIdsArr.indexOf(id) !== i);
  if (dupOffers.length) errors.push(`Duplicate offer IDs: ${dupOffers.join(', ')}`);

  // Reviews
  const reviewIds: string[] = [];
  for (const r of SEED_REVIEWS) {
    if (!r.id || !r.offer_id || !r.user_id || !r.user_name || r.rating < 1 || r.rating > 5)
      errors.push(`Review ${r.id}: invalid data`);
    if (!offerIds.has(r.offer_id)) errors.push(`Review ${r.id}: unknown offer_id "${r.offer_id}"`);
    if (!userIds.has(r.user_id)) errors.push(`Review ${r.id}: unknown user_id "${r.user_id}"`);
    reviewIds.push(r.id);
  }
  const dupReviews = reviewIds.filter((id, i) => reviewIds.indexOf(id) !== i);
  if (dupReviews.length) errors.push(`Duplicate review IDs: ${dupReviews.join(', ')}`);

  if (errors.length > 0) {
    console.error('\n❌ Validation failed:\n');
    errors.forEach(e => console.error(`   • ${e}`));
    process.exit(1);
  }

  const categoryCounts = VALID_CATEGORIES.map(c => ({
    category: c,
    count: SEED_OFFERS.filter(o => o.category === c).length,
  }));
  console.log('\n✅ Validation passed');
  console.log(`   Users  : ${SEED_USERS.length}`);
  console.log(`   Offers : ${SEED_OFFERS.length}`);
  categoryCounts.forEach(({ category, count }) =>
    console.log(`     → ${category.padEnd(8)} : ${count} offers`)
  );
  console.log(`   Reviews: ${SEED_REVIEWS.length}`);
  console.log(`   Traffic: ${SEED_TRAFFIC.length} days\n`);
}

// ── Database operations ───────────────────────────────────────────────────────

async function deleteAll(supabase: SupabaseClient): Promise<void> {
  console.log('🗑  Deleting existing data...');
  // Delete in dependency order (children before parents).
  const steps: Array<{ table: string }> = [
    { table: 'reviews' },
    { table: 'messages' },
    { table: 'conversations' },
    { table: 'traffic_data' },
    { table: 'offers' },
    { table: 'users' },
  ];

  for (const { table } of steps) {
    const { error } = await supabase.from(table).delete().neq('id', '__never__');
    if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
    console.log(`   ✓ ${table} cleared`);
  }
}

async function insertUsers(supabase: SupabaseClient): Promise<void> {
  console.log('👤 Inserting users...');
  const { error } = await supabase.from('users').insert([...SEED_USERS]);
  if (error) throw new Error(`Failed to insert users: ${error.message}`);
  console.log(`   ✓ ${SEED_USERS.length} users inserted`);
}

async function insertOffers(supabase: SupabaseClient): Promise<void> {
  console.log('🏷  Inserting offers...');
  // Insert in batches of 20 to stay within PostgREST body limits.
  const batch = 20;
  for (let i = 0; i < SEED_OFFERS.length; i += batch) {
    const slice = SEED_OFFERS.slice(i, i + batch);
    const { error } = await supabase.from('offers').insert(slice);
    if (error) throw new Error(`Failed to insert offers (batch ${i}): ${error.message}`);
  }
  console.log(`   ✓ ${SEED_OFFERS.length} offers inserted`);
}

async function insertReviews(supabase: SupabaseClient): Promise<void> {
  console.log('⭐ Inserting reviews...');
  const { error } = await supabase.from('reviews').insert([...SEED_REVIEWS]);
  if (error) throw new Error(`Failed to insert reviews: ${error.message}`);
  console.log(`   ✓ ${SEED_REVIEWS.length} reviews inserted`);
}

async function insertTraffic(supabase: SupabaseClient): Promise<void> {
  console.log('📈 Inserting traffic data...');
  const { error } = await supabase.from('traffic_data').insert([...SEED_TRAFFIC]);
  if (error) throw new Error(`Failed to insert traffic data: ${error.message}`);
  console.log(`   ✓ ${SEED_TRAFFIC.length} days of traffic data inserted`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');

  console.log('\n════════════════════════════════════════════');
  console.log('  Dealss Database Seed Script');
  if (dryRun)  console.log('  Mode: DRY RUN (no DB writes)');
  else if (force) console.log('  Mode: FORCE (full reset + re-seed)');
  else          console.log('  Mode: SAFE (aborts if data exists)');
  console.log('════════════════════════════════════════════\n');

  // Always validate data structure first.
  validateSeedData();

  if (dryRun) {
    console.log('✅ Dry run complete — no data was written.\n');
    return;
  }

  const supabase = getClient();

  if (!force) {
    // Safe mode: check whether seed users already exist.
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', 'seed_usr_1')
      .maybeSingle();

    if (error) throw new Error(`Seed guard check failed: ${error.message}`);

    if (data) {
      console.log('⚠️  Seed data already exists (seed_usr_1 found).');
      console.log('   Run with --force to delete and re-seed.\n');
      process.exit(0);
    }
  }

  try {
    await deleteAll(supabase);
    console.log();
    await insertUsers(supabase);
    await insertOffers(supabase);
    await insertReviews(supabase);
    await insertTraffic(supabase);
    console.log('\n✅ Seed complete!\n');
  } catch (err) {
    console.error('\n❌ Seed failed:', (err as Error).message, '\n');
    process.exit(1);
  }
}

main();
