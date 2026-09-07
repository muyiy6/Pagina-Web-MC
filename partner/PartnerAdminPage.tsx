'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { createPortal } from 'react-dom';
import { FaBullhorn, FaCalendarAlt, FaCrown, FaTag } from 'react-icons/fa';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import { getDateLocale } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatDateTime, formatPrice } from '@/lib/utils';
import { PARTNER_MAX_DAYS, PARTNER_PAID_MAX_SLOT, PARTNER_SLOTS, type PartnerPricingConfig } from '@/lib/partnerPricing';

type AdminAd = {
  _id: string;
  userId: string;
  ownerUsername: string;
  serverName: string;
  address: string;
  version?: string;
  description: string;
  website?: string;
  discord?: string;
  banner?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  submissionNote?: string;
  createdAt: string;
  updatedAt: string;
};

type AdminBooking = {
  _id: string;
  adId: string;
  userId: string;
  slot: number;
  kind: 'CUSTOM' | 'MONTHLY';
  days: number;
  currency: string;
  totalPrice: number;
  provider: 'PAYPAL' | 'STRIPE' | 'FREE';
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  requestNote?: string;
  paidAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  ad?: { serverName: string; ownerUsername: string; status: string } | null;
};

function slotLabel(slot: number): string {
  return Number(slot) === 0 ? 'VIP' : `#${slot}`;
}

function adBadge(status: AdminAd['status']) {
  if (status === 'APPROVED') return <Badge variant="success">已批准</Badge>;
  if (status === 'REJECTED') return <Badge variant="danger">已拒绝</Badge>;
  return <Badge variant="warning">待审核</Badge>;
}

function bookingBadge(status: AdminBooking['status']) {
  if (status === 'ACTIVE') return <Badge variant="success">活跃</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">待处理</Badge>;
  if (status === 'EXPIRED') return <Badge variant="default">已过期</Badge>;
  return <Badge variant="default">已取消</Badge>;
}

function Modal({
  open,
  title,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/95">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white font-bold truncate">{title}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={onClose}>{closeLabel}</Button>
            </div>
            {children}
          </Card>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PartnerAdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;

  const [tab, setTab] = useState<'ADS' | 'BOOKINGS' | 'PRICING' | 'OWNER'>('ADS');

  const lang = useClientLang();
  const dateLocale = getDateLocale(lang);

  const [adsStatus, setAdsStatus] = useState<AdminAd['status']>('PENDING_REVIEW');
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [selectedAdId, setSelectedAdId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [editAdSaving, setEditAdSaving] = useState(false);
  const [editAdError, setEditAdError] = useState<string | null>(null);
  const [editBannerUploading, setEditBannerUploading] = useState(false);
  const [editAdForm, setEditAdForm] = useState({
    ownerUsername: '',
    serverName: '',
    address: '',
    version: '',
    description: '',
    website: '',
    discord: '',
    banner: '',
  });

  const [bookingsStatus, setBookingsStatus] = useState<AdminBooking['status'] | 'PENDING_OR_ACTIVE'>('PENDING_OR_ACTIVE');
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PartnerPricingConfig | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingDay, setPricingDay] = useState<number>(7);

  const [overridesOpen, setOverridesOpen] = useState(false);
  const [systemAdOpen, setSystemAdOpen] = useState(false);
  const [editAdOpen, setEditAdOpen] = useState(false);

  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overridesSaving, setOverridesSaving] = useState(false);
  const [overridesError, setOverridesError] = useState<string | null>(null);
  const [slotOverrides, setSlotOverrides] = useState<string[]>(Array(PARTNER_SLOTS).fill(''));
  const [vipOverride, setVipOverride] = useState<string>('');
  const [approvedAds, setApprovedAds] = useState<AdminAd[]>([]);

  const [systemAdCreating, setSystemAdCreating] = useState(false);
  const [systemAdError, setSystemAdError] = useState<string | null>(null);
  const [systemAdForm, setSystemAdForm] = useState({
    ownerUsername: String(session?.user?.name || session?.user?.email || 'Owner'),
    serverName: '',
    address: '',
    version: '',
    description: '',
    website: '',
    discord: '',
    banner: '',
  });

  const canAccess = role === 'ADMIN' || role === 'OWNER';
  const canOverrideSlots = role === 'OWNER';

  const loadOverrides = async () => {
    setOverridesLoading(true);
    setOverridesError(null);
    try {
      const res = await fetch('/api/admin/partner/slots', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      const slots = Array.isArray((data as any)?.overrides?.slots) ? ((data as any).overrides.slots as any[]) : [];
      const next = Array.from({ length: PARTNER_SLOTS }, (_, i) => String(slots[i] ?? '').trim());
      setSlotOverrides(next);

      const vipAdId = String((data as any)?.overrides?.vipAdId || '').trim();
      setVipOverride(vipAdId);
    } catch (e: any) {
      setOverridesError(String(e?.message || '错误'));
      setSlotOverrides(Array(PARTNER_SLOTS).fill(''));
      setVipOverride('');
    } finally {
      setOverridesLoading(false);
    }
  };

  const loadApprovedAds = async () => {
    try {
      const qp = new URLSearchParams();
      qp.set('status', 'APPROVED');
      const res = await fetch(`/api/admin/partner/ads?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      const items = Array.isArray((data as any).items) ? ((data as any).items as AdminAd[]) : [];
      setApprovedAds(items);
    } catch {
      setApprovedAds([]);
    }
  };

  const saveOverrides = async () => {
    setOverridesSaving(true);
    setOverridesError(null);
    try {
      const res = await fetch('/api/admin/partner/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotOverrides, vipAdId: vipOverride }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      await loadOverrides();
      setOverridesOpen(false);
    } catch (e: any) {
      setOverridesError(String(e?.message || '错误'));
    } finally {
      setOverridesSaving(false);
    }
  };

  const createSystemAd = async () => {
    setSystemAdCreating(true);
    setSystemAdError(null);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemAdForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      setSystemAdForm((p) => ({ ...p, serverName: '', address: '', version: '', description: '', website: '', discord: '', banner: '' }));
      await loadApprovedAds();
      setSystemAdOpen(false);
    } catch (e: any) {
      setSystemAdError(String(e?.message || '错误'));
    } finally {
      setSystemAdCreating(false);
    }
  };

  const loadPricing = async () => {
    setPricingLoading(true);
    setPricingError(null);
    try {
      const res = await fetch('/api/admin/partner/pricing', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      const cfg = (data as any)?.config as PartnerPricingConfig | undefined;
      if (!cfg) throw new Error('配置无效');
      setPricing({
        slotTotalsEur: Array.isArray((cfg as any).slotTotalsEur)
          ? ((cfg as any).slotTotalsEur as any[]).map((row) =>
              Array.isArray(row)
                ? row.map((n) => {
                    const v = Number(n);
                    return Number.isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
                  })
                : []
            )
          : [],

        vipTotalsEur: Array.isArray((cfg as any).vipTotalsEur)
          ? ((cfg as any).vipTotalsEur as any[]).map((n) => {
              const v = Number(n);
              return Number.isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
            })
          : [],
      });
    } catch (e: any) {
      setPricingError(String(e?.message || '错误'));
      setPricing(null);
    } finally {
      setPricingLoading(false);
    }
  };

  const savePricing = async () => {
    if (!pricing) return;
    const ok =
      Array.isArray(pricing.slotTotalsEur) &&
      pricing.slotTotalsEur.length === PARTNER_SLOTS &&
      pricing.slotTotalsEur.every((row) => Array.isArray(row) && row.length === PARTNER_MAX_DAYS) &&
      Array.isArray(pricing.vipTotalsEur) &&
      pricing.vipTotalsEur.length === PARTNER_MAX_DAYS;
    if (!ok) {
      setPricingError(`必须填写 ${PARTNER_SLOTS} 个展示位和 ${PARTNER_MAX_DAYS} 天的价格。`);
      return;
    }

    setPricingSaving(true);
    setPricingError(null);
    try {
      const res = await fetch('/api/admin/partner/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotTotalsEur: pricing.slotTotalsEur,
          vipTotalsEur: pricing.vipTotalsEur,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      await loadPricing();
      setPricingOpen(false);
    } catch (e: any) {
      setPricingError(String(e?.message || '错误'));
    } finally {
      setPricingSaving(false);
    }
  };

  const loadAds = async () => {
    setAdsLoading(true);
    setAdsError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('status', adsStatus);
      const res = await fetch(`/api/admin/partner/ads?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      const nextAds = Array.isArray((data as any).items) ? ((data as any).items as AdminAd[]) : [];
      setAds(nextAds);
      setSelectedAdId((prev) => {
        if (prev && nextAds.some((a) => a._id === prev)) return prev;
        return nextAds[0]?._id || '';
      });
    } catch (e: any) {
      setAdsError(String(e?.message || '错误'));
      setAds([]);
      setSelectedAdId('');
    } finally {
      setAdsLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const qp = new URLSearchParams();
      if (bookingsStatus !== 'PENDING_OR_ACTIVE') qp.set('status', bookingsStatus);
      const res = await fetch(`/api/admin/partner/bookings?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      setBookings(Array.isArray((data as any).items) ? ((data as any).items as AdminBooking[]) : []);
    } catch (e: any) {
      setBookingsError(String(e?.message || '错误'));
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess, adsStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess, bookingsStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canOverrideSlots) return;
    void loadOverrides();
    void loadApprovedAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canOverrideSlots]);

  const decide = async (adId: string, action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' ? String(rejectReason || '').trim() : '';
    if (action === 'REJECT' && !reason) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      await loadAds();
      await loadBookings();
    } catch (e: any) {
      alert(String(e?.message || '错误'));
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pending = ads.filter((a) => a.status === 'PENDING_REVIEW').length;
    const approved = ads.filter((a) => a.status === 'APPROVED').length;
    const rejected = ads.filter((a) => a.status === 'REJECTED').length;
    return { pending, approved, rejected };
  }, [ads]);

  const bookingStats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'PENDING').length;
    const active = bookings.filter((b) => b.status === 'ACTIVE').length;
    const expired = bookings.filter((b) => b.status === 'EXPIRED').length;
    return { pending, active, expired };
  }, [bookings]);

  const selectedAd = useMemo(() => {
    return ads.find((a) => a._id === selectedAdId) || null;
  }, [ads, selectedAdId]);

  useEffect(() => {
    setRejectReason(String(selectedAd?.rejectionReason || ''));
  }, [selectedAd]);

  useEffect(() => {
    if (!selectedAd) return;
    setEditAdError(null);
    setEditAdForm({
      ownerUsername: String(selectedAd.ownerUsername || ''),
      serverName: String(selectedAd.serverName || ''),
      address: String(selectedAd.address || ''),
      version: String(selectedAd.version || ''),
      description: String(selectedAd.description || ''),
      website: String(selectedAd.website || ''),
      discord: String(selectedAd.discord || ''),
      banner: String(selectedAd.banner || ''),
    });
  }, [selectedAdId]);

  const saveSelectedAd = async () => {
    if (!selectedAd) return;
    setEditAdSaving(true);
    setEditAdError(null);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: selectedAd._id,
          ownerUsername: editAdForm.ownerUsername,
          serverName: editAdForm.serverName,
          address: editAdForm.address,
          version: editAdForm.version,
          description: editAdForm.description,
          website: editAdForm.website,
          discord: editAdForm.discord,
          banner: editAdForm.banner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      await loadAds();
      await loadBookings();
      setEditAdOpen(false);
    } catch (e: any) {
      setEditAdError(String(e?.message || '错误'));
    } finally {
      setEditAdSaving(false);
    }
  };

  const uploadEditBanner = async (file: File) => {
    setEditBannerUploading(true);
    setEditAdError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/partner-banner', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      const url = String((data as any)?.url || '').trim();
      if (!url) throw new Error('上传图片失败');
      setEditAdForm((p) => ({ ...p, banner: url }));
    } catch (e: any) {
      setEditAdError(String(e?.message || '上传图片失败'));
    } finally {
      setEditBannerUploading(false);
    }
  };

  const deleteSelectedAd = async () => {
    if (!selectedAd) return;
    const ok = window.confirm('删除该信息吗？如果正在展示，将从排行中移除。');
    if (!ok) return;

    setEditAdSaving(true);
    setEditAdError(null);
    try {
      const res = await fetch(`/api/admin/partner/ads?adId=${encodeURIComponent(selectedAd._id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || '错误'));
      setSelectedAdId('');
      await loadAds();
      await loadBookings();
      setEditAdOpen(false);
    } catch (e: any) {
      setEditAdError(String(e?.message || '错误'));
    } finally {
      setEditAdSaving(false);
    }
  };

  if (sessionStatus === 'loading') {
    return (
      <main className="max-w-6xl mx-auto py-10 px-4">
        <div className="text-gray-600 dark:text-gray-400">加载中…</div>
      </main>
    );
  }

  if (sessionStatus !== 'authenticated' || !canAccess) {
    return (
      <main className="max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">合作伙伴审核</h1>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-gray-700 dark:text-gray-300">未授权。</div>
          <div className="mt-4">
            <Link href="/" className="inline-flex">
              <Button variant="secondary" size="sm">返回</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs text-gray-600 dark:text-gray-400">面板</div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">合作伙伴审核</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-2">
              管理广告、预订和价格 • Top {PARTNER_SLOTS} 个展示位
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadAds} disabled={adsLoading}>
              {adsLoading ? '加载中…' : '刷新广告'}
            </Button>
            <Button variant="secondary" size="sm" onClick={loadBookings} disabled={bookingsLoading}>
              {bookingsLoading ? '加载中…' : '刷新预订'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void loadPricing();
                setPricingOpen(true);
              }}
              disabled={pricingLoading}
            >
              {pricingLoading ? '加载中…' : '编辑价格'}
            </Button>
            {canOverrideSlots ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void loadOverrides();
                  void loadApprovedAds();
                  setOverridesOpen(true);
                }}
                disabled={overridesLoading}
              >
                手动分配
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">待审核广告</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.pending}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">待处理预订</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{bookingStats.pending}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">活跃预订</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{bookingStats.active}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-xs text-gray-600 dark:text-gray-400">已过期预订</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{bookingStats.expired}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mb-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">模块</div>

          {([
            {
              k: 'ADS' as const,
              title: '广告',
              desc: '审核、编辑和批准',
              icon: FaBullhorn,
              meta: `${
                adsStatus === 'PENDING_REVIEW'
                  ? '待审核'
                  : adsStatus === 'APPROVED'
                    ? '已批准'
                    : '已拒绝'
              }: ${ads.length}`,
            },
            {
              k: 'BOOKINGS' as const,
              title: '预订',
              desc: '支付、状态和时长',
              icon: FaCalendarAlt,
              meta: `${bookingsStatus === 'PENDING_OR_ACTIVE' ? '待处理/活跃' : bookingsStatus}: ${bookings.length}`,
            },
            {
              k: 'PRICING' as const,
              title: '价格',
              desc: '展示位价格和天数',
              icon: FaTag,
              meta: pricing
                ? '已配置'
                : pricingLoading
                  ? '加载中…'
                  : '未配置',
            },
            ...(canOverrideSlots
              ? ([
                  {
                    k: 'OWNER' as const,
                    title: 'Owner',
                    desc: '覆盖分配和内部广告',
                    icon: FaCrown,
                    meta: '高级操作',
                  },
                ] as const)
              : ([] as const)),
          ] as const).map((s) => {
            const Icon = s.icon;
            const active = tab === s.k;
            return (
              <button
                key={s.k}
                type="button"
                onClick={() => setTab(s.k)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                  active
                    ? 'border-minecraft-grass/30 bg-minecraft-grass/10'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-gray-950/25 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-11 w-11 rounded-xl grid place-items-center border ${
                      active
                        ? 'bg-minecraft-grass/15 text-minecraft-grass border-minecraft-grass/30'
                        : 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-white/5 dark:text-gray-200 dark:border-white/10'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-gray-900 dark:text-white font-bold truncate">{s.title}</div>
                      {active ? <Badge variant="success">打开</Badge> : null}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.desc}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{s.meta}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 space-y-4">

      {tab === 'ADS' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">广告</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">批准 / 拒绝请求</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={adsStatus} onChange={(e) => setAdsStatus(e.target.value as any)}>
                  <option value="PENDING_REVIEW">待审核</option>
                  <option value="APPROVED">已批准</option>
                  <option value="REJECTED">已拒绝</option>
                </Select>
              </div>
              <Button variant="secondary" size="sm" onClick={loadAds} disabled={adsLoading}>刷新</Button>
            </div>
          </div>

          {adsError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{adsError}</div> : null}

          {!ads.length ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">没有广告符合此筛选条件。</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-white/5 max-h-[560px] overflow-auto">
                <div className="space-y-1">
                  {ads.map((a) => {
                    const active = a._id === selectedAdId;
                    return (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => setSelectedAdId(a._id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-minecraft-grass/30 bg-minecraft-grass/10'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{a.serverName}</div>
                          {adBadge(a.status)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.address}{a.version ? ` • ${a.version}` : ''}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{a.ownerUsername}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                {!selectedAd ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">请选择一个请求。</div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{selectedAd.serverName}</div>
                          {adBadge(selectedAd.status)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedAd.address}{selectedAd.version ? ` • ${selectedAd.version}` : ''}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">所有者: {selectedAd.ownerUsername}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">UserId: {selectedAd.userId}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => decide(selectedAd._id, 'APPROVE')}
                          disabled={adsLoading || actionLoading || selectedAd.status === 'APPROVED'}
                        >
                          {actionLoading ? '处理中…' : '批准'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => decide(selectedAd._id, 'REJECT')}
                          disabled={adsLoading || actionLoading || selectedAd.status === 'REJECTED' || !String(rejectReason || '').trim()}
                        >
                          拒绝
                        </Button>
                        {role === 'OWNER' ? (
                          <Button variant="secondary" size="sm" onClick={() => setEditAdOpen(true)} disabled={!selectedAd}>
                            编辑…
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {selectedAd.status !== 'APPROVED' ? (
                      <div className="mt-4">
                        <label className="text-xs text-gray-600 dark:text-gray-400">拒绝原因（拒绝时必填）</label>
                        <Textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          maxLength={300}
                          placeholder="例：横幅无效、缺少资料等。"
                        />
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{String(rejectReason || '').length}/300</div>
                      </div>
                    ) : null}

                    {selectedAd.status === 'REJECTED' && selectedAd.rejectionReason ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                        <div className="font-semibold">拒绝原因</div>
                        <div className="opacity-90">{selectedAd.rejectionReason}</div>
                      </div>
                    ) : null}

                    {String(selectedAd.submissionNote || '').trim() ? (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                        <div className="font-semibold">申请备注</div>
                        <div className="mt-1 whitespace-pre-wrap">{String(selectedAd.submissionNote || '').trim()}</div>
                      </div>
                    ) : null}

                    <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAd.description}</div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      {selectedAd.website ? (
                        <a href={selectedAd.website} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          网站
                        </a>
                      ) : null}
                      {selectedAd.discord ? (
                        <a href={selectedAd.discord} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          Discord
                        </a>
                      ) : null}
                      {selectedAd.banner ? (
                        <a href={selectedAd.banner} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          横幅
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      创建于: {formatDateTime(selectedAd.createdAt, dateLocale)} • 更新于: {formatDateTime(selectedAd.updatedAt, dateLocale)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'BOOKINGS' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">预订</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">支付历史和状态</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={bookingsStatus} onChange={(e) => setBookingsStatus(e.target.value as any)}>
                  <option value="PENDING_OR_ACTIVE">待处理 + 活跃</option>
                  <option value="PENDING">待处理</option>
                  <option value="ACTIVE">活跃</option>
                  <option value="EXPIRED">已过期</option>
                  <option value="CANCELED">已取消</option>
                </Select>
              </div>
              <Button variant="secondary" size="sm" onClick={loadBookings} disabled={bookingsLoading}>刷新</Button>
            </div>
          </div>

          {bookingsError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{bookingsError}</div> : null}

          {!bookings.length ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">暂无预订。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">状态</th>
                    <th className="py-2 pr-4">展示位</th>
                    <th className="py-2 pr-4">广告</th>
                    <th className="py-2 pr-4">用户</th>
                    <th className="py-2 pr-4">支付</th>
                    <th className="py-2 pr-4">备注</th>
                    <th className="py-2 pr-4">结束</th>
                    <th className="py-2">创建</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {bookings.map((b) => (
                    <tr key={b._id} className="text-gray-700 dark:text-gray-200">
                      <td className="py-3 pr-4">{bookingBadge(b.status)}</td>
                      <td className="py-3 pr-4 font-semibold">{slotLabel(Number(b.slot))}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900 dark:text-white">{b.ad?.serverName || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{b.ad?.ownerUsername || ''}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{b.userId}</td>
                      <td className="py-3 pr-4">
                        {String(b.provider) === 'FREE'
                          ? '免费'
                          : `${b.provider} • ${formatPrice(Number(b.totalPrice || 0), dateLocale, String(b.currency || 'EUR'))}`}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 max-w-[360px]">
                        {String(b.requestNote || '').trim() ? String(b.requestNote).trim() : '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{b.endsAt ? formatDateTime(b.endsAt, dateLocale) : '—'}</td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(b.createdAt, dateLocale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'PRICING' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">合作伙伴价格</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">按展示位和时长的固定价格</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadPricing} disabled={pricingLoading || pricingSaving}>刷新</Button>
              <Button variant="primary" size="sm" onClick={() => setPricingOpen(true)} disabled={pricingLoading || !pricing}>编辑…</Button>
            </div>
          </div>

          {pricingError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{pricingError}</div> : null}

          {!pricing ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">{pricingLoading ? '加载中…' : '暂无配置。'}</div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">按天数的固定价格</span> (1–{PARTNER_MAX_DAYS})
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">快速预览</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28">
                  <Select value={String(pricingDay)} onChange={(e) => setPricingDay(Number(e.target.value || 1))}>
                    {Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}天</option>
                    ))}
                  </Select>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  VIP {Number(pricing.vipTotalsEur?.[pricingDay - 1] || 0)}€ • 展示位 #1 {Number(pricing.slotTotalsEur?.[0]?.[pricingDay - 1] || 0)}€ • 展示位 #10 {Number(pricing.slotTotalsEur?.[9]?.[pricingDay - 1] || 0)}€
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'OWNER' && canOverrideSlots ? (
        <div className="space-y-4">
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-gray-900 dark:text-white font-bold">手动分配展示位</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">仅 OWNER • 优先于活跃预订</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={loadOverrides} disabled={overridesLoading || overridesSaving}>刷新</Button>
                <Button variant="primary" size="sm" onClick={() => setOverridesOpen(true)} disabled={overridesLoading}>编辑…</Button>
              </div>
            </div>

            {overridesError ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{overridesError}</div> : null}
          </Card>

          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-gray-900 dark:text-white font-bold">创建内部广告</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">仅 OWNER • 用于手动分配</div>
              </div>
              <Button variant="primary" size="sm" onClick={() => setSystemAdOpen(true)}>创建…</Button>
            </div>

            {systemAdError ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{systemAdError}</div> : null}
          </Card>
        </div>
      ) : null}

        </div>
      </div>

      <Modal open={pricingOpen} title="编辑价格" closeLabel="关闭" onClose={() => setPricingOpen(false)}>
        {pricingError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{pricingError}</div> : null}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">天数</label>
              <Select value={String(pricingDay)} onChange={(e) => setPricingDay(Number(e.target.value || 1))}>
                {Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d} 天</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPricingOpen(false)} disabled={pricingSaving}>取消</Button>
              <Button variant="primary" size="sm" onClick={savePricing} disabled={!pricing || pricingLoading || pricingSaving}>
                {pricingSaving ? '保存中…' : '保存'}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            编辑该天 VIP 和每个展示位（EUR）的总价格。
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(() => {
              const dayIdx = Math.min(PARTNER_MAX_DAYS, Math.max(1, pricingDay)) - 1;
              const v = Number(pricing?.vipTotalsEur?.[dayIdx] || 0);
              return (
                <>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5 px-3 py-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">VIP</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const num = Number.isFinite(val) && val >= 0 ? Math.round(val * 100) / 100 : 0;
                          setPricing((prev) => {
                            if (!prev) return prev;
                            const newVip = [...prev.vipTotalsEur];
                            newVip[dayIdx] = num;
                            return { ...prev, vipTotalsEur: newVip };
                          });
                        }}
                        placeholder="0.00"
                        disabled={pricingSaving}
                        className="w-full"
                      />
                    </div>
                  </div>
                  {Array.from({ length: PARTNER_SLOTS }, (_, i) => i + 1).map((slotNum) => {
                    const row = pricing?.slotTotalsEur?.[slotNum - 1];
                    const val = Number(row?.[dayIdx] || 0);
                    return (
                      <div key={slotNum} className="rounded-xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5 px-3 py-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">#{slotNum}</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={val || ''}
                            onChange={(e) => {
                              const val2 = parseFloat(e.target.value);
                              const num2 = Number.isFinite(val2) && val2 >= 0 ? Math.round(val2 * 100) / 100 : 0;
                              setPricing((prev) => {
                                if (!prev) return prev;
                                const newRows = prev.slotTotalsEur.map((row2, idx) => {
                                  if (idx === slotNum - 1) {
                                    const newRow = [...row2];
                                    newRow[dayIdx] = num2;
                                    return newRow;
                                  }
                                  return row2;
                                });
                                return { ...prev, slotTotalsEur: newRows };
                              });
                            }}
                            placeholder="0.00"
                            disabled={pricingSaving}
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      </Modal>

      <Modal open={overridesOpen} title="手动分配展示位" closeLabel="关闭" onClose={() => setOverridesOpen(false)}>
        {overridesError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{overridesError}</div> : null}

        <div className="space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            输入广告 ID（_id）来强制分配到指定展示位。VIP 最高优先级。
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">VIP</label>
              <Input
                value={vipOverride}
                onChange={(e) => setVipOverride(e.target.value)}
                placeholder="ad ID"
                disabled={overridesSaving}
              />
            </div>
            {Array.from({ length: PARTNER_SLOTS }, (_, i) => i + 1).map((slotNum) => (
              <div key={slotNum}>
                <label className="text-xs text-gray-600 dark:text-gray-400">#{slotNum}</label>
                <Input
                  value={slotOverrides[slotNum - 1]}
                  onChange={(e) => {
                    const newSlots = [...slotOverrides];
                    newSlots[slotNum - 1] = e.target.value;
                    setSlotOverrides(newSlots);
                  }}
                  placeholder="ad ID"
                  disabled={overridesSaving}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={saveOverrides} disabled={overridesLoading || overridesSaving}>
              {overridesSaving ? '保存中…' : '保存覆盖'}
            </Button>
            <Button variant="secondary" onClick={() => setOverridesOpen(false)} disabled={overridesSaving}>
              取消
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={systemAdOpen} title="创建内部广告" closeLabel="关闭" onClose={() => setSystemAdOpen(false)}>
        {systemAdError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{systemAdError}</div> : null}

        <div className="space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            该广告将直接创建为“已批准”状态，用于手动展示位分配。
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">所有者用户名</label>
              <Input
                value={systemAdForm.ownerUsername}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, ownerUsername: e.target.value }))}
                placeholder="username"
                disabled={systemAdCreating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">服务器名称</label>
              <Input
                value={systemAdForm.serverName}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, serverName: e.target.value }))}
                placeholder="Mi Servidor"
                disabled={systemAdCreating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">地址</label>
              <Input
                value={systemAdForm.address}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="play.mi-server.com"
                disabled={systemAdCreating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">版本</label>
              <Input
                value={systemAdForm.version}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, version: e.target.value }))}
                placeholder="1.20.1"
                disabled={systemAdCreating}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">描述</label>
              <Textarea
                value={systemAdForm.description}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Descripción del servidor"
                disabled={systemAdCreating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">网站</label>
              <Input
                value={systemAdForm.website}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://..."
                disabled={systemAdCreating}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Discord</label>
              <Input
                value={systemAdForm.discord}
                onChange={(e) => setSystemAdForm((p) => ({ ...p, discord: e.target.value }))}
                placeholder="https://discord.gg/..."
                disabled={systemAdCreating}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">横幅图片 URL</label>
              <div className="flex items-center gap-2">
                <Input
                  value={systemAdForm.banner}
                  onChange={(e) => setSystemAdForm((p) => ({ ...p, banner: e.target.value }))}
                  placeholder="/uploads/partner/..."
                  disabled={systemAdCreating}
                  className="flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                      const res = await fetch('/api/uploads/partner-banner', { method: 'POST', body: fd });
                      const data = await res.json();
                      if (res.ok && data.url) {
                        setSystemAdForm((p) => ({ ...p, banner: data.url }));
                      } else {
                        alert('上传失败');
                      }
                    } catch {
                      alert('上传失败');
                    }
                    e.target.value = '';
                  }}
                  disabled={systemAdCreating}
                  className="block text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-900 hover:file:bg-gray-200 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/15"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={createSystemAd} disabled={systemAdCreating}>
              {systemAdCreating ? '创建中…' : '创建广告'}
            </Button>
            <Button variant="secondary" onClick={() => setSystemAdOpen(false)} disabled={systemAdCreating}>
              取消
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editAdOpen} title="编辑广告" closeLabel="关闭" onClose={() => setEditAdOpen(false)}>
        {editAdError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{editAdError}</div> : null}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">所有者用户名</label>
              <Input
                value={editAdForm.ownerUsername}
                onChange={(e) => setEditAdForm((p) => ({ ...p, ownerUsername: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">服务器名称</label>
              <Input
                value={editAdForm.serverName}
                onChange={(e) => setEditAdForm((p) => ({ ...p, serverName: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">地址</label>
              <Input
                value={editAdForm.address}
                onChange={(e) => setEditAdForm((p) => ({ ...p, address: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">版本</label>
              <Input
                value={editAdForm.version}
                onChange={(e) => setEditAdForm((p) => ({ ...p, version: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">描述</label>
              <Textarea
                value={editAdForm.description}
                onChange={(e) => setEditAdForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                disabled={editAdSaving}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">网站</label>
              <Input
                value={editAdForm.website}
                onChange={(e) => setEditAdForm((p) => ({ ...p, website: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Discord</label>
              <Input
                value={editAdForm.discord}
                onChange={(e) => setEditAdForm((p) => ({ ...p, discord: e.target.value }))}
                disabled={editAdSaving}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">横幅图片 URL</label>
              <div className="flex items-center gap-2">
                <Input
                  value={editAdForm.banner}
                  onChange={(e) => setEditAdForm((p) => ({ ...p, banner: e.target.value }))}
                  disabled={editAdSaving}
                  className="flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await uploadEditBanner(file);
                    e.target.value = '';
                  }}
                  disabled={editAdSaving || editBannerUploading}
                  className="block text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-900 hover:file:bg-gray-200 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/15"
                />
                {editBannerUploading && <span className="text-xs text-gray-400">上传中…</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={saveSelectedAd} disabled={editAdSaving}>
              {editAdSaving ? '保存中…' : '保存'}
            </Button>
            <Button variant="secondary" onClick={() => setEditAdOpen(false)} disabled={editAdSaving}>
              取消
            </Button>
            <Button variant="danger" onClick={deleteSelectedAd} disabled={editAdSaving}>
              删除
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}