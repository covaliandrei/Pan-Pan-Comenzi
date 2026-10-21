import { Order } from '../types';
import { formatDateRomanian, formatMoldovaDateTime } from './initialData';

export function generatePrintDocumentHtml(params: {
  order?: Order | null;
  batchOrders?: Order[];
  batchDate?: string;
}): string {
  const { order, batchOrders, batchDate } = params;
  const isBatch = Boolean(batchOrders && batchOrders.length > 0);
  const nowStr = formatMoldovaDateTime(new Date());

  const title = isBatch
    ? `Foaie Producție pentru livrări - ${formatDateRomanian(batchDate || '')}`
    : `Aviz Comandă ${order?.orderNumber || ''}`;

  let bodyContent = '';

  if (isBatch && batchOrders) {
    // Calculate aggregates
    const productTotals: Record<
      string,
      { name: string; code: string; unit: string; totalOrdered: number; totalPicked: number }
    > = {};

    batchOrders.forEach((o) => {
      o.items.forEach((item) => {
        const codeKey = (item.productCode || '').trim();
        const nameKey = (item.productName || '').trim().toLowerCase();

        const existingKey = Object.keys(productTotals).find((k) => {
          const existing = productTotals[k];
          if (codeKey && existing.code && existing.code.toLowerCase() === codeKey.toLowerCase()) return true;
          if (nameKey && existing.name.trim().toLowerCase() === nameKey) return true;
          return false;
        });

        const key = existingKey || (codeKey ? `code:${codeKey}` : `name:${nameKey}`);

        if (!productTotals[key]) {
          productTotals[key] = {
            name: item.productName,
            code: item.productCode || '',
            unit: item.unit || 'buc',
            totalOrdered: 0,
            totalPicked: 0,
          };
        }
        if (!productTotals[key].code && item.productCode) {
          productTotals[key].code = item.productCode;
        }
        productTotals[key].totalOrdered = Number((productTotals[key].totalOrdered + Number(item.orderedQuantity || 0)).toFixed(2));
        const picked =
          typeof item.pickedQuantity === 'number'
            ? item.pickedQuantity
            : o.state === 'inchis'
            ? item.orderedQuantity
            : 0;
        productTotals[key].totalPicked = Number((productTotals[key].totalPicked + Number(picked || 0)).toFixed(2));
      });
    });

    const aggregatesRows = Object.values(productTotals)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (agg, idx) => `
        <tr>
          <td style="text-align: center; width: 35px; color: #64748b;">${idx + 1}</td>
          <td style="font-family: monospace; font-size: 11px; width: 70px; color: #475569;">${agg.code || '-'}</td>
          <td style="font-weight: 600; color: #0f172a;">${agg.name}</td>
          <td style="text-align: center; width: 60px; color: #475569;">${agg.unit}</td>
          <td style="text-align: right; width: 110px; font-weight: bold; font-size: 13px; color: #0f172a;">${agg.totalOrdered} ${agg.unit}</td>
          <td style="text-align: right; width: 110px; font-weight: bold; color: ${agg.totalPicked !== agg.totalOrdered ? '#b45309' : '#047857'};">
            ${agg.totalPicked} ${agg.unit}
          </td>
        </tr>
      `
      )
      .join('');

    const ordersBlocks = batchOrders
      .map(
        (ord, ordIdx) => `
        <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 18px; page-break-inside: avoid; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
            <div>
              <span style="font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 8px;">
                ${ord.orderNumber}
              </span>
              <strong style="font-size: 14px; color: #0f172a;">${ord.clientName}</strong>
              ${ord.clientEmail ? `<span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${ord.clientEmail})</span>` : ''}
            </div>
            <div style="font-size: 11px; color: #475569;">
              Stare: <strong style="text-transform: uppercase;">${ord.state}</strong>
              ${ord.pickedByName ? ` | Picker: <strong>${ord.pickedByName}</strong>` : ''}
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1; color: #334155;">
                <th style="padding: 6px 8px; text-align: left; width: 30px;">#</th>
                <th style="padding: 6px 8px; text-align: left; width: 70px;">Cod</th>
                <th style="padding: 6px 8px; text-align: left;">Denumire Produs</th>
                <th style="padding: 6px 8px; text-align: center; width: 50px;">Unitate</th>
                <th style="padding: 6px 8px; text-align: right; width: 80px;">Comandat</th>
                <th style="padding: 6px 8px; text-align: right; width: 90px;">Pregătit / Livrat</th>
              </tr>
            </thead>
            <tbody>
              ${ord.items
                .map(
                  (it, itIdx) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 5px 8px; color: #94a3b8;">${itIdx + 1}</td>
                  <td style="padding: 5px 8px; font-family: monospace; color: #64748b;">${it.productCode || '-'}</td>
                  <td style="padding: 5px 8px; font-weight: 500; color: #0f172a;">${it.productName}</td>
                  <td style="padding: 5px 8px; text-align: center; color: #64748b;">${it.unit}</td>
                  <td style="padding: 5px 8px; text-align: right; font-weight: bold; color: #0f172a;">${it.orderedQuantity}</td>
                  <td style="padding: 5px 8px; text-align: right; font-weight: bold; color: #047857;">
                    ${ord.state === 'inchis'
                      ? (it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity)
                      : typeof it.pickedQuantity === 'number' && it.pickedQuantity > 0
                      ? it.pickedQuantity
                      : '<span style="color: #94a3b8; font-style: italic; font-weight: normal; font-size: 10px;">În așteptare cântărire</span>'}
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          ${
            ord.notes
              ? `<div style="margin-top: 8px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 11px; color: #78350f;">
                  <strong>Notă magazin / livrare:</strong> ${ord.notes}
                </div>`
              : ''
          }
        </div>
      `
      )
      .join('');

    bodyContent = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; color: #0f172a;">
            Pan Pan Comenzi
          </h1>
          <p style="font-size: 14px; color: #475569; margin: 4px 0 0 0; font-weight: 600;">
            Raport & Foaie Livrare Producție (Moldova / Chișinău)
          </p>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; padding: 4px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: bold; font-size: 13px; color: #0f172a;">
            Data Livrare: ${batchDate?.includes('–') || batchDate?.includes('Toate') ? batchDate : formatDateRomanian(batchDate || '')}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            Generat la: ${nowStr}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 22px; page-break-inside: avoid;">
        <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; color: #0f172a;">
          Totaluri Agregate Pregătit (${batchOrders.length} comenzi active)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; background: #fff;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #1e293b; text-align: left;">
              <th style="padding: 7px 10px; width: 35px; text-align: center;">#</th>
              <th style="padding: 7px 10px; width: 70px;">Cod</th>
              <th style="padding: 7px 10px;">Denumire Produs</th>
              <th style="padding: 7px 10px; text-align: center; width: 60px;">Unitate</th>
              <th style="padding: 7px 10px; text-align: right; width: 110px;">Total Necesar</th>
              <th style="padding: 7px 10px; text-align: right; width: 110px;">Total Pregătit</th>
            </tr>
          </thead>
          <tbody style="divide-y: 1px solid #e2e8f0;">
            ${aggregatesRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 26px;">
        <h3 style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; color: #0f172a;">
          Detaliu Comenzi per Punct de Livrare
        </h3>
        ${ordersBlocks}
      </div>
    `;
  } else if (order) {
    const isClosed = order.state === 'inchis';
    const finalAmount = order.totalAmount;

    const itemsRows = order.items
      .map((it, idx) => {
        const qty = isClosed && it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity;
        const total = it.itemTotal || Number((qty * it.unitPrice).toFixed(2));
        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 10px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 10px; font-family: monospace; font-size: 11px; color: #475569;">${it.productCode || '-'}</td>
          <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${it.productName}</td>
          <td style="padding: 7px 10px; text-align: center; color: #64748b;">${it.unit}</td>
          <td style="padding: 7px 10px; text-align: right; color: #334155;">${it.unitPrice.toFixed(2)} lei</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: bold; color: #0f172a;">${it.orderedQuantity}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: bold; color: #047857;">
            ${isClosed
              ? (it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity)
              : typeof it.pickedQuantity === 'number' && it.pickedQuantity > 0
              ? it.pickedQuantity
              : '<span style="color: #94a3b8; font-style: italic; font-weight: normal; font-size: 11px;">În așteptare cântărire</span>'}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: bold; color: #0f172a;">
            ${total.toFixed(2)} lei
          </td>
        </tr>
      `;
      })
      .join('');

    bodyContent = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; margin: 0; color: #0f172a;">
            Pan Pan Comenzi
          </h1>
          <p style="font-size: 13px; color: #475569; margin: 3px 0 0 0; font-weight: 600;">
            Brutărie & Panificație | Chișinău, Republica Moldova | Tel: 061 030 063
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-family: monospace; font-size: 16px; font-weight: 900; background: #0f172a; color: #fff; padding: 4px 12px; border-radius: 6px; display: inline-block;">
            ${order.orderNumber}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
            Generat la: ${nowStr}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 14px; margin-bottom: 18px;">
        <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">
            Destinatar (Punct de Livrare)
          </div>
          <div style="font-size: 14px; font-weight: bold; color: #0f172a;">${order.clientName}</div>
          ${order.clientEmail ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">Email: ${order.clientEmail}</div>` : ''}
        </div>

        <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">
            Informații Livrare & Dată
          </div>
          <div style="font-size: 12px; color: #334155;">
            Data comenzii: <strong>${formatDateRomanian(order.orderDate)}</strong>
          </div>
          <div style="font-size: 13px; color: #0f172a; margin-top: 2px;">
            Data livrării: <strong style="color: #b45309;">${formatDateRomanian(order.deliveryDate)}</strong>
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Stare: <strong style="text-transform: uppercase;">${order.state}</strong>
            ${order.pickedByName ? ` | Operator: <strong>${order.pickedByName}</strong>` : ''}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1; background: #fff;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #1e293b; text-align: left;">
              <th style="padding: 7px 10px; text-align: center; width: 35px;">#</th>
              <th style="padding: 7px 10px; width: 70px;">Cod</th>
              <th style="padding: 7px 10px;">Produs</th>
              <th style="padding: 7px 10px; text-align: center; width: 50px;">Unitate</th>
              <th style="padding: 7px 10px; text-align: right; width: 80px;">Preț Unitar</th>
              <th style="padding: 7px 10px; text-align: right; width: 75px;">Comandat</th>
              <th style="padding: 7px 10px; text-align: right; width: 75px;">Livrat</th>
              <th style="padding: 7px 10px; text-align: right; width: 90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 18px;">
        <div style="width: 260px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: #0f172a;">
            <span>Total De Plată:</span>
            <span>${finalAmount.toFixed(2)} lei</span>
          </div>
        </div>
      </div>

      ${
        order.notes
          ? `<div style="margin-bottom: 20px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; font-size: 11px; color: #78350f;">
              <strong>Observații / Mențiuni de livrare:</strong> ${order.notes}
            </div>`
          : ''
      }

      <div style="margin-top: 36px; padding-top: 18px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #475569;">
        <div style="width: 220px; text-align: center;">
          <div style="border-bottom: 1px solid #94a3b8; height: 35px;"></div>
          <div style="margin-top: 6px; font-weight: 600;">Predat Producție / Livrator</div>
        </div>
        <div style="width: 220px; text-align: center;">
          <div style="border-bottom: 1px solid #94a3b8; height: 35px;"></div>
          <div style="margin-top: 6px; font-weight: 600;">Primit Destinatar (Semnătură / Ștampilă)</div>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    .page-container {
      max-width: 900px;
      margin: 20px auto;
      background: #ffffff;
      padding: 32px 36px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06);
      border-radius: 12px;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .page-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      @page {
        size: auto;
        margin: 12mm;
      }
    }
  </style>
  <script>
    window.addEventListener('load', function() {
      // Small timeout to allow styles to settle, then automatically open print / save as PDF prompt
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.warn('Auto print was blocked:', e);
        }
      }, 400);
    });
  </script>
</head>
<body>
  <!-- On-Screen Action Toolbar (Hidden in Print) -->
  <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #0f172a; color: #fff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">🥖</span>
      <div>
        <div style="font-weight: 800; font-size: 13px; letter-spacing: 0.3px;">Pan Pan Comenzi - Foaie Tipăribilă / PDF</div>
        <div style="font-size: 11px; color: #94a3b8;">Pentru a descărca PDF, selectați opțiunea "Save as PDF" în fereastra de imprimare.</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; border: none; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;">
        <span>🖨️</span> Tipărește / Salvează PDF
      </button>
      <button onclick="window.close()" style="background: #334155; color: #fff; border: none; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 12px;">
        Închide Fila
      </button>
    </div>
  </div>

  <div class="page-container">
    ${bodyContent}
  </div>
</body>
</html>`;
}
