import { ValidatorBase } from "./validator-base.interface";

export interface ValidatorStatsResponse extends ValidatorBase {
  withdrawalCredentials: string;
  recentAttestations: RecentAttestation[];
  proposalHistory: ProposalHistory[];
  votingHistory: any[];
  totalParticipatingEpochs: number;
  epochPerformanceHistory: EpochPerformanceHistory[];
  x_user_id?: string;
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
