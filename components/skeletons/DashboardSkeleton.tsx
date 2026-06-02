import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Bone({ className }: { className?: string }) {
  return <div className={className} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <Bone className="h-10 w-64 bg-slate-700/60 rounded-lg" />
        <Bone className="h-4 w-80 bg-slate-800/80 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-6">
              <Bone className="h-4 w-20 bg-slate-700/60 rounded mb-3" />
              <Bone className="h-9 w-16 bg-slate-700/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <Bone className="h-6 w-40 bg-slate-700/60 rounded" />
            </CardHeader>
            <CardContent>
              <Bone className="h-24 w-full bg-slate-700/40 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <Bone className="h-6 w-48 bg-slate-700/60 rounded mb-2" />
          <Bone className="h-4 w-72 bg-slate-800/80 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Bone className="h-10 w-full bg-slate-700/40 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-12 w-full bg-slate-800/60 rounded" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
