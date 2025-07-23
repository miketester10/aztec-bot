import { Validator } from "./all-validators-response.interface";

export interface TopValidatorsResponse {
  validators: TopValidator[];
}

export interface TopValidator extends Omit<Validator, "totalParticipatingEpoch"> {}
