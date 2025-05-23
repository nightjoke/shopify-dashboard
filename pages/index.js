import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [view, setView] = useState('products');
  const [collections, setCollections] = useState([]);
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    fetch(`/api/orders?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => setStats(data));

    fetch(`/api/products?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => setProducts(data.products));

    fetch(`/api/collections?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => setCollections(data.collections));
  }, [startDate, endDate]);

  return (
    <main className="p-8 font-sans min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Shopify Dashboard</h1>

      {/* Date Picker */}
      <div className="flex flex-wrap gap-6 mb-8 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fra</label>
          <DatePicker selected={startDate} onChange={setStartDate} dateFormat="yyyy-MM-dd" className="border rounded px-3 py-2 w-40" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Til</label>
          <DatePicker selected={endDate} onChange={setEndDate} dateFormat="yyyy-MM-dd" className="border rounded px-3 py-2 w-40" />
        </div>
      </div>

      {/* Statbokser */}
      {stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <StatBox title="Ordre" value={stats.totalOrders} />
            <StatBox title="Totalt salg" value={`${stats.totalSales.toFixed(2)} kr`} />
            <StatBox title="Snittverdi per ordre" value={`${stats.avgOrderValue.toFixed(2)} kr`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <StatBox title="Retur" value={`${(stats.totalReturns ?? 0).toFixed(2)} kr`} />
            <StatBox title="Fraktkostnad" value={`${(stats.totalShipping ?? 0).toFixed(2)} kr`} />
            <StatBox title="MVA (Taxes)" value={`${(stats.totalTaxes ?? 0).toFixed(2)} kr`} />
            <StatBox title="Rabatt" value={`${(stats.totalDiscounts ?? 0).toFixed(2)} kr`} />
          </div>
        </div>
      ) : (
        <p>Laster data fra Shopify...</p>
      )}

      {/* View Toggle */}
      <div className="flex gap-4 mt-10 mb-6">
        <button type="button" className={`px-4 py-2 rounded ${view === 'products' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setView('products')}>Produkter</button>
        <button type="button" className={`px-4 py-2 rounded ${view === 'collections' ? 'bg-blue-600 text-white' : 'bg-white border'}`} onClick={() => setView('collections')}>Collections</button>
      </div>

      {/* Produkttabell */}
      {view === 'products' && products.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Salg per produktvariant</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded shadow-sm text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2 border-b">Produkt</th>
                  <th className="px-4 py-2 border-b">Variant</th>
                  <th className="px-4 py-2 border-b">Antall solgt</th>
                  <th className="px-4 py-2 border-b">Totalt salg</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{p.title}</td>
                    <td className="px-4 py-2 border-b">{p.variantTitle}</td>
                    <td className="px-4 py-2 border-b">{p.totalSold}</td>
                    <td className="px-4 py-2 border-b">{(p.costPerUnit * p.totalSold).toFixed(2)} kr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collectionstabell */}
      {view === 'collections' && collections.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-4">Salg per collection</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded shadow-sm text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-4 py-2 border-b">Collection</th>
                  <th className="px-4 py-2 border-b">Antall solgt</th>
                  <th className="px-4 py-2 border-b">Totalt salg</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">{c.title}</td>
                    <td className="px-4 py-2 border-b">{c.totalSold}</td>
                    <td className="px-4 py-2 border-b">{c.totalRevenue.toFixed(2)} kr</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

function StatBox({ title, value }) {
  return (
    <div className="bg-white border shadow-sm rounded-lg p-6">
      <h2 className="text-gray-500 text-sm font-medium mb-2">{title}</h2>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}