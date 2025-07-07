import { config } from "dotenv";
config();

export const API = {
  NETWORK_HEALTH: process.env.NETWORK_HEALTH_API!,
  VALIDATOR_STATS: process.env.VALIDATOR_STATS_API!,
  TOP_VALIDATORS: process.env.TOP_VALIDATORS_API!,
  CURRENT_EPOCH_STATS: process.env.CURRENT_EPOCH_STATS_API!,
};
