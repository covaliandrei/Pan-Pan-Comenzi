import React from 'react';
import { X, Printer, PackageCheck, Calendar, MapPin, Hash } from 'lucide-react';
import { Order } from '../../types';
import { formatDateRomanian } from '../../lib/initialData';

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
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isBatch = !!batchOrders && batchOrders.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Container */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top actions bar - hidden during print */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-base">
              {isBatch ? `Foaie Producție & Coacere (${formatDateRomanian(batchDate || '')})` : `Tipărire Comandă ${order?.orderNumber}`}
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-medium text-sm rounded-xl transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Tipărește</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible printable-area text-slate-800">
          {isBatch ? (
            /* BATCH PRINT VIEW FOR PRODUCTION */
            <div>
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                      Pan Pan Comenzi - Brutărie Artizanală
                    </h1>
                    <p className="text-sm text-slate-600 mt-1 font-medium">
                      Raport & Foaie de Coacere / Livrare Producție
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded font-semibold text-sm">
                      Data Livrare: {formatDateRomanian(batchDate || '')}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">Generat la: {new Date().toLocaleString('ro-RO')}</p>
                  </div>
                </div>
              </div>

              {/* Aggregated Totals */}
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-amber-600" />
                  Totaluri Agregate de Copt / Pregătit ({batchOrders?.length} comenzi)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(() => {
                    const productTotals: Record<string, { name: string; unit: string; totalOrdered: number; totalPicked: number }> = {};
                    batchOrders?.forEach((o) => {
                      o.items.forEach((item) => {
                        if (!productTotals[item.productId]) {
                          productTotals[item.productId] = {
                            name: item.productName,
                            unit: item.unit,
                            totalOrdered: 0,
                            totalPicked: 0,
                          };
                        }
                        productTotals[item.productId].totalOrdered += item.orderedQuantity;
                        productTotals[item.productId].totalPicked += item.pickedQuantity || item.orderedQuantity;
                      });
                    });

                    return Object.entries(productTotals).map(([key, val]) => (
                      <div key={key} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-900 truncate">{val.name}</div>
                        <div className="text-slate-600 mt-1">
                          Necesar: <span className="font-bold text-slate-900">{val.totalOrdered} {val.unit}</span>
                          {val.totalPicked !== val.totalOrdered && (
                            <span className="ml-1 text-emerald-700">| Pregătit: {val.totalPicked} {val.unit}</span>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Detailed Orders Breakdown */}
              <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                Detaliu Comenzi per Punct de Lucru
              </h4>

              <div className="space-y-6">
                {batchOrders?.map((ord) => (
                  <div key={ord.id} className="border border-slate-200 rounded-xl p-4 bg-white break-inside-avoid">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
                      <div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mr-2">
                          {ord.orderNumber}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{ord.clientName}</span>
                      </div>
                      <span className="text-xs text-slate-600">
                        Stare: <span className="font-semibold uppercase">{ord.state}</span>
                      </span>
                    </div>

                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-medium">
                          <th className="py-1">Produs</th>
                          <th className="py-1 text-center">Unitate</th>
                          <th className="py-1 text-right">Comandat</th>
                          <th className="py-1 text-right">Pregătit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ord.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium text-slate-800">{it.productName}</td>
                            <td className="py-1 text-center text-slate-500">{it.unit}</td>
                            <td className="py-1 text-right font-semibold text-slate-700">{it.orderedQuantity}</td>
                            <td className="py-1 text-right font-bold text-slate-950">
                              {it.pickedQuantity !== undefined ? it.pickedQuantity : it.orderedQuantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {ord.notes && (
                      <p className="mt-2 text-xs italic text-slate-500 bg-slate-50 p-1.5 rounded">
                        Notă: {ord.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : order ? (
            /* SINGLE ORDER PRINT VIEW (AVIZ / NOTĂ DE LIVRARE) */
            <div>
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                    Pan Pan Comenzi
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                    Brutărie Artizanală & Panificație
                  </p>
                  <p className="text-xs text-slate-600 mt-1">Tel: 0722 000 111 | comenzi@panpan.ro</p>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-950 text-white px-3 py-1 rounded text-xs font-mono font-bold tracking-wide">
                    {order.orderNumber}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Stare: <span className="font-bold uppercase text-slate-800">{order.state}</span>
                  </p>
                </div>
              </div>

              {/* Order & Client Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-700" />
                    Destinatar (Punct de Lucru)
                  </h5>
                  <p className="text-sm font-bold text-slate-900">{order.clientName}</p>
                  <p className="text-slate-600 mt-0.5">{order.clientEmail}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-700" />
                    Detalii Livrare
                  </h5>
                  <p className="text-slate-700">
                    Data comenzii: <span className="font-medium text-slate-900">{formatDateRomanian(order.orderDate)}</span>
                  </p>
                  <p className="text-slate-700 mt-0.5">
                    Data livrării:{' '}
                    <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {formatDateRomanian(order.deliveryDate)}
                    </span>
                  </p>
                  {order.pickedByName && (
                    <p className="text-slate-600 mt-1">
                      Pregătit de: <span className="font-medium text-slate-800">{order.pickedByName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase font-semibold">
                      <th className="py-2.5 px-3">Nr.</th>
                      <th className="py-2.5 px-3">Cod</th>
                      <th className="py-2.5 px-3">Denumire Produs</th>
                      <th className="py-2.5 px-3 text-center">Unitate</th>
                      <th className="py-2.5 px-3 text-right">Comandat</th>
                      <th className="py-2.5 px-3 text-right">Pregătit / Livrat</th>
                      <th className="py-2.5 px-3 text-right">Preț Unitar</th>
                      <th className="py-2.5 px-3 text-right">Valoare (lei)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {order.items.map((item, idx) => {
                      const finalQty = item.pickedQuantity !== undefined ? item.pickedQuantity : item.orderedQuantity;
                      const lineTotal = item.unitPrice * finalQty;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{item.productCode}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.productName}</td>
                          <td className="py-2 px-3 text-center font-medium text-slate-600">{item.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-600 font-medium">{item.orderedQuantity}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-950">
                            {finalQty}
                            {item.pickedQuantity !== item.orderedQuantity && (
                              <span className="text-amber-700 text-[10px] ml-1 font-normal">*ajustat</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{item.unitPrice.toFixed(2)} lei</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{lineTotal.toFixed(2)} lei</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-900">
                      <td colSpan={7} className="py-3 px-3 text-right font-bold text-slate-800 uppercase text-xs">
                        Total Valoare Comandă:
                      </td>
                      <td className="py-3 px-3 text-right text-base font-black text-slate-950">
                        {order.totalAmount.toFixed(2)} lei
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="mb-6 p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-slate-700">
                  <span className="font-bold text-amber-900">Mențiuni / Instrucțiuni Livrare: </span>
                  {order.notes}
                </div>
              )}

              {/* Signatures for delivery */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 mt-12 text-xs">
                <div className="text-center">
                  <p className="font-semibold text-slate-700">Predat Producție / Expeditor:</p>
                  <div className="h-14 border-b border-dashed border-slate-400 mt-2"></div>
                  <p className="text-slate-400 text-[11px] mt-1">Semnătură & Ștampilă</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">Primit Punct de Vânzare / Beneficiar:</p>
                  <div className="h-14 border-b border-dashed border-slate-400 mt-2"></div>
                  <p className="text-slate-400 text-[11px] mt-1">Nume & Semnătură Recepție</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
