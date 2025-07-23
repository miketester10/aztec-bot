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
  totalParticipatingEpochs: number;
  x_handle?: string;
  x_user_id?: string;
  x_image_url?: string;
  name?: string;
  discordUsername?: string;
  discordAvatar?: string;
  discordId?: string;
}
