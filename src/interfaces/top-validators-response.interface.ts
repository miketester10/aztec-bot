import { ValidatorBase } from "./validator.interface";

export interface TopValidatorsResponse {
  validators: TopValidator[];
}

export interface TopValidator extends ValidatorBase {
  proposalSuccess: string;
  lastProposed: string;
  performanceScore: number;
  x_handle?: string;
  name?: string;
}
