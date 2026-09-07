'use client';

import { useEffect, useState } from 'react';
import { FaUserFriends, FaPlus } from 'react-icons/fa';
import { Card, Button, Input, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { useClientLang } from '@/lib/useClientLang';

type ReferralProfile = {
  _id: string;
  userId: string;
  code: string;
  active: boolean;
  invitesCount: number;
  successfulInvites: number;
  totalRewardsGiven: number;
  user?: {
    id: string;
    username: string;
    email: string;
    balance: number;
  } | null;
};

export default function AdminReferralsPage() {
  const lang = useClientLang();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [profiles, setProfiles] = useState<ReferralProfile[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [referralDiscountPercent, setReferralDiscountPercent] = useState('5');
  const [referralWebhook, setReferralWebhook] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      const list = Array.isArray((data as any)?.profiles) ? (data as any).profiles : [];
      setProfiles(list as ReferralProfile[]);
      setReferralDiscountPercent(String((data as any)?.referralDiscountPercent ?? 5));
      setReferralWebhook(String((data as any)?.referralWebhook || (data as any)?.shop_referral_discord_webhook || ''));
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '加载推荐失败' : 'Error loading referrals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const createForUser = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: userQuery.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      toast.success(lang === 'es' ? 'Perfil de referido listo' : 'Referral profile ready');
      setUserQuery('');
      fetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '创建推荐失败' : 'Error creating referral'));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (profile: ReferralProfile) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile._id, active: !profile.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      fetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '更新推荐失败' : 'Error updating referral'));
    }
  };

  const saveReferralDiscount = async () => {
    setSavingDiscount(true);
    try {
      const value = Math.max(0, Math.min(100, Number(referralDiscountPercent || 0)));
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralDiscountPercent: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      setReferralDiscountPercent(String((data as any)?.referralDiscountPercent ?? value));
      toast.success(lang === 'es' ? 'Descuento de referidos actualizado' : 'Referral discount updated');
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '更新推荐折扣失败' : 'Error updating referral discount'));
    } finally {
      setSavingDiscount(false);
    }
  };

  const saveReferralWebhook = async () => {
    setSavingWebhook(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_referral_discord_webhook: referralWebhook.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      setReferralWebhook(String(referralWebhook || '').trim());
      toast.success(lang === 'es' ? 'Webhook de referidos guardado' : 'Referral webhook saved');
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '保存推荐 webhook 失败' : 'Error saving referral webhook'));
    } finally {
      setSavingWebhook(false);
    }
  };

  const testReferralWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch('/api/admin/referrals/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      toast.success(lang === 'es' ? 'Webhook de prueba enviado' : 'Referral test webhook sent');
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? '发送测试 webhook 失败' : 'Error sending referral test webhook'));
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <FaUserFriends />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Referidos' : 'Referrals'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es' ? '管理个人邀请码和奖励。' : 'Manage personal invite codes and rewards.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder={lang === 'es' ? '用户 ID / 邮箱 / 用户名' : 'User ID / email / username'}
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <Button type="button" onClick={createForUser} disabled={creating || !userQuery.trim()}>
            <FaPlus />
            <span>{creating ? (lang === 'es' ? '创建中...' : 'Creating...') : (lang === 'es' ? 'Crear/Asegurar perfil' : 'Create/Ensure profile')}</span>
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {lang === 'es' ? 'Porcentaje de descuento por referido' : 'Referral discount percentage'}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="number"
              min="0"
              max="100"
              value={referralDiscountPercent}
              onChange={(e) => setReferralDiscountPercent(e.target.value)}
              placeholder="5"
            />
            <Button type="button" onClick={saveReferralDiscount} disabled={savingDiscount}>
              <span>{savingDiscount ? (lang === 'es' ? '保存中...' : 'Saving...') : (lang === 'es' ? '保存 %' : 'Save %')}</span>
            </Button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {lang === 'es'
              ? '该折扣自动适用于使用有效推荐码注册的用户。'
              : 'This discount is applied automatically to users who signed up with a valid referral code.'}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {lang === 'es' ? 'Webhook de recompensas por referido (Discord)' : 'Referral reward webhook (Discord)'}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="text"
              value={referralWebhook}
              onChange={(e) => setReferralWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <Button type="button" variant="secondary" onClick={testReferralWebhook} disabled={testingWebhook || !referralWebhook.trim()}>
              <span>{testingWebhook ? (lang === 'es' ? '正在发送测试...' : 'Sending test...') : (lang === 'es' ? '发送测试' : 'Send test')}</span>
            </Button>
            <Button type="button" onClick={saveReferralWebhook} disabled={savingWebhook}>
              <span>{savingWebhook ? (lang === 'es' ? '保存中...' : 'Saving...') : (lang === 'es' ? '保存 webhook' : 'Save webhook')}</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? '加载中...' : 'Loading...'}</div>
        ) : profiles.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? '还没有推荐记录。' : 'No referrals yet.'}</div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p._id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{p.code}</div>
                    <Badge variant={p.active ? 'success' : 'default'}>{p.active ? (lang === 'es' ? 'ACTIVO' : 'ACTIVE') : 'OFF'}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {p.user?.username || p.user?.email || p.userId} | {lang === 'es' ? 'Invitaciones' : 'Invites'}: {p.successfulInvites} | {lang === 'es' ? 'Recompensas' : 'Rewards'}: {Number(p.totalRewardsGiven || 0).toFixed(2)}
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={() => toggleActive(p)}>
                  <span>{p.active ? (lang === 'es' ? 'Desactivar' : 'Disable') : (lang === 'es' ? 'Activar' : 'Enable')}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
