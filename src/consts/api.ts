import { config } from "dotenv";
config();

export const API = {
  VALIDATOR_STATS: process.env.VALIDATOR_STATS_API!,
  CURRENT_EPOCH_STATS: process.env.CURRENT_EPOCH_STATS_API!,
  TOP_VALIDATORS_API: process.env.TOP_VALIDATORS_API!,
};
