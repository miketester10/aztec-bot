export interface ValidatorBase {
  index: string;
  address: string;
  status: string;
  balance: string;
  attestationSuccess: string;
  totalAttestationsSucceeded: number;
  totalAttestationsMissed: number;
  totalBlocksProposed: number;
  totalBlocksMined: number;
  totalBlocksMissed: number;
}
