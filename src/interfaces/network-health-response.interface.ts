import { Validator } from "./all-validators-response.interface";

export interface NetworkHealthResponse {
  blocks: Block[];
  validators: Validator[];
}

export interface Block {
  hash: string;
  height: string;
  finalizationStatus: number;
  proposedOnL1: ProposedOnL1;
  proofVerifiedOnL1?: ProofVerifiedOnL1;
  archive: Archive;
  header: Header;
  body: Body;
}

interface ProposedOnL1 {
  l1ContractAddress: string;
  l1BlockNumber: string;
  l1BlockTimestamp: string;
  l1BlockHash: string;
  isFinalized: boolean;
  archive: string;
}

interface ProofVerifiedOnL1 {
  l1ContractAddress: string;
  l1BlockNumber: string;
  l1BlockTimestamp: string;
  l1BlockHash: string;
  isFinalized: boolean;
  proverId: string;
}

interface Archive {
  root: string;
  nextAvailableLeafIndex: number;
}

interface Header {
  lastArchive: LastArchive;
  contentCommitment: ContentCommitment;
  state: State;
  globalVariables: GlobalVariables;
  totalFees: string;
  totalManaUsed: string;
}

interface LastArchive {
  root: string;
  nextAvailableLeafIndex: number;
}

interface ContentCommitment {
  numTxs: number;
  blobsHash: BlobsHash;
  inHash: InHash;
  outHash: OutHash;
}

interface BlobsHash {
  type: string;
  data: number[];
}

interface InHash {
  type: string;
  data: number[];
}

interface OutHash {
  type: string;
  data: number[];
}

interface State {
  l1ToL2MessageTree: L1ToL2MessageTree;
  partial: Partial;
}

interface L1ToL2MessageTree {
  root: string;
  nextAvailableLeafIndex: number;
}

interface Partial {
  noteHashTree: NoteHashTree;
  nullifierTree: NullifierTree;
  publicDataTree: PublicDataTree;
}

interface NoteHashTree {
  root: string;
  nextAvailableLeafIndex: number;
}

interface NullifierTree {
  root: string;
  nextAvailableLeafIndex: number;
}

interface PublicDataTree {
  root: string;
  nextAvailableLeafIndex: number;
}

interface GlobalVariables {
  chainId: number;
  version: number;
  blockNumber: number;
  slotNumber: number;
  timestamp: number;
  coinbase: string;
  feeRecipient: string;
  gasFees: GasFees;
}

interface GasFees {
  feePerDaGas: number;
  feePerL2Gas: number;
}

interface Body {
  txEffects: TxEffect[];
}

interface TxEffect {
  txHash: string;
}
