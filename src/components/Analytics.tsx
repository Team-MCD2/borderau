import { useMemo, useState } from 'react';
import type { ShopifyOrder } from '../lib/shopify';

interface Props {
  orders: ShopifyOrder[];
}

export default function Analytics({ orders }: Props) {
  const [open, setOpen] = useState(false);

  // ---------- Computed stats ----------

  const stats = useMemo(() => {
    const now = new Date();
    const days = 7;
    const perDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      perDay[d.toISOString().slice(0, 10)] = 0;
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (key in perDay) perDay[key]++;
    });
    const dailyLabels = Object.keys(perDay).sort();
    const dailyValues = dailyLabels.map((k) => perDay[k]);

    const fulfilled = orders.filter((o) => o.fulfillment_status === 'fulfilled').length;
    const inProgress = orders.filter((o) => o.fulfillment_status === 'in_progress').length;
    const unfulfilled = orders.length - fulfilled - inProgress;

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0);
    const shippingRate = orders.length > 0 ? Math.round((fulfilled / orders.length) * 100) : 0;

    return { dailyLabels, dailyValues, fulfilled, inProgress, unfulfilled, totalRevenue, shippingRate };
  }, [orders]);

  const maxDaily = Math.max(...stats.dailyValues, 1);

  // ---------- Donut ----------

  const donutSegments = useMemo(() => {
    const total = stats.fulfilled + stats.inProgress + stats.unfulfilled;
    if (total === 0) return [];
    const segments: { pct: number; color: string; label: string; count: number }[] = [
      { pct: stats.fulfilled / total, color: '#22c55e', label: 'Expediees', count: stats.fulfilled },
      { pct: stats.inProgress / total, color: '#f97316', label: 'En cours', count: stats.inProgress },
      { pct: stats.unfulfilled / total, color: '#ef4444', label: 'Non exp.', count: stats.unfulfilled },
    ];
    return segments.filter((s) => s.count > 0);
  }, [stats]);

  const donutPaths = useMemo(() => {
    const paths: { d: string; color: string }[] = [];
    let cumAngle = -90;
    const cx = 50, cy = 50, r = 38;
    donutSegments.forEach((seg) => {
      const angle = seg.pct * 360;
      const startRad = (cumAngle * Math.PI) / 180;
      const endRad = ((cumAngle + angle) * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;
      paths.push({
        d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        color: seg.color,
      });
      cumAngle += angle;
    });
    return paths;
  }, [donutSegments]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Analytiques
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analytiques (7 derniers jours)</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5">
        {/* Bar chart */}
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Commandes par jour</p>
          <div className="flex items-end gap-2 h-36">
            {stats.dailyLabels.map((label, i) => {
              const pct = (stats.dailyValues[i] / maxDaily) * 100;
              const day = new Date(label).toLocaleDateString('fr-FR', { weekday: 'short' });
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{stats.dailyValues[i]}</span>
                  <div className="w-full rounded-t-md bg-blue-500 dark:bg-blue-400 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Statuts</p>
          <svg viewBox="0 0 100 100" className="h-28 w-28">
            {donutPaths.map((p, i) => (
              <path key={i} d={p.d} fill={p.color} opacity={0.85} />
            ))}
            <circle cx="50" cy="50" r="22" className="fill-white dark:fill-gray-800" />
            <text x="50" y="48" textAnchor="middle" className="fill-gray-800 dark:fill-gray-200 text-[11px] font-bold">{orders.length}</text>
            <text x="50" y="58" textAnchor="middle" className="fill-gray-400 text-[7px]">total</text>
          </svg>
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {donutSegments.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-gray-600 dark:text-gray-400">{s.label} ({s.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 dark:border-gray-700 divide-x divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{orders.length}</p>
          <p className="text-[10px] text-gray-400 uppercase">Commandes</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {stats.totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-gray-400 uppercase">Chiffre d'affaires</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-green-600">{stats.shippingRate}%</p>
          <p className="text-[10px] text-gray-400 uppercase">Taux expedition</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-red-500">{stats.unfulfilled}</p>
          <p className="text-[10px] text-gray-400 uppercase">A expedier</p>
        </div>
      </div>
    </div>
  );
}
