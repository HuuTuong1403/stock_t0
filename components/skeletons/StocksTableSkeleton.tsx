function Bone({ className }: { className?: string }) {
  return <div className={className} />;
}

export function StocksTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <Bone className="h-10 w-full bg-slate-700/40 rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} className="h-12 w-full bg-slate-800/60 rounded" />
      ))}
    </div>
  );
}
