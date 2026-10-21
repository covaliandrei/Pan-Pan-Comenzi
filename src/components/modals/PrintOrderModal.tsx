import React, { useRef, useMemo, useEffect } from 'react';
import { X, Printer, PackageCheck, ExternalLink } from 'lucide-react';
import { Order } from '../../types';
import { formatDateRomanian, formatMoldovaDateTime } from '../../lib/initialData';
import { generatePrintDocumentHtml } from '../../lib/printService';

interface PrintOrderModalProps {
  order: Order | null;
  batchOrders?: Order[];
  batchDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintOrderModal: React.FC<PrintOrderModalProps> = ({
  order,
  batchOrders,
  batchDate,
  isOpen,
  onClose,
}) => {
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const isBatch = Boolean(batchOrders && batchOrders.length > 0);

  const printBlobUrl = useMemo(() => {
    if (!isOpen || (!order && (!batchOrders || batchOrders.length === 0))) return null;
    const html = generatePrintDocumentHtml({ order, batchOrders, batchDate });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [isOpen, order, batchOrders, batchDate]);

  useEffect(() => {
    return () => {
      if (printBlobUrl) {
        URL.revokeObjectURL(printBlobUrl);
      }
    };
  }, [printBlobUrl]);

  if (!isOpen) return null;

  const handleOpenNewTab = () => {
    if (printBlobUrl) {
      window.open(printBlobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Container */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top actions bar */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base truncate">
              {isBatch
                ? `Foaie Producție pentru livrări (${formatDateRomanian(batchDate || '')})`
                : `Tipărire Comandă ${order?.orderNumber}`}
            </h3>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Primary Action: Open printable PDF in new browser tab */}
            {printBlobUrl ? (
              <a
                href={printBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-xs cursor-pointer text-decoration-none"
                title="Deschide documentul într-o filă nouă cu fereastra de imprimare / salvare PDF activată automat"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Tipar, sau salveaza in PDF</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Tipar, sau salveaza in PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area Preview */}
        <div
          ref={printableAreaRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 print:p-0 print:overflow-visible printable-area text-slate-800"
        >
          {isBatch ? (
            /* BATCH PRINT VIEW FOR PRODUCTION */
            <div>
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                      Pan Pan Comenzi
                    </h1>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      Raport & Foaie Livrare Producție
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold text-sm border border-slate-200">
                      Data Livrare: {formatDateRomanian(batchDate || '')}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      Generat la: {formatMoldovaDateTime(new Date())}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aggregated Totals */}
              <div className="mb-6 p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-amber-600" />
                    Totaluri Agregate Pregătit ({batchOrders?.length} comenzi)
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                    Centralizator producție & livrări
                  </span>
                </div>

                {(() => {
                  const productTotals: Record<
                    string,
                    { name: string; code: string; unit: string; totalOrdered: number; totalPicked: number }
                  > = {};

                  batchOrders?.forEach((o) => {
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

                  const itemsList = Object.values(productTotals).sort((a, b) => a.name.localeCompare(b.name));

                  if (itemsList.length === 0) {
                    return <div className="text-xs text-slate-400 py-3 text-center">Nu există articole agregate.</div>;
                  }

                  return (
                    <div className="space-y-3">
                      {/* Desktop / Tablet Table View */}
                      <div className="hidden sm:block overflow-x-auto border border-slate-200/90 rounded-xl bg-white shadow-xs">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3 w-20">Cod</th>
                              <th className="py-2.5 px-3">Denumire Produs</th>
                              <th className="py-2.5 px-3 text-center w-20">Unitate</th>
                              <th className="py-2.5 px-3 text-right w-32">Necesar Comandat</th>
                              <th className="py-2.5 px-3 text-right w-32">Pregătit / Livrat</th>
                              <th className="py-2.5 px-3 text-center w-28">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {itemsList.map((val, idx) => {
                              const isDone = val.totalPicked >= val.totalOrdered && val.totalOrdered > 0;
                              const isPartial = val.totalPicked > 0 && val.totalPicked < val.totalOrdered;

                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                                  <td className="py-2 px-3 font-mono text-slate-500 font-semibold">{val.code || '-'}</td>
                                  <td className="py-2 px-3 font-bold text-slate-900">{val.name}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                                      {val.unit}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-xs font-black text-slate-950">
                                    {val.totalOrdered} <span className="text-[11px] font-normal text-slate-500">{val.unit}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right text-xs font-black">
                                    <span className={isDone ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-400'}>
                                      {val.totalPicked} <span className="text-[11px] font-normal text-slate-500">{val.unit}</span>
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    {isDone ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        Pregătit 100%
                                      </span>
                                    ) : isPartial ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        În lucru
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                        În așteptare
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile-Friendly List View */}
                      <div className="block sm:hidden space-y-2">
                        {itemsList.map((val, idx) => {
                          const isDone = val.totalPicked >= val.totalOrdered && val.totalOrdered > 0;
                          const isPartial = val.totalPicked > 0 && val.totalPicked < val.totalOrdered;

                          return (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  {val.code && (
                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                                      {val.code}
                                    </span>
                                  )}
                                  <span className="font-bold text-slate-900">{val.name}</span>
                                </div>
                                <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded shrink-0">
                                  {val.unit}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-slate-600">
                                <div>
                                  Necesar: <strong className="text-slate-900">{val.totalOrdered} {val.unit}</strong>
                                </div>
                                <div>
                                  Pregătit:{' '}
                                  <strong className={isDone ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-slate-600'}>
                                    {val.totalPicked} {val.unit}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Orders breakdown */}
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">
                Comenzile Magazinelor / Punctelor de Livrare
              </h4>
              <div className="space-y-6">
                {batchOrders?.map((ord) => (
                  <div key={ord.id} className="border border-slate-200 rounded-2xl p-4 bg-white">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                      <div>
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs mr-2">
                          {ord.orderNumber}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{ord.clientName}</span>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500">Stare: </span>
                        <span className="font-semibold uppercase text-slate-700">{ord.state}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[420px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <th className="py-1.5 px-2">Cod</th>
                            <th className="py-1.5 px-2">Produs</th>
                            <th className="py-1.5 px-2 text-center">Unitate</th>
                            <th className="py-1.5 px-2 text-right">Comandat</th>
                            <th className="py-1.5 px-2 text-right">Pregătit / Livrat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ord.items.map((it, itemIdx) => {
                            const isOrdClosed = ord.state === 'inchis';
                            const hasPicked = typeof it.pickedQuantity === 'number' && it.pickedQuantity > 0;
                            const finalQty = isOrdClosed
                              ? (it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity)
                              : it.orderedQuantity;
                            const isDiff = isOrdClosed && it.pickedQuantity !== undefined && it.pickedQuantity !== it.orderedQuantity;

                            return (
                              <tr key={itemIdx}>
                                <td className="py-1 px-2 font-mono text-slate-500">{it.productCode || '-'}</td>
                                <td className="py-1 px-2 font-medium text-slate-800">{it.productName}</td>
                                <td className="py-1 px-2 text-center text-slate-500">{it.unit}</td>
                                <td className="py-1 px-2 text-right font-medium text-slate-700">
                                  {it.orderedQuantity} {it.unit}
                                </td>
                                <td className="py-1 px-2 text-right">
                                  {isOrdClosed ? (
                                    <span className="font-bold text-emerald-700">
                                      {finalQty} {it.unit}
                                      {isDiff && <span className="text-[10px] font-normal text-amber-700 ml-1">(ajustat)</span>}
                                    </span>
                                  ) : hasPicked ? (
                                    <span className="font-bold text-amber-700">
                                      {it.pickedQuantity} {it.unit}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">În așteptare cântărire</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {ord.notes && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic border border-slate-100">
                        <span className="font-semibold not-italic">Notă:</span> {ord.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : order ? (
            /* INDIVIDUAL ORDER VIEW */
            <div>
              <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                    Pan Pan Comenzi
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Brutărie & Panificație | Chișinău, Republica Moldova | Tel: 061 030 063
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-base bg-slate-900 text-white px-3 py-1 rounded-lg inline-block">
                    {order.orderNumber}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Generat la: {formatMoldovaDateTime(new Date())}
                  </p>
                </div>
              </div>

              {/* Order Info Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Destinatar (Punct de Livrare)
                  </span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {order.clientName}
                  </span>
                  <span className="text-xs text-slate-600 font-mono block mt-0.5">
                    {order.clientEmail}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Data Livrare
                  </span>
                  <span className="text-sm font-bold text-amber-900 block mt-0.5">
                    {formatDateRomanian(order.deliveryDate)}
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Data comenzii: {formatDateRomanian(order.orderDate)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700">
                    <th className="py-2 px-2.5">Cod</th>
                    <th className="py-2 px-2.5">Produs</th>
                    <th className="py-2 px-2.5 text-center">Unitate</th>
                    <th className="py-2 px-2.5 text-right">Preț unitar</th>
                    <th className="py-2 px-2.5 text-right">Comandat</th>
                    <th className="py-2 px-2.5 text-right">Pregătit / Livrat</th>
                    <th className="py-2 px-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((it, idx) => {
                    const isOrderClosed = order.state === 'inchis';
                    const hasPicked = typeof it.pickedQuantity === 'number' && it.pickedQuantity > 0;
                    const finalQty = isOrderClosed
                      ? (it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity)
                      : it.orderedQuantity;
                    const isDiff = isOrderClosed && it.pickedQuantity !== undefined && it.pickedQuantity !== it.orderedQuantity;
                    const rowTotal = it.itemTotal || (finalQty * it.unitPrice);

                    return (
                      <tr key={idx}>
                        <td className="py-2 px-2.5 font-mono text-slate-500">{it.productCode || '-'}</td>
                        <td className="py-2 px-2.5 font-medium text-slate-900">{it.productName}</td>
                        <td className="py-2 px-2.5 text-center text-slate-500">{it.unit}</td>
                        <td className="py-2 px-2.5 text-right text-slate-600">{it.unitPrice.toFixed(2)} lei</td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700">
                          {it.orderedQuantity} {it.unit}
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          {isOrderClosed ? (
                            <span className="font-bold text-emerald-700">
                              {finalQty} {it.unit}
                              {isDiff && <span className="text-[10px] font-normal text-amber-700 ml-1">(ajustat)</span>}
                            </span>
                          ) : hasPicked ? (
                            <span className="font-bold text-amber-700">
                              {it.pickedQuantity} {it.unit} <span className="text-[10px] font-normal">(în lucru)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">În așteptare cântărire</span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900">{rowTotal.toFixed(2)} lei</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Total & Notes */}
              <div className="flex justify-between items-start pt-2 border-t border-slate-200">
                <div className="max-w-md">
                  {order.notes && (
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <span className="font-bold text-slate-800">Observații:</span> {order.notes}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total de plată:</span>
                  <span className="text-xl font-black text-slate-950">
                    {order.totalAmount.toFixed(2)} lei
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-dashed border-slate-200 text-xs text-slate-500">
                <div className="text-center">
                  <div className="border-b border-slate-300 h-10 mb-2"></div>
                  <span>Predat Producție / Livrator</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-300 h-10 mb-2"></div>
                  <span>Primit Destinatar (Semnătură / Ștampilă)</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
