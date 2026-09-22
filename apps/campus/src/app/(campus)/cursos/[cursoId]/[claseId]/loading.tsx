export default function LessonLoading() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* Main content */}
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-3 bg-slate-100 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>

          {/* Video placeholder */}
          <div className="aspect-video bg-slate-200 rounded-2xl" />

          {/* Tabs */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-slate-100 rounded-lg" />
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-4/6 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-slate-50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
