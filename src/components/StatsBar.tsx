import { useMemo } from 'react';
import type { ShopifyOrder } from '../lib/shopify';

interface StatsBarProps {
  orders: ShopifyOrder[];
  loading: boolean;
}

interface StatCard {
  label: string;
  value: number | string;
  color: string;
  bg: string;
}

export default function StatsBar({ orders, loading }: StatsBarProps) {
  const stats = useMemo<StatCard[]>(() => {
    const total = orders.length;
    const fulfilled = orders.filter((o) => o.fulfillment_status === 'fulfilled').length;
    const inProgress = orders.filter((o) => o.fulfillment_status === 'in_progress').length;
    const unfulfilled = orders.filter(
      (o) => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled',
    ).length;
    const withTracking = orders.filter((o) =>
      o.fulfillments.some((f) => f.tracking_number),
    ).length;

    return [
      { label: 'Total commandes', value: total, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
      { label: 'Expédiées', value: fulfilled, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
      { label: 'En cours', value: inProgress, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
      { label: 'Non expédiées', value: unfulfilled, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
      { label: 'Avec tracking', value: withTracking, color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
    ];
  }, [orders]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl border p-4 ${stat.bg} transition-shadow hover:shadow-md`}
        >
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
          <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
