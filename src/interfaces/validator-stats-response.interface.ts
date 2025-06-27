export interface ValidatorStatsResponse {
  index: string;
  address: string;
  status: string;
  balance: string;
  attestationSuccess: string;
  proposerAddress: string;
  withdrawalCredentials: string;
  recentAttestations: RecentAttestation[];
  proposalHistory: ProposalHistory[];
  totalAttestationsSucceeded: number;
  totalAttestationsMissed: number;
  totalBlocksProposed: number;
  totalBlocksMined: number;
  totalBlocksMissed: number;
  totalParticipatingEpochs: number;
  epochPerformanceHistory: EpochPerformanceHistory[];
}

interface RecentAttestation {
  epoch: number;
  slot: number;
  status: string;
}

interface ProposalHistory {
  epoch: number;
  slot: number;
  status: string;
}

interface EpochPerformanceHistory {
  epochNumber: number;
  attestationsSuccessful: number;
  attestationsMissed: number;
  blocksProposed: number;
  blocksMined: number;
  blocksMissed: number;
}
