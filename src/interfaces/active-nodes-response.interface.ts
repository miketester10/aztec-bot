export interface ActiveNodesResponse {
  agents: Agent[]
}

export interface Agent {
  client_name: string
  total_count: number
  versions: any[]
}