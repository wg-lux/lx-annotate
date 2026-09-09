import { useMonitoringStore } from '@/stores/monitoring'

/** The admin endpoint is the authority; frontend roles never grant access. */
export async function enterMonitoringRoute(): Promise<
  true | { path: string; query: { denied: string } }
> {
  const monitoring = useMonitoringStore()
  await monitoring.refresh()
  return monitoring.forbidden ? { path: '/administration', query: { denied: '1' } } : true
}
