import { AllValidatorsResponse } from "../interfaces/all-validators-response.interface";
import { ValidatorStatsResponse } from "../interfaces/validator-stats-response.interface";

export type ValidatorStatsCombinedResponse = {
  validatorStats: ValidatorStatsResponse;
  allValidators: AllValidatorsResponse | undefined;
};
