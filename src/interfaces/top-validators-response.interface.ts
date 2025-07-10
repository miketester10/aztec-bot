import { ValidatorBase } from "./validator-base.interface";

export interface TopValidatorsResponse {
  validators: TopValidator[];
}

export interface TopValidator extends ValidatorBase {
  proposalSuccess: string;
  lastProposed: string;
  performanceScore: number;
  
}
