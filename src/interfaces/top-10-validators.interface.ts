import { ValidatorStatsResponse } from "./validator-stats-response.interface";

export interface Top10Validator {
  validators: Validator[];
}

export interface Validator
  extends Omit<
    ValidatorStatsResponse,
    | "index"
    | "proposerAddress"
    | "withdrawalCredentials"
    | "recentAttestations"
    | "proposalHistory"
    | "totalParticipatingEpochs"
    | "epochPerformanceHistory"
    | "currentEpochStats"
  > {
  proposalSuccess: string;
  lastProposed: string;
  performanceScore: number;
}
