import { useCallback } from 'react';
import type { ShopifyOrder, ShopifyFulfillment } from '../lib/shopify';

interface DeliveryNotePrintProps {
  order: ShopifyOrder;
  fulfillment?: ShopifyFulfillment;
  onClose: () => void;
}

export default function DeliveryNotePrint({ order, fulfillment, onClose }: DeliveryNotePrintProps) {
  const items = fulfillment ? fulfillment.line_items : order.line_items;
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Format BL: DECO-BL-YYMMDD-XXXX (RG-070)
  const d = new Date(order.created_at);
  const blNumber = `DECO-BL-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(order.id).slice(-4).padStart(4, '0')}`;

  const handlePrint = useCallback(() => {
    const printArea = document.getElementById('delivery-note-content');
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Bon de livraison ${order.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; font-size: 14px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
          .title { font-size: 24px; font-weight: 700; }
          .subtitle { color: #6b7280; margin-top: 4px; font-size: 13px; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-progress { background: #ffedd5; color: #9a3412; }
          .badge-pending { background: #fee2e2; color: #991b1b; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          .info-box p { margin-bottom: 4px; }
          .info-label { color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 10px 12px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #f3f4f6; }
          .text-right { text-align: right; }
          .font-mono { font-family: 'SF Mono', Monaco, monospace; font-size: 13px; }
          .tracking-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 20px; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #9ca3af; font-size: 12px; }
          .signature { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature-box { border-top: 1px solid #d1d5db; padding-top: 8px; text-align: center; color: #6b7280; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }, [order.name]);

  const badgeClass = order.fulfillment_status === 'fulfilled' ? 'badge-success' : order.fulfillment_status === 'in_progress' ? 'badge-progress' : 'badge-pending';
  const badgeLabel = order.fulfillment_status === 'fulfilled' ? 'Expédiée' : order.fulfillment_status === 'in_progress' ? 'En cours' : 'Non expédiée';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Aperçu — {blNumber}
            {fulfillment && <span className="text-gray-400"> (#{fulfillment.id})</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer / PDF
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Fermer
            </button>
          </div>
        </div>

        {/* Print content */}
        <div className="overflow-y-auto p-8" id="delivery-note-content">
          {/* Header */}
          <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6', marginBottom: '4px' }}>DECOSHOP TOULOUSE</div>
              <div className="title" style={{ fontSize: '24px', fontWeight: 700 }}>BON DE LIVRAISON</div>
              <div className="subtitle" style={{ color: '#6b7280', marginTop: '4px', fontSize: '13px' }}>
                {blNumber} · {now}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>Commande {order.name}</div>
            </div>
            <div>
              <span className={`badge ${badgeClass}`} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                {badgeLabel}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* Client */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div className="section-title" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
                Client
              </div>
              <p style={{ fontWeight: 500 }}>
                {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : '—'}
              </p>
              <p style={{ color: '#6b7280', fontSize: '13px' }}>{order.email}</p>
            </div>

            {/* Adresse */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              <div className="section-title" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
                Adresse de livraison
              </div>
              {order.shipping_address ? (
                <>
                  <p style={{ fontWeight: 500 }}>{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                  <p style={{ fontSize: '13px' }}>{order.shipping_address.address1}</p>
                  <p style={{ fontSize: '13px' }}>{order.shipping_address.zip} {order.shipping_address.city}</p>
                  <p style={{ fontSize: '13px' }}>{order.shipping_address.country}</p>
                </>
              ) : (
                <p style={{ color: '#9ca3af' }}>Non renseignée</p>
              )}
            </div>
          </div>

          {/* Articles table */}
          <div style={{ marginBottom: '30px' }}>
            <div className="section-title" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '12px' }}>
              Articles ({items.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>Article</th>
                  <th style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>SKU</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>Qté</th>
                  <th style={{ textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', padding: '10px 12px', borderBottom: '2px solid #e5e7eb' }}>Prix</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', fontWeight: 500 }}>{item.title}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: '13px', color: '#6b7280' }}>{item.sku || '—'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{item.price} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>Total</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                    {Number(order.total_price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tracking */}
          {fulfillment && fulfillment.tracking_number && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '30px' }}>
              <div className="section-title" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>
                Informations de suivi
              </div>
              <p><strong>N° de suivi:</strong> <span style={{ fontFamily: 'monospace' }}>{fulfillment.tracking_number}</span></p>
              {fulfillment.tracking_company && <p><strong>Transporteur:</strong> {fulfillment.tracking_company}</p>}
              {fulfillment.tracking_url && <p style={{ marginTop: '4px', fontSize: '13px', color: '#2563eb' }}>{fulfillment.tracking_url}</p>}
            </div>
          )}

          {/* Signature boxes */}
          <div style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
              <div style={{ height: '80px' }}></div>
              <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '8px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                Signature expéditeur
              </div>
            </div>
            <div>
              <div style={{ height: '80px' }}></div>
              <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '8px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
                Signature destinataire
              </div>
            </div>
          </div>

          {/* Signature électronique status (RG-070) */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginTop: '30px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e', marginBottom: '8px' }}>
              Signature electronique
            </div>
            <p style={{ fontSize: '13px', color: '#78350f' }}>
              Statut : <strong>En attente</strong> — Le livreur enverra une demande de signature au client.
            </p>
            <p style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
              Le client dispose de 10 minutes pour signer electroniquement (RG-062).
            </p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '12px' }}>
            <span>{blNumber} · DecoShop Toulouse</span>
            <span>Genere le {now}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
