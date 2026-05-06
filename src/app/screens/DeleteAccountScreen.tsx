import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle, Mail, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { toast } from 'sonner';

const SUPPORT_EMAIL = 'contact@troqly.be';
const DELETE_ENDPOINT =
  'https://rylxeslhdpyewtfexzll.supabase.co/functions/v1/delete-account';

export function DeleteAccountScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user, deleteAccount, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const confirmWord = t('delete_account.type_to_confirm_word');

  const isConfirmed = () =>
    confirm.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleDeleteCurrentUser = async () => {
    if (!isConfirmed()) {
      setError(t('delete_account.must_type_word'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await deleteAccount();
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('delete_account.deletion_failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAndDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed()) {
      setError(t('delete_account.must_type_word'));
      return;
    }
    if (!email || !password) {
      setError(t('delete_account.credentials_required'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.session) {
        throw new Error(signInError?.message || t('delete_account.invalid_credentials'));
      }
      const response = await fetch(DELETE_ENDPOINT, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || t('delete_account.deletion_failed'));
      }
      await supabase.auth.signOut().catch(() => undefined);
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('delete_account.deletion_failed');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-5 md:px-8 py-10">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <CheckCircle2 size={56} className="mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {t('delete_account.success_title')}
            </h1>
            <p className="text-gray-600 mb-6">{t('delete_account.success_message')}</p>
            <Button onClick={() => navigate('/welcome')} className="w-full">
              {t('delete_account.back_home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <Logo />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 md:px-8 py-6 space-y-6">
        <LanguageSwitcher variant="inline" />

        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {t('delete_account.title')}
          </h1>
          <p className="text-gray-600">{t('delete_account.intro')}</p>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t('delete_account.deleted_data_title')}
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
            <li>{t('delete_account.deleted_data_1')}</li>
            <li>{t('delete_account.deleted_data_2')}</li>
            <li>{t('delete_account.deleted_data_3')}</li>
            <li>{t('delete_account.deleted_data_4')}</li>
            <li>{t('delete_account.deleted_data_5')}</li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            {t('delete_account.retention')}
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t('delete_account.in_app_title')}
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal pl-5">
            <li><Trans i18nKey="delete_account.in_app_step_1" /></li>
            <li><Trans i18nKey="delete_account.in_app_step_2" /></li>
            <li><Trans i18nKey="delete_account.in_app_step_3" components={{ strong: <strong /> }} /></li>
            <li><Trans i18nKey="delete_account.in_app_step_4" components={{ strong: <strong /> }} /></li>
            <li><Trans i18nKey="delete_account.in_app_step_5" /></li>
          </ol>
        </section>

        <section className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={22} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('delete_account.web_title')}
              </h2>
              <p className="text-sm text-gray-600">
                {isAuthenticated
                  ? t('delete_account.signed_in_as', { email: user?.email })
                  : t('delete_account.signed_out_intro')}
              </p>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-900">
                {t('delete_account.type_to_confirm')}
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={confirmWord}
                  autoComplete="off"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => logout()}
                  className="flex-1"
                  disabled={loading}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleDeleteCurrentUser}
                  className="flex-1 !bg-red-600 hover:!bg-red-700"
                  disabled={loading}
                >
                  <Trash2 size={18} className="mr-1" />
                  {loading ? t('delete_account.deleting') : t('delete_account.delete_permanent')}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignInAndDelete} className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                {t('auth.email_label')}
                <div className="relative mt-1">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={t('auth.email_placeholder')}
                    autoComplete="email"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-900">
                {t('auth.password_label')}
                <div className="relative mt-1">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder={t('auth.password_placeholder')}
                    autoComplete="current-password"
                  />
                </div>
              </label>
              <label className="block text-sm font-medium text-gray-900">
                {t('delete_account.type_to_confirm')}
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={confirmWord}
                  autoComplete="off"
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full !bg-red-600 hover:!bg-red-700"
                disabled={loading}
              >
                <Trash2 size={18} className="mr-1" />
                {loading ? t('delete_account.deleting') : t('delete_account.sign_in_and_delete')}
              </Button>
            </form>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {t('delete_account.cant_sign_in_title')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            {t('delete_account.cant_sign_in_body')}
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Troqly%20account%20deletion`}
            className="inline-flex items-center gap-2 text-red-600 font-medium hover:underline"
          >
            <Mail size={18} />
            {SUPPORT_EMAIL}
          </a>
        </section>

        <p className="text-xs text-gray-500 text-center pt-4">
          {t('delete_account.footer')}
        </p>
      </div>
    </div>
  );
}
