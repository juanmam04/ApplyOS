export default function MatchScore({ score, size = 'md' }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : score >= 40 ? 'text-orange-400' : 'text-gray-500';
  const sizes = { sm: 'text-sm', md: 'text-lg font-semibold', lg: 'text-2xl font-bold' };

  return (
    <div className={`${sizes[size]} ${color}`}>
      {score > 0 ? `${score}%` : '—'}
    </div>
  );
}
