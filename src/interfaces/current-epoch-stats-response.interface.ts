export interface CurrentEpochStatsResponse {
  totalActiveValidators: number
  totalInactiveValidators: number
  currentEpochMetrics: CurrentEpochMetrics
}

interface CurrentEpochMetrics {
  epochNumber: number
  successCount: number
  missCount: number
  totalAttestations: number
  epochBlockMissedVolume: number
  epochBlockProducedVolume: number
  attestationRate: number
  blockProductionRate: number
}
