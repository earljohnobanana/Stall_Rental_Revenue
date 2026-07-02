import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils/formatCurrency';

const PIE_COLORS = ['#1a5c2a', '#6b7280', '#c9a84c'];

export function RevenueLineChart({ data = [] }) {
  return (
    <div className="gov-card p-4 rounded-lg">
      <h3 className="section-header">Monthly Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
          <XAxis dataKey="month" tick={{ fontFamily: 'Courier Prime', fontSize: 11 }} />
          <YAxis tick={{ fontFamily: 'Courier Prime', fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => formatCurrency(v)} labelStyle={{ fontFamily: 'Playfair Display' }} />
          <Legend />
          <Line type="monotone" dataKey="rental" name="Rental" stroke="#1a2744" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="electric" name="Electric" stroke="#c9a84c" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BuildingBarChart({ data = [] }) {
  return (
    <div className="gov-card p-4 rounded-lg">
      <h3 className="section-header">Collection by Building</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d5" />
          <XAxis dataKey="building" tick={{ fontFamily: 'Courier Prime', fontSize: 10 }} />
          <YAxis tickFormatter={v => `₱${(v/1000).toFixed(0)}K`} tick={{ fontFamily: 'Courier Prime', fontSize: 10 }} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Bar dataKey="total" name="Collection" fill="#2c4a8c" radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom label rendered OUTSIDE the pie — no overlap
const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  if (percent === 0) return null;

  const RADIAN = Math.PI / 180;
  // Push label further out to avoid overlap
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#1a2744"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontFamily: 'Courier Prime', fontSize: 11, fontWeight: 600 }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function OccupancyPieChart({ occupied = 0, vacant = 0, delinquent = 0 }) {
  const total = occupied + vacant + delinquent;

  const data = [
    { name: 'Occupied',   value: occupied },
    { name: 'Vacant',     value: vacant },
    { name: 'Delinquent', value: delinquent },
  ].filter(d => d.value > 0); // hide zero slices so labels don't stack

  return (
    <div className="gov-card p-4 rounded-lg">
      <h3 className="section-header">Stall Occupancy</h3>

      {total === 0 ? (
        <div className="flex items-center justify-center h-[220px] text-gov-gray font-mono text-sm italic">
          No stall data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                dataKey="value"
                nameKey="name"
                labelLine={true}
                label={renderCustomLabel}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} stalls`, name]}
                contentStyle={{ fontFamily: 'Courier Prime', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom legend below — clean and no overlap */}
          <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
            {[
              { label: 'Occupied',   color: PIE_COLORS[0], value: occupied },
              { label: 'Vacant',     color: PIE_COLORS[1], value: vacant },
              { label: 'Delinquent', color: PIE_COLORS[2], value: delinquent },
            ].map(({ label, color, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span className="font-mono text-xs text-gov-gray">{label}: <strong className="text-gov-navy">{value}</strong></span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}