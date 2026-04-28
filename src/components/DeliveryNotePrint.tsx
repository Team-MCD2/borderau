import { useCallback, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ShopifyOrder, ShopifyFulfillment } from '../lib/shopify';

interface DeliveryNotePrintProps {
  order: ShopifyOrder;
  fulfillment?: ShopifyFulfillment;
  onClose: () => void;
}

export default function DeliveryNotePrint({ order, fulfillment, onClose }: DeliveryNotePrintProps) {
  const [generating, setGenerating] = useState(false);
  const items = fulfillment ? fulfillment.line_items : order.line_items;
  const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Format BL number
  const d = new Date(order.created_at);
  const blNumber = `DECO-BL-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(order.id).slice(-4).padStart(4, '0')}`;
  const factureNumber = String(order.id).padStart(7, '0');

  // Client info
  const clientNom = order.customer?.last_name || '';
  const clientPrenom = order.customer?.first_name || '';
  const clientEmail = order.email || '';
  const clientPhone = '';
  const clientAdresse = order.shipping_address
    ? `${order.shipping_address.address1 || ''}, ${order.shipping_address.zip || ''} ${order.shipping_address.city || ''}`.trim()
    : '';

  const generatePdf = useCallback(() => {
    setGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const m = 12; // marge
      const contentW = pageW - m * 2;
      let y = m;

      // ——— Couleurs conformes au vrai BL DecoShop ———
      const bleu: [number, number, number] = [0, 51, 153]; // bleu fonce DecoShop
      const noir: [number, number, number] = [0, 0, 0];
      const gris: [number, number, number] = [60, 60, 60];
      const bleuClair: [number, number, number] = [200, 215, 240];

      const wrapText = (text: string, maxWidth: number) => {
        if (!text) return [''];
        return doc.splitTextToSize(String(text), maxWidth) as string[];
      };

      // ========================================================
      // EN-TETE
      // ========================================================

      // "DECOSHOP" grand titre
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(...bleu);
      doc.text('DECOSHOP', m, y + 10);

      // Slogan
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...gris);
      doc.text('Mobilier design et tendance', m, y + 15);

      // Facture N°
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...bleu);
      doc.text(`FACTURE N\u00B0 ${factureNumber}`, m, y + 22);

      // DATE en haut a droite
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...noir);
      doc.text('DATE:', pageW - m - 45, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(now, pageW - m - 25, y + 4);

      // ========================================================
      // BLOC ADRESSES ENTREPRISE (gauche) + CLIENT (droite)
      // ========================================================
      y += 28;

      const leftW = contentW * 0.48;
      const rightW = contentW * 0.48;
      const rightX = pageW - m - rightW;
      const boxH = 35;

      // --- Cadre adresses entreprise (gauche) ---
      doc.setDrawColor(...bleu);
      doc.setLineWidth(0.5);
      doc.rect(m, y, leftW, boxH);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...bleu);
      let ly = y + 5;
      doc.text('DECOSHOP TOULOUSE', m + 3, ly);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...noir);
      doc.setFontSize(8.5);
      ly += 4.5;
      doc.text('3 RUE EMILE BAUDOT, 31100 TOULOUSE', m + 3, ly);
      ly += 6;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...bleu);
      doc.setFontSize(9);
      doc.text('DECOSHOP PARIS', m + 3, ly);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...noir);
      doc.setFontSize(8.5);
      ly += 4.5;
      doc.text('RUE JEAN PIERRE TIMBAUD 78520 LIMAY', m + 3, ly);

      // --- Cadre CLIENT (droite) ---
      doc.setDrawColor(...bleu);
      doc.setLineWidth(0.5);
      doc.rect(rightX, y, rightW, boxH);

      // Titre CLIENT
      doc.setFillColor(...bleu);
      doc.rect(rightX, y, rightW, 6, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('CLIENT', rightX + rightW / 2, y + 4.5, { align: 'center' });

      // Champs client
      doc.setTextColor(...noir);
      doc.setFontSize(9);
      const fieldX = rightX + 3;
      const valX = rightX + 28;
      let cy = y + 10.5;
      const maxValWidth = rightX + rightW - 3 - valX;

      const clientFields: [string, string][] = [
        ['NOM', clientNom],
        ['PRENOM', clientPrenom],
        ['NUM PHONE', clientPhone],
        ['ADRESSE', clientAdresse],
        ['EMAIL', clientEmail],
      ];
      for (const [label, value] of clientFields) {
        doc.setFont('helvetica', 'bold');
        doc.text(label, fieldX, cy);
        doc.setFont('helvetica', 'normal');
        const lines = wrapText(value || '', maxValWidth);
        doc.text(lines, valX, cy);
        cy += Math.max(1, lines.length) * 4.2;
      }

      // ========================================================
      // TABLEAU ARTICLES
      // ========================================================
      y += boxH + 5;

      const tableBody = items.map((item) => [
        String(item.quantity),
        item.title,
        `${Number(item.price).toFixed(2)}`,
        `${(Number(item.price) * item.quantity).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: m, right: m },
        head: [['QUANTITE', 'DESIGNATION', 'PRIX UNIT', 'TOTAL']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: bleu,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9.5,
          halign: 'center',
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: noir,
          cellPadding: 3.5,
          minCellHeight: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
        },
        styles: {
          lineColor: bleu,
          lineWidth: 0.3,
        },
        // Remplir des lignes vides pour ressembler au formulaire papier
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            data.cell.styles.minCellHeight = 6;
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY;

      // Lignes vides supplementaires pour remplir le tableau (comme le papier)
      const minTableEndY = 200;
      if (y < minTableEndY) {
        const emptyRows = Math.floor((minTableEndY - y) / 6);
        if (emptyRows > 0) {
          autoTable(doc, {
            startY: y,
            margin: { left: m, right: m },
            body: Array(emptyRows).fill(['', '', '', '']),
            theme: 'grid',
            showHead: false,
            bodyStyles: {
              fontSize: 9,
              textColor: noir,
              cellPadding: 3.5,
              minCellHeight: 7.5,
            },
            columnStyles: {
              0: { cellWidth: 22 },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 25 },
              3: { cellWidth: 25 },
            },
            styles: {
              lineColor: bleu,
              lineWidth: 0.3,
            },
          });
          y = (doc as any).lastAutoTable.finalY;
        }
      }

      // ========================================================
      // OBSERVATIONS ET DELAIS + TOTAUX
      // ========================================================
      y += 2;

      const obsW = contentW * 0.58;
      const totW = contentW * 0.38;
      const totX = pageW - m - totW;
      const blockH = 28;

      // Cadre Observations
      doc.setDrawColor(...bleu);
      doc.setLineWidth(0.3);
      doc.rect(m, y, obsW, blockH);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...bleu);
      doc.text('OBSERVATIONS ET DELAIS :', m + 2, y + 4.5);

      // Cadre Totaux
      const totalTTC = Number(order.total_price);
      const acompte = 0;
      const resteAPayer = totalTTC - acompte;

      const totFields: [string, string][] = [
        ['TOTAL TTC', `${totalTTC.toFixed(2)} EUR`],
        ['ACOMPTE', `${acompte.toFixed(2)} EUR`],
        ['RESTE A PAYER', `${resteAPayer.toFixed(2)} EUR`],
      ];

      let ty = y;
      for (let i = 0; i < totFields.length; i++) {
        const rowH = blockH / 3;
        // Label
        doc.setFillColor(i === 2 ? bleu[0] : 240, i === 2 ? bleu[1] : 240, i === 2 ? bleu[2] : 245);
        doc.rect(totX, ty, totW * 0.55, rowH, i === 2 ? 'F' : 'FD');
        doc.setDrawColor(...bleu);
        doc.rect(totX, ty, totW * 0.55, rowH);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(i === 2 ? 255 : bleu[0], i === 2 ? 255 : bleu[1], i === 2 ? 255 : bleu[2]);
        doc.text(totFields[i][0], totX + 2, ty + rowH / 2 + 1.5);

        // Valeur
        doc.rect(totX + totW * 0.55, ty, totW * 0.45, rowH);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...noir);
        doc.text(totFields[i][1], totX + totW - 2, ty + rowH / 2 + 1.5, { align: 'right' });

        ty += rowH;
      }

      // ========================================================
      // PIED DE PAGE LEGAL
      // ========================================================
      const footerY = pageH - 16;

      // Ligne de separation
      doc.setDrawColor(...bleu);
      doc.setLineWidth(0.5);
      doc.line(m, footerY, pageW - m, footerY);

      // Contact
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...bleu);
      doc.text('05.34.51.29.12 / 06.19.68.32.57', pageW / 2, footerY + 4, { align: 'center' });

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DECOSHOPTOULOUSE@GMAIL.COM', pageW / 2, footerY + 8, { align: 'center' });

      // Mentions legales
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...gris);
      doc.text(
        'IMMATRICULATION AU RCS, NUMERO 912 459 542 R.C.S. TOULOUSE    NOTRE TVA FR 32 912 459 542',
        pageW / 2,
        footerY + 12,
        { align: 'center' }
      );

      // ——— Telecharger ———
      doc.save(`${blNumber}.pdf`);
    } finally {
      setGenerating(false);
    }
  }, [order, fulfillment, items, blNumber, now, factureNumber, clientNom, clientPrenom, clientEmail, clientPhone, clientAdresse]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Apercu &mdash; Facture N&deg; {factureNumber}
            {fulfillment && <span className="text-gray-400"> (#{fulfillment.id})</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={generatePdf}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {generating ? 'Generation...' : 'Telecharger PDF'}
            </button>
            <button onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Fermer
            </button>
          </div>
        </div>

        {/* Preview content - replique visuelle du vrai BL DecoShop */}
        <div className="overflow-y-auto p-6 bg-white" style={{ color: '#111' }}>
          {/* Header */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#003399', fontFamily: 'Arial, sans-serif' }}>DECOSHOP</div>
                <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#666', marginTop: '-2px' }}>Mobilier design et tendance</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#003399', marginTop: '6px' }}>FACTURE N&deg; {factureNumber}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 700 }}>DATE: </span>
                <span style={{ fontSize: '11px' }}>{now}</span>
              </div>
            </div>
          </div>

          {/* Adresses + Client */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            {/* Adresses entreprise */}
            <div style={{ flex: '1', border: '1px solid #003399', padding: '10px', fontSize: '11px', lineHeight: '1.35' }}>
              <div style={{ fontWeight: 700, color: '#003399' }}>DECOSHOP TOULOUSE</div>
              <div>3 RUE EMILE BAUDOT, 31100 TOULOUSE</div>
              <div style={{ fontWeight: 700, color: '#003399', marginTop: '6px' }}>DECOSHOP PARIS</div>
              <div>RUE JEAN PIERRE TIMBAUD 78520 LIMAY</div>
            </div>
            {/* Client */}
            <div style={{ flex: '1', border: '1px solid #003399' }}>
              <div style={{ background: '#003399', color: 'white', textAlign: 'center', padding: '3px 0', fontWeight: 700, fontSize: '11px' }}>CLIENT</div>
              <div style={{ padding: '8px 10px', fontSize: '11px', lineHeight: '1.35' }}>
                <div style={{ display: 'flex', gap: '10px' }}><strong style={{ minWidth: '86px' }}>NOM</strong> <span style={{ color: '#111' }}>{clientNom}</span></div>
                <div style={{ display: 'flex', gap: '10px' }}><strong style={{ minWidth: '86px' }}>PRENOM</strong> <span style={{ color: '#111' }}>{clientPrenom}</span></div>
                <div style={{ display: 'flex', gap: '10px' }}><strong style={{ minWidth: '86px' }}>NUM PHONE</strong> <span style={{ color: '#111' }}>{clientPhone}</span></div>
                <div style={{ display: 'flex', gap: '10px' }}><strong style={{ minWidth: '86px' }}>ADRESSE</strong> <span style={{ color: '#111', wordBreak: 'break-word' }}>{clientAdresse}</span></div>
                <div style={{ display: 'flex', gap: '10px' }}><strong style={{ minWidth: '86px' }}>EMAIL</strong> <span style={{ color: '#111', wordBreak: 'break-word' }}>{clientEmail}</span></div>
              </div>
            </div>
          </div>

          {/* Table articles */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', border: '1px solid #003399' }}>
            <thead>
              <tr style={{ background: '#003399', color: 'white' }}>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textAlign: 'center', width: '60px', borderRight: '1px solid #6688bb' }}>QUANTITE</th>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textAlign: 'center', borderRight: '1px solid #6688bb' }}>DESIGNATION</th>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textAlign: 'center', width: '70px', borderRight: '1px solid #6688bb' }}>PRIX UNIT</th>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 700, textAlign: 'center', width: '70px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #ccd' }}>
                  <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'center', borderRight: '1px solid #ccd', color: '#111' }}>{item.quantity}</td>
                  <td style={{ padding: '6px 8px', fontSize: '11px', borderRight: '1px solid #ccd', color: '#111' }}>{item.title}</td>
                  <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'right', borderRight: '1px solid #ccd', color: '#111' }}>{Number(item.price).toFixed(2)}</td>
                  <td style={{ padding: '6px 8px', fontSize: '11px', textAlign: 'right', color: '#111' }}>{(Number(item.price) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Observations + Totaux */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: '1', border: '1px solid #003399', padding: '6px 8px', minHeight: '50px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#003399' }}>OBSERVATIONS ET DELAIS :</div>
            </div>
            <div style={{ width: '170px' }}>
              {[
                ['TOTAL TTC', Number(order.total_price).toFixed(2)],
                ['ACOMPTE', '0.00'],
                ['RESTE A PAYER', Number(order.total_price).toFixed(2)],
              ].map(([label, val], i) => (
                <div key={label} style={{ display: 'flex', borderBottom: '1px solid #003399' }}>
                  <div style={{ flex: '1', padding: '3px 4px', fontSize: '8px', fontWeight: 700, color: i === 2 ? 'white' : '#003399', background: i === 2 ? '#003399' : '#f0f0f5', borderRight: '1px solid #003399' }}>{label}</div>
                  <div style={{ width: '70px', padding: '3px 4px', fontSize: '9px', textAlign: 'right', fontWeight: 700 }}>{val} EUR</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer legal */}
          <div style={{ borderTop: '2px solid #003399', paddingTop: '8px', textAlign: 'center', marginTop: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#003399' }}>05.34.51.29.12 / 06.19.68.32.57</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#003399' }}>DECOSHOPTOULOUSE@GMAIL.COM</div>
            <div style={{ fontSize: '7px', color: '#666', marginTop: '2px' }}>IMMATRICULATION AU RCS, NUMERO 912 459 542 R.C.S. TOULOUSE &nbsp;&nbsp; NOTRE TVA FR 32 912 459 542</div>
          </div>
        </div>
      </div>
    </div>
  );
}
