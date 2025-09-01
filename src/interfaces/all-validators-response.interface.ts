import { ValidatorBase } from "./validator-base.interface";

export interface AllValidatorsResponse {
  validators: Validator[];
  statuses: Status[];
}

export interface Validator extends ValidatorBase {
  proposalSuccess: string;
  lastProposed: string;
  performanceScore: number;
  rank: number;
}

export interface Status {
  status: string;
  count: number;
}
