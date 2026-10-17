import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ProductUnit } from '../../types';
import { collection, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { cleanFirestorePayload } from '../../lib/sanitizer';

interface ParsedRow {
  code: string;
  name: string;
  unit: ProductUnit;
  category: string;
  price: number;
  description: string;
  active: boolean;
  isValid: boolean;
  errors: string[];
}

interface CsvProductImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CsvProductImport: React.FC<CsvProductImportProps> = ({ onSuccess, onCancel }) => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const sampleCsvContent = `cod,denumire,unitate,categorie,pret,descriere,activ
PA-101,Pâine cu Semințe de Dovleac,buc,Pâine Artizanală,0,Pâine cu maia și semințe coapte de dovleac,true
BG-102,Baghetă Rustică cu Ceapă Caramelizată,buc,Specialități,0,Baghetă aromată cu bucățele de ceapă dulce,true
PL-103,Plăcintă cu Vișine și Griș,kg,Patiserie Dulce,0,Foi subțiri umplute cu vișine acrișoare,true
PK-104,Pâine Țărănească la Vatră,kg,Pâine la Kilogram,0,Pâine rotundă la vatră coaptă pe vatră de șamotă,true`;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'model_produse_panpan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvText = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    // Detect delimiter (, or ;)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    const header = headerLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim()) continue;

      // Basic split taking care of simple quoted tokens
      const parts = raw.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));

      const getVal = (colName: string): string => {
        const idx = header.indexOf(colName);
        return idx >= 0 && parts[idx] ? parts[idx] : '';
      };

      const code = getVal('cod') || parts[0] || '';
      const name = getVal('denumire') || getVal('nume') || parts[1] || '';
      const rawUnit = (getVal('unitate') || parts[2] || 'buc').toLowerCase();
      const unit: ProductUnit = rawUnit.includes('kg') ? 'kg' : 'buc';
      const category = getVal('categorie') || parts[3] || 'Pâine Artizanală';
      const priceRaw = (getVal('pret') || getVal('preț') || parts[4] || '0').replace(',', '.');
      const price = parseFloat(priceRaw) || 0;
      const description = getVal('descriere') || parts[5] || '';
      const activeStr = (getVal('activ') || parts[6] || 'true').toLowerCase();
      const active = activeStr === 'true' || activeStr === '1' || activeStr === 'da';

      const errors: string[] = [];
      if (!name) errors.push('Denumire lipsă');
      if (!code) errors.push('Cod lipsă');
      if (price < 0 || isNaN(price)) errors.push('Preț invalid (negativ)');

      parsed.push({
        code: code.toUpperCase(),
        name,
        unit,
        category,
        price,
        description,
        active,
        isValid: errors.length === 0,
        errors,
      });
    }

    setRows(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    try {
      setIsImporting(true);
      let addedCount = 0;
      let updatedCount = 0;

      const productsRef = collection(db, 'products');

      for (const row of validRows) {
        // Check if product with this code already exists
        const q = query(productsRef, where('code', '==', row.code));
        const existingSnap = await getDocs(q);

        const prodData = cleanFirestorePayload({
          code: row.code,
          name: row.name,
          unit: row.unit,
          category: row.category,
          price: row.price,
          description: row.description || '',
          active: row.active,
          updatedAt: new Date().toISOString(),
        });

        if (!existingSnap.empty) {
          // Update existing
          const docId = existingSnap.docs[0].id;
          await updateDoc(existingSnap.docs[0].ref, prodData);
          updatedCount++;
        } else {
          // Create new
          await addDoc(productsRef, {
            ...prodData,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }

      setImportSummary(`Import finalizat cu succes! ${addedCount} produse adăugate, ${updatedCount} actualizate.`);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Eroare la importul din CSV:', err);
      setImportSummary('Eroare la import. Verificați conexiunea la baza de date.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      {/* Title & Template Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            Import Produse din Fișier CSV
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Încărcați lista de produse de brutărie direct dintr-un fișier Excel / CSV (separat prin virgulă sau punct și virgulă).
          </p>
        </div>

        <button
          type="button"
          onClick={downloadSampleCsv}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Descarcă Model CSV</span>
        </button>
      </div>

      {/* Upload Box */}
      {rows.length === 0 ? (
        <div className="mt-6 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-2xl p-8 text-center transition bg-slate-50/50">
          <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-800 text-sm">Selectați fișierul CSV de pe computer</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Coloane recunoscute: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">cod, denumire, unitate, categorie, pret, descriere, activ</code>
          </p>

          <label className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>Alege Fișier CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        /* Preview Table */
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Fișier: <strong className="text-slate-900">{fileName}</strong> —{' '}
              <span className="text-emerald-600 font-semibold">{rows.filter((r) => r.isValid).length} valide</span>,{' '}
              <span className="text-rose-600 font-semibold">{rows.filter((r) => !r.isValid).length} invalide</span>
            </div>

            <button
              onClick={() => {
                setRows([]);
                setFileName('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Încarcă alt fișier
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Cod</th>
                  <th className="py-2.5 px-3">Denumire</th>
                  <th className="py-2.5 px-3 text-center">Unitate</th>
                  <th className="py-2.5 px-3">Categorie</th>
                  <th className="py-2.5 px-3 text-right">Preț (lei)</th>
                  <th className="py-2.5 px-3">Erori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                    <td className="py-2 px-3">
                      {row.isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.code}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{row.name}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {row.unit}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.category}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {row.price.toFixed(2)} lei
                    </td>
                    <td className="py-2 px-3 text-rose-600 font-medium text-[11px]">
                      {row.errors.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importSummary && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              {importSummary}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || rows.filter((r) => r.isValid).length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>{isImporting ? 'Se importă...' : `Confirmă Importul (${rows.filter((r) => r.isValid).length} produse)`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
