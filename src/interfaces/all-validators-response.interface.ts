import { ValidatorBase } from "./validator-base.interface";

export interface AllValidatorsResponse {
  validators: Validator[];
}

export interface Validator extends ValidatorBase {
  proposalSuccess: string;
  lastProposed: string;
  performanceScore: number;
  rank: number;
}
