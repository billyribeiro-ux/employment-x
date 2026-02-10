export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to EmploymentX</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Active Jobs" value="—" description="Published job posts" />
        <DashboardCard title="Applications" value="—" description="Total applications" />
        <DashboardCard title="Interviews" value="—" description="Scheduled this week" />
        <DashboardCard title="Messages" value="—" description="Unread messages" />
      </div>
    </div>
  );
}

function DashboardCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium tracking-tight">{title}</h3>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
