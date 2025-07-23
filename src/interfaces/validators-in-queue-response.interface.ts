export interface ValidatorsInQueueResponse {
  validatorsInQueue: ValidatorInQueue[];
}

export interface ValidatorInQueue {
  position: number;
  address: string;
  withdrawerAddress: string;
  transactionHash: string;
  queuedAt: string;
  index: string;
}
