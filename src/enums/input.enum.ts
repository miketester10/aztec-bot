export enum Input {
  ETH_ADDRESS = "ETH_ADDRESS",
  PEER_ID = "PEER_ID",
}

export type InputType = keyof typeof Input;
