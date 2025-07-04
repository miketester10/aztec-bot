import { ValidatorBase } from "./validator.interface";
import { CurrentEpochStatsResponse } from "./current-epoch-stats-response.interface";

export interface ValidatorStatsResponse extends ValidatorBase {
  proposerAddress: string;
  withdrawalCredentials: string;
  recentAttestations: RecentAttestation[];
  proposalHistory: ProposalHistory[];
  totalParticipatingEpochs: number;
  epochPerformanceHistory: EpochPerformanceHistory[];
  currentEpochStats?: CurrentEpochStatsResponse;
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
