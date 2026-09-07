'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { FaEnvelope, FaSyncAlt, FaTrash, FaBan, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

type Subscriber = {
  _id: string;
  email: string;
  subscribedAt?: string;
  unsubscribedAt?: string | null;
  source?: string;
  createdAt?: string;
};

type SubscribersResponse = {
  items: Subscriber[];
  page: number;
  limit: number;
  total: number;
  totals?: { all: number; active: number; unsubscribed: number };
};

type SettingsObj = Record<string, string>;

export default function AdminNewsletterPage() {
  const lang = useClientLang();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SettingsObj>({});
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [totals, setTotals] = useState<{ all: number; active: number; unsubscribed: number }>({ all: 0, active: 0, unsubscribed: 0 });

  const [status, setStatus] = useState<'active' | 'unsubscribed' | 'all'>('active');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const autoEnabled = String(settings?.newsletter_auto_enabled ?? 'true').trim() !== 'false';
  const lastSent = String(settings?.newsletter_last_sent_at || '').trim();

  const [scheduleDow, setScheduleDow] = useState<number>(1);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchAll = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setRefreshing(true);
    try {
      const [settingsRes, subsRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch(`/api/admin/newsletter/subscribers?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`, {
          cache: 'no-store',
        }),
      ]);

      const settingsData = (await settingsRes.json().catch(() => ({}))) as SettingsObj;
      if (!settingsRes.ok) throw new Error(String((settingsData as any)?.error || t(lang, 'admin.settings.loadError')));
      setSettings(settingsData || {});

      const subsData = (await subsRes.json().catch(() => ({}))) as SubscribersResponse;
      if (!subsRes.ok) throw new Error(String((subsData as any)?.error || (lang === 'es' ? '加载订阅者失败' : 'Error loading subscribers')));
      setSubscribers(Array.isArray(subsData.items) ? subsData.items : []);
      if (subsData.totals) setTotals(subsData.totals);
    } catch (e: any) {
      toast.error(e?.message || (lang === 'es' ? '加载邮件订阅失败' : 'Error loading newsletter'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!Object.keys(settings || {}).length) return;
    const dow = Number(String(settings?.newsletter_schedule_dow ?? '1'));
    if (Number.isFinite(dow)) setScheduleDow(Math.max(0, Math.min(6, Math.trunc(dow))));
  }, [settings]);

  useEffect(() => {
    if (loading) return;
    fetchAll({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const filteredStats = useMemo(() => {
    const totalShown = subscribers.length;
    return { totalShown };
  }, [subscribers]);

  const toggleAuto = async () => {
    const nextValue = autoEnabled ? 'false' : 'true';
    setTogglingAuto(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsletter_auto_enabled: nextValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || (lang === 'es' ? '更新自动模式失败' : 'Error updating auto mode')));

      setSettings((prev) => ({ ...prev, newsletter_auto_enabled: nextValue }));
      toast.success(
        nextValue === 'true'
          ? (lang === 'es' ? '自动邮件已开启' : 'Auto newsletter enabled')
          : (lang === 'es' ? '自动邮件已关闭' : 'Auto newsletter disabled')
      );
    } catch (e: any) {
      toast.error(e?.message || (lang === 'es' ? '更新自动模式失败' : 'Error updating auto mode'));
    } finally {
      setTogglingAuto(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/admin/newsletter/send', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || (lang === 'es' ? '发送邮件订阅失败' : 'Error sending newsletter')));

      toast.success(
        lang === 'es'
          ? `Newsletter enviada (${String((data as any)?.sent ?? 0)} emails)`
          : `Newsletter sent (${String((data as any)?.sent ?? 0)} emails)`
      );
      await fetchAll({ silent: true });
    } catch (e: any) {
      toast.error(e?.message || (lang === 'es' ? '发送邮件订阅失败' : 'Error sending newsletter'));
    } finally {
      setSending(false);
    }
  };

  const saveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newsletter_schedule_dow: String(scheduleDow),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || (lang === 'es' ? '保存发送时间失败' : 'Error saving schedule')));

      setSettings((prev) => ({
        ...prev,
        newsletter_schedule_dow: String(scheduleDow),
      }));

      toast.success(lang === 'es' ? 'Horario guardado' : 'Schedule saved');
    } catch (e: any) {
      toast.error(e?.message || (lang === 'es' ? '保存发送时间失败' : 'Error saving schedule'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const updateSubscriber = async (id: string, action: 'unsubscribe' | 'resubscribe' | 'delete') => {
    setUpdatingRowId(id);
    try {
      const res = await fetch('/api/admin/newsletter/subscribers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));

      await fetchAll({ silent: true });
    } catch (e: any) {
      toast.error(e?.message || (lang === 'es' ? '更新订阅者失败' : 'Error updating subscriber'));
    } finally {
      setUpdatingRowId(null);
    }
  };

  const onSearch = async () => {
    setPage(1);
    await fetchAll({ silent: true });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0" hover={false}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Newsletter' : 'Newsletter'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'admin.settings.loading')}</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 shimmer" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <FaEnvelope />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white dark:bg-clip-text truncate">
              {lang === 'es' ? 'Newsletter' : 'Newsletter'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              {lang === 'es'
                ? '管理订阅者、开关每周自动发送、手动发送。'
                : 'Manage subscribers, toggle weekly auto-send, and send manually.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <div className="text-gray-900 dark:text-white font-semibold mb-2">{lang === 'es' ? 'Horario semanal' : 'Weekly schedule'}</div>
            <div className="text-xs text-gray-500">
              {lang === 'es'
                ? '只需选择星期几。Vercel Hobby 的定时任务每天运行 1 次，只会在所选日期发送。'
                : 'Pick only the day. On Vercel Hobby cron runs once per day and will only send on the selected day.'}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-2">{lang === 'es' ? '星期' : 'Weekday'}</div>
                <select
                  value={scheduleDow}
                  onChange={(e) => setScheduleDow(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-minecraft-diamond/60 focus:border-transparent transition-all duration-200 dark:bg-gray-950/30 dark:border-white/10 dark:text-gray-100"
                >
                  <option value={1}>{lang === 'es' ? 'Lunes' : 'Monday'}</option>
                  <option value={2}>{lang === 'es' ? 'Martes' : 'Tuesday'}</option>
                  <option value={3}>{lang === 'es' ? '星期三' : 'Wednesday'}</option>
                  <option value={4}>{lang === 'es' ? 'Jueves' : 'Thursday'}</option>
                  <option value={5}>{lang === 'es' ? 'Viernes' : 'Friday'}</option>
                  <option value={6}>{lang === 'es' ? '星期六' : 'Saturday'}</option>
                  <option value={0}>{lang === 'es' ? 'Domingo' : 'Sunday'}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={saveSchedule} disabled={savingSchedule}>
              {savingSchedule ? (lang === 'es' ? '保存中…' : 'Saving…') : (lang === 'es' ? '保存发送时间' : 'Save schedule')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-gray-900 dark:text-white font-semibold mb-2">{lang === 'es' ? '状态' : 'Status'}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={autoEnabled ? 'success' : 'warning'}>
                {autoEnabled ? (lang === 'es' ? 'AUTO: ON' : 'AUTO: ON') : (lang === 'es' ? 'AUTO: OFF' : 'AUTO: OFF')}
              </Badge>
              <div className="text-xs text-gray-500">
                {lang === 'es' ? '开启自动模式后，Vercel Cron 将每周自动发送。' : 'Enable auto for Vercel Cron to send weekly.'}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {lastSent ? (lang === 'es' ? `上次发送：${lastSent}` : `上次发送：${lastSent}`) : (lang === 'es' ? '上次发送：—' : 'Last sent: —')}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs text-gray-500">{lang === 'es' ? 'Activos' : 'Active'}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{totals.active}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs text-gray-500">{lang === 'es' ? 'Bajas' : 'Unsubscribed'}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{totals.unsubscribed}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs text-gray-500">{lang === 'es' ? 'Total' : 'Total'}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{totals.all}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Button type="button" variant="secondary" onClick={() => fetchAll()} disabled={refreshing}>
              <FaSyncAlt />
              <span>{refreshing ? (lang === 'es' ? '刷新中…' : 'Refreshing…') : (lang === 'es' ? 'Recargar' : 'Refresh')}</span>
            </Button>

            <Button type="button" variant={autoEnabled ? 'danger' : 'success'} onClick={toggleAuto} disabled={togglingAuto}>
              {togglingAuto
                ? (lang === 'es' ? '更新中…' : 'Updating…')
                : autoEnabled
                  ? (lang === 'es' ? '关闭自动模式' : 'Turn off auto')
                  : (lang === 'es' ? '开启自动模式' : 'Turn on auto')}
            </Button>

            <Button type="button" variant="primary" onClick={sendNow} disabled={sending}>
              <span>{sending ? t(lang, 'common.sending') : (lang === 'es' ? '立即发送' : 'Send now')}</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div>
              <div className="text-xs text-gray-500 mb-2">{lang === 'es' ? '状态' : 'Status'}</div>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as any);
                }}
                className="w-full sm:w-[220px] px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-minecraft-diamond/60 focus:border-transparent transition-all duration-200 dark:bg-gray-950/30 dark:border-white/10 dark:text-gray-100"
              >
                <option value="active">{lang === 'es' ? 'Activos' : 'Active'}</option>
                <option value="unsubscribed">{lang === 'es' ? 'Bajas' : 'Unsubscribed'}</option>
                <option value="all">{lang === 'es' ? 'Todos' : 'All'}</option>
              </select>
            </div>

            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-2">{lang === 'es' ? '按邮箱搜索' : 'Search by email'}</div>
              <div className="flex gap-2">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === 'es' ? 'email@...' : 'email@...'} />
                <Button type="button" variant="secondary" onClick={onSearch}>
                  {lang === 'es' ? '搜索' : 'Search'}
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {lang === 'es' ? `Mostrando: ${filteredStats.totalShown}` : `Showing: ${filteredStats.totalShown}`}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-white/10">
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">{lang === 'es' ? '状态' : 'Status'}</th>
                <th className="px-4 py-3 font-semibold">{lang === 'es' ? 'Suscrito' : 'Subscribed'}</th>
                <th className="px-4 py-3 font-semibold text-right">{lang === 'es' ? '操作' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-600 dark:text-gray-400">
                    {lang === 'es' ? 'No hay suscriptores' : 'No subscribers'}
                  </td>
                </tr>
              ) : (
                subscribers.map((s) => {
                  const isUnsub = Boolean(s.unsubscribedAt);
                  const busy = updatingRowId === s._id;
                  return (
                    <tr key={s._id} className="hover:bg-gray-50/70 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[520px]">{s.email}</div>
                        {s.source ? <div className="text-xs text-gray-500">{String(s.source)}</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isUnsub ? 'warning' : 'success'}>
                          {isUnsub ? (lang === 'es' ? 'BAJA' : 'UNSUB') : (lang === 'es' ? 'ACTIVO' : 'ACTIVE')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {s.subscribedAt ? new Date(s.subscribedAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {!isUnsub ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => updateSubscriber(s._id, 'unsubscribe')}
                              className="!px-3"
                            >
                              <FaBan />
                              <span>{lang === 'es' ? 'Dar de baja' : 'Unsubscribe'}</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => updateSubscriber(s._id, 'resubscribe')}
                              className="!px-3"
                            >
                              <FaCheckCircle />
                              <span>{lang === 'es' ? 'Reactivar' : 'Resubscribe'}</span>
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={busy}
                            onClick={() => updateSubscriber(s._id, 'delete')}
                            className="!px-3"
                          >
                            <FaTrash />
                            <span>{lang === 'es' ? 'Borrar' : 'Delete'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">{lang === 'es' ? `Página ${page}` : `Page ${page}`}</div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              {lang === 'es' ? 'Anterior' : 'Prev'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={subscribers.length < limit}
            >
              {lang === 'es' ? 'Siguiente' : 'Next'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
