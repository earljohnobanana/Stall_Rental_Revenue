import { useState } from 'react';
import DashboardCards from '../components/DashboardCards';
import { RevenueLineChart, BuildingBarChart, OccupancyPieChart } from '../components/Charts';
import Loader from '../components/Loader';
import { useFetch } from '../hooks/useFetch';
import { MdCalendarToday, MdArrowBack, MdArrowForward } from 'react-icons/md';

export default function Dashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: stats,     loading: l1 } = useFetch('/dashboard/stats', { params: { year } }, [year]);
  const { data: revenue,   loading: l2 } = useFetch('/dashboard/revenue', { params: { year } }, [year]);
  const { data: buildings, loading: l3 } = useFetch('/dashboard/buildings', { params: { year } }, [year]);

  const loading = l1 || l2 || l3;

  const prevYear = () => setYear(y => y - 1);
  const nextYear = () => setYear(y => y > currentYear ? y : y + 1);

  const availableYears = Array.from({ length: currentYear - 2020 }, (_, i) => 2021 + i).concat([currentYear]);

  if (loading) return <Loader message={`Loading ${year} data...`} />;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-title">Revenue Dashboard</h2>
          <p className="text-gov-gray font-mono text-xs mt-1">Real-time collection monitoring</p>
        </div>

        {/* Year Selector */}
        <div className="gov-card rounded-lg overflow-hidden border border-gov-border shadow-sm">
          <div className="bg-gov-navy px-3 py-1.5 text-center">
            <p className="font-mono text-gov-gold text-xs uppercase tracking-widest">Fiscal Year</p>
          </div>
          <div className="flex items-center gap-0">
            <button
              onClick={prevYear}
              className="px-3 py-2.5 text-gov-gray hover:text-gov-navy hover:bg-gov-cream transition-colors border-r border-gov-border"
              title="Previous year"
            >
              <MdArrowBack size={16} />
            </button>

            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2.5 font-serif font-bold text-gov-navy text-lg bg-white border-none focus:outline-none cursor-pointer text-center"
              style={{ minWidth: 90 }}
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              onClick={nextYear}
              disabled={year >= currentYear}
              className="px-3 py-2.5 text-gov-gray hover:text-gov-navy hover:bg-gov-cream transition-colors border-l border-gov-border disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next year"
            >
              <MdArrowForward size={16} />
            </button>
          </div>
          <div className="bg-gov-cream px-3 py-1 text-center border-t border-gov-border">
            <p className="font-mono text-gov-gray text-xs">
              {year === currentYear ? (
                <span className="text-green-600 font-semibold">● Live</span>
              ) : (
                <span>Historical</span>
              )}
              {' '}· As of {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Year banner — shows when viewing past year */}
      {year !== currentYear && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 flex items-center gap-3">
          <MdCalendarToday className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-amber-800 text-sm font-sans font-semibold">
              Viewing historical data for fiscal year {year}
            </p>
            <p className="text-amber-700 text-xs font-mono mt-0.5">
              All figures below reflect collections from January 1 – December 31, {year}
            </p>
          </div>
          <button
            onClick={() => setYear(currentYear)}
            className="ml-auto text-amber-700 hover:text-amber-900 font-mono text-xs underline whitespace-nowrap"
          >
            Back to {currentYear}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <DashboardCards stats={stats || {}} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueLineChart data={revenue || []} />
        <OccupancyPieChart
          occupied={stats?.occupiedStalls || 0}
          vacant={stats?.vacantStalls || 0}
          delinquent={stats?.delinquentStalls || 0}
        />
      </div>

      <BuildingBarChart data={buildings || []} />
    </div>
  );
}