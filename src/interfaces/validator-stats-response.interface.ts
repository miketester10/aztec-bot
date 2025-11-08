import { ValidatorBase } from "./validator-base.interface";

export interface ValidatorStatsResponse extends ValidatorBase {
  withdrawalCredentials: string;
  recentAttestations: RecentAttestation[];
  proposalHistory: ProposalHistory[];
  votingHistory: any[];
  epochPerformanceHistory: EpochPerformanceHistory[];
  activationDate?: string;
  unclaimedRewards: string;
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
