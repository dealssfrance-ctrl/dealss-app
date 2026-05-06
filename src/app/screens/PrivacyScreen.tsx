import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const SUPPORT_EMAIL = 'contact@troqly.be';
const LAST_UPDATED = '6 mai 2026';

export function PrivacyScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1"
              aria-label="Retour"
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <Logo />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 space-y-6 text-gray-800">
        <LanguageSwitcher variant="inline" />
        <header>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Politique de confidentialité
          </h1>
          <p className="text-sm text-gray-500">
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </header>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
          <p>
            Troqly (« nous », « notre ») est une application mobile et web
            d'échange et de troc entre particuliers et commerçants. Cette
            politique explique quelles données personnelles nous collectons,
            pourquoi, comment nous les utilisons, et quels sont vos droits.
          </p>
          <p>
            Responsable du traitement : <strong>Troqly</strong> — contact :{' '}
            <a className="text-[#1FA774] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            2. Données que nous collectons
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Compte</strong> : email, mot de passe (haché), nom
              d'utilisateur, photo de profil (optionnelle).
            </li>
            <li>
              <strong>Profil commerçant</strong> (si applicable) : nom du
              magasin, adresse / localisation du magasin.
            </li>
            <li>
              <strong>Annonces</strong> : titre, description, photos,
              catégorie, prix ou type de troc.
            </li>
            <li>
              <strong>Messagerie</strong> : contenu des messages échangés avec
              d'autres utilisateurs.
            </li>
            <li>
              <strong>Avis</strong> : notes et commentaires laissés ou reçus.
            </li>
            <li>
              <strong>Données techniques</strong> : adresse IP, type
              d'appareil, journaux d'authentification, données de présence en
              ligne.
            </li>
          </ul>
          <p>
            Nous ne collectons pas votre position GPS précise sans votre
            accord explicite. L'application n'utilise pas de publicité tierce
            ni de pisteurs marketing.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            3. Pourquoi nous utilisons ces données
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Créer et gérer votre compte</li>
            <li>Publier vos annonces et permettre aux autres de les voir</li>
            <li>Permettre la communication entre utilisateurs</li>
            <li>Modérer et prévenir la fraude / les abus</li>
            <li>Vous envoyer des notifications liées à votre compte</li>
            <li>Respecter nos obligations légales</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            4. Partage des données
          </h2>
          <p>
            Nous ne vendons pas vos données. Vos données sont hébergées chez
            nos sous-traitants techniques :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> (base de données, authentification,
              stockage des images) — serveurs situés en Union européenne.
            </li>
          </ul>
          <p>
            Les informations publiques d'une annonce (titre, description,
            photos, nom d'utilisateur du vendeur, avis) sont visibles par les
            autres utilisateurs de Troqly.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            5. Conservation
          </h2>
          <p>
            Vos données de compte sont conservées tant que votre compte est
            actif. Lorsque vous supprimez votre compte, toutes vos données
            (profil, annonces, messages, avis) sont effacées immédiatement.
            Des copies de sauvegarde techniques peuvent être conservées
            jusqu'à 30 jours avant suppression complète.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            6. Vos droits (RGPD)
          </h2>
          <p>
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>
              Droit à l'effacement (« droit à l'oubli ») — voir notre{' '}
              <a className="text-[#1FA774] hover:underline" href="/delete-account">
                page de suppression de compte
              </a>
            </li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition et de limitation du traitement</li>
            <li>
              Droit d'introduire une réclamation auprès de l'autorité de
              protection des données (en Belgique : APD —{' '}
              <a
                className="text-[#1FA774] hover:underline"
                href="https://www.autoriteprotectiondonnees.be/"
                target="_blank"
                rel="noopener noreferrer"
              >
                autoriteprotectiondonnees.be
              </a>
              )
            </li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à{' '}
            <a className="text-[#1FA774] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            7. Sécurité
          </h2>
          <p>
            Les mots de passe sont stockés sous forme hachée. Les
            communications entre l'application et nos serveurs sont chiffrées
            (HTTPS / TLS). Nous mettons en œuvre des mesures techniques et
            organisationnelles raisonnables pour protéger vos données.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            8. Mineurs
          </h2>
          <p>
            Troqly n'est pas destiné aux enfants de moins de 13 ans. Si vous
            avez moins de 16 ans, vous devez obtenir le consentement de votre
            représentant légal pour utiliser l'application.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            9. Modifications
          </h2>
          <p>
            Nous pouvons mettre à jour cette politique. La date de dernière
            mise à jour figure en haut de cette page. Les changements
            importants vous seront notifiés dans l'application ou par email.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            10. Contact
          </h2>
          <p>
            Pour toute question concernant cette politique ou vos données :{' '}
            <a className="text-[#1FA774] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>

        <p className="text-xs text-gray-500 text-center pt-4">
          Troqly — Application d'échange et de troc.
        </p>
      </div>
    </div>
  );
}
