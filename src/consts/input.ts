export const input = {
  ETH_ADDRESS: "ETH_ADDRESS",
  PEER_ID: "PEER_ID",
} as const;

export type InputType = keyof typeof input;
