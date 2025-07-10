import { TopValidator } from "./top-validators-response.interface";

export interface AllValidatorsResponse {
  validators: Validator[];
}

export interface Validator extends TopValidator {
  totalParticipatingEpoch: number;
}
