export default function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className={`card p-5 ${accent ? 'border-accent/30 bg-gradient-to-br from-accent/5 to-transparent' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? 'bg-accent/20' : 'bg-surface-overlay'}`}>
          <Icon className={`w-5 h-5 ${accent ? 'text-accent-light' : 'text-gray-400'}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-100 mb-0.5">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}
