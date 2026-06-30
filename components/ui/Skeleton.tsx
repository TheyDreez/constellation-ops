export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-3">
      <div className="skeleton w-9 h-9 rounded-lg" />
      <div className="skeleton h-6 w-16 rounded-md" />
      <div className="skeleton h-3.5 w-24 rounded-md" />
      <div className="skeleton h-3 w-32 rounded-md" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/3 rounded-md" />
        <div className="skeleton h-3 w-1/2 rounded-md" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full flex-shrink-0" />
      <div className="skeleton h-6 w-20 rounded-full flex-shrink-0" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div>
        <div className="skeleton h-4 w-40 rounded-md mb-3" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface-card rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
        <div className="space-y-4">
          <div className="surface-card rounded-xl p-5 space-y-3">
            {[...Array(4)].map((_, i) => <SkeletonLine key={i} className="w-full rounded-md" />)}
          </div>
          <div className="surface-card rounded-xl p-5">
            <div className="skeleton h-16 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
