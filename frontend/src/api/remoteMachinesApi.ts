import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'

// Remote mode: LuxNix-configured VPN machines. Selecting one navigates the
// browser to that machine's own origin and login; no cross-origin API calls.
export const DEPLOYMENT_ROLES = [
  'standalone',
  'site_node',
  'local_study_server',
  'central_hub'
] as const
export type DeploymentRole = (typeof DEPLOYMENT_ROLES)[number]

export type RemoteMachine = {
  key: string
  displayName: string
  baseUrl: string
  deploymentRole: DeploymentRole
}
export type RemoteMachineRegistry = {
  deploymentRole: DeploymentRole
  machines: RemoteMachine[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isDeploymentRole(value: unknown): value is DeploymentRole {
  return typeof value === 'string' && (DEPLOYMENT_ROLES as readonly string[]).includes(value)
}

function httpsOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.origin === value ? url.origin : null
  } catch {
    return null
  }
}

export function parseRemoteMachineRegistry(data: unknown): RemoteMachineRegistry {
  if (
    !isRecord(data) ||
    !isDeploymentRole(data.deploymentRole) ||
    !Array.isArray(data.machines)
  ) {
    throw new Error('Die Rechnerliste ist ungültig.')
  }
  const machines = data.machines.map((entry: unknown): RemoteMachine => {
    const baseUrl = isRecord(entry) ? httpsOrigin(entry.baseUrl) : null
    if (
      !isRecord(entry) ||
      typeof entry.key !== 'string' ||
      typeof entry.displayName !== 'string' ||
      !isDeploymentRole(entry.deploymentRole) ||
      baseUrl === null
    ) {
      throw new Error('Die Rechnerliste ist ungültig.')
    }
    return {
      key: entry.key,
      displayName: entry.displayName,
      baseUrl,
      deploymentRole: entry.deploymentRole
    }
  })
  return { deploymentRole: data.deploymentRole, machines }
}

export async function fetchRemoteMachines(signal: AbortSignal): Promise<RemoteMachineRegistry> {
  const response = await axiosInstance.get<unknown>(
    r('runtime/remote-machines/'),
    silentRequestConfig({ signal, timeout: 15_000 })
  )
  return parseRemoteMachineRegistry(response.data)
}
