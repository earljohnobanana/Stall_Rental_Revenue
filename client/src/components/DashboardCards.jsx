import {
  MdBusiness, MdStorefront, MdCheckCircle, MdCancel,
  MdAttachMoney, MdElectricBolt, MdWarning
} from 'react-icons/md';
import { formatCurrency } from '../utils/formatCurrency';

const cards = [
  { key: 'totalBuildings',  label: 'Total Buildings',   icon: MdBusiness,     bg: 'bg-gov-navy',   currency: false },
  { key: 'totalStalls',     label: 'Total Stalls',      icon: MdStorefront,   bg: 'bg-gov-blue',   currency: false },
  { key: 'occupiedStalls',  label: 'Occupied',          icon: MdCheckCircle,  bg: 'bg-green-700',  currency: false },
  { key: 'vacantStalls',    label: 'Vacant',            icon: MdCancel,       bg: 'bg-gray-500',   currency: false },
  { key: 'monthlyRevenue',  label: 'Monthly Revenue',   icon: MdAttachMoney,  bg: 'bg-amber-600',  currency: true  },
  { key: 'electricRevenue', label: 'Electric Revenue',  icon: MdElectricBolt, bg: 'bg-yellow-600', currency: true  },
  { key: 'totalCollections',label: 'Total Collections', icon: MdAttachMoney,  bg: 'bg-green-800',  currency: true  },
  { key: 'unpaidAccounts',  label: 'Unpaid Accounts',   icon: MdWarning,      bg: 'bg-red-700',    currency: false },
];

export default function DashboardCards({ stats = {} }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon, bg, currency }) => (
        <div key={key} className="gov-card rounded-lg overflow-hidden">
          <div className={`${bg} p-2.5 flex items-center gap-2`}>
            <Icon className="text-white text-xl flex-shrink-0" />
            <p className="text-white/80 text-xs font-sans uppercase tracking-wide leading-tight">{label}</p>
          </div>
          <div className="px-3 py-2.5">
            <p className="font-serif font-bold text-gov-navy text-lg md:text-xl truncate">
              {currency ? formatCurrency(stats[key] || 0) : (stats[key] ?? '—')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}