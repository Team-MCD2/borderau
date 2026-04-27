import { useState } from 'react';
import type { ApiLogEntry } from '../lib/shopify';

interface ApiLogProps {
  logs: ApiLogEntry[];
}

export default function ApiLog({ logs }: ApiLogProps) {
  const [open, setOpen] = useState(false);

  if (logs.length === 0) return null;

  return (
    <div className="mt-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Journal API ({logs.length} appel{logs.length > 1 ? 's' : ''})
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-2 font-medium">Heure</th>
                  <th className="px-4 py-2 font-medium">Méthode</th>
                  <th className="px-4 py-2 font-medium">URL</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-t dark:border-gray-700 ${log.ok ? '' : 'bg-red-50 dark:bg-red-900/20'}`}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-bold uppercase ${
                          log.method === 'GET'
                            ? 'bg-blue-100 text-blue-700'
                            : log.method === 'POST'
                              ? 'bg-green-100 text-green-700'
                              : log.method === 'PUT'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs max-w-xs truncate" title={log.url}>
                      {log.url.replace(/https?:\/\/[^/]+/, '')}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`font-bold ${
                          log.status >= 200 && log.status < 300
                            ? 'text-green-600'
                            : log.status >= 400
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {log.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{log.duration}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
