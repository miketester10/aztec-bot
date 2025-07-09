import { config } from "dotenv";
config();

export const API = {
  PROXY_AGENT: process.env.PROXY_AGENT!,
  NETWORK_HEALTH: process.env.NETWORK_HEALTH_API!,
  ACTIVE_NODES_BY_COUNTRY: process.env.ACTIVE_NODES_BY_COUNTRY_API!,
  ACTIVE_NODES: process.env.ACTIVE_NODES_API!,
  NODE_INFO: process.env.NODE_INFO_API!,
  VALIDATOR_STATS: process.env.VALIDATOR_STATS_API!,
  TOP_VALIDATORS: process.env.TOP_VALIDATORS_API!,
  CURRENT_EPOCH_STATS: process.env.CURRENT_EPOCH_STATS_API!,
};
