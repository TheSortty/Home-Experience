export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-200 rounded-lg" />
            <div className="h-4 w-40 bg-slate-100 rounded-md" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl" />
        </div>

        {/* List rows */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-200 rounded-md" />
                <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
