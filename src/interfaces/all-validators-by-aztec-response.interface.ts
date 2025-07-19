export type AllValidatorsByAztecResponse = Validator[];

export interface Validator {
  rollupAddress: string;
  attester: string;
  stake: string;
  withdrawer: string;
  proposer: string;
  status: number;
  firstSeenAt: string;
  latestSeenChangeAt: string;
}
