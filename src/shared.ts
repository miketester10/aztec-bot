import axios, { AxiosError } from "axios";
import { ValidatorStatsResponse } from "./interfaces/validator-stats-response.interface";
import { CurrentEpochStatsResponse } from "./interfaces/current-epoch-stats-response.interface";
import { ErrorResponse } from "./interfaces/error-response.interface";
import { API } from "./consts/api";
import { logger } from "./logger/logger";
import { blockquote, bold, code, format, FormattableString } from "gramio";
import {
  validatorStatus,
  validatorStatusMessage,
} from "./consts/validator-status";

export class ValidatorHandler {
  private static _instance: ValidatorHandler;

  private constructor() {}

  static getInstance(): ValidatorHandler {
    if (!ValidatorHandler._instance) {
      ValidatorHandler._instance = new ValidatorHandler();
    }
    return ValidatorHandler._instance;
  }

  async getValidatorStats(
    validatorAddress: string
  ): Promise<ValidatorStatsResponse> {
    try {
      const result = await axios.get<ValidatorStatsResponse>(
        `${API.VALIDATOR_STATS}/${validatorAddress}`
      );
      logger.info(`Validator status: ${result.data.status}`);
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentEpochStats(): Promise<void> {
    try {
      const result = await axios.get<CurrentEpochStatsResponse>(
        API.CURRENT_EPOCH_STATS
      );

      logger.info(
        `Current epoch: ${result.data.currentEpochMetrics.epochNumber}`
      );

      logger.info(
        `Total active validators: ${result.data.totalActiveValidators}`
      );

      logger.info(
        `Total inactive validators: ${result.data.totalInactiveValidators}`
      );
    } catch (error) {
      throw error;
    }
  }

  createMessageForTelegram(result: ValidatorStatsResponse): FormattableString {
    let status = "";
    switch (result.status) {
      case validatorStatus.ACTIVE:
        status = validatorStatusMessage.ACTIVE;
        break;
      case validatorStatus.EXITED:
        status = validatorStatusMessage.EXITED;
        break;
    }

    const attestationSuccessRate = (
      (result.totalAttestationsSucceeded /
        (result.totalAttestationsSucceeded + result.totalAttestationsMissed)) *
      100
    ).toFixed(1);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(
      1
    );

    const proposalSuccessRate = (
      ((result.totalBlocksProposed + result.totalBlocksMined) /
        (result.totalBlocksProposed +
          result.totalBlocksMined +
          result.totalBlocksMissed)) *
      100
    ).toFixed(1);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(1);

    const message = format`${blockquote(format`🔷 ${bold(
      "VALIDATOR DETAILS"
    )} 🔷

      ${bold("Status:")} ${status} 

      📋 ${bold("BASIC INFO")} 📋
      🔑 ${bold("Address:")} ${code(result.address)}
      💰 ${bold("Staked Amount:")} ${code(result.balance)}
      👤 ${bold("Proposer Address:")} ${code(result.proposerAddress)}
      💼 ${bold("Withdrawer Address:")} ${code(result.withdrawalCredentials)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(result.totalAttestationsSucceeded)}
      ❌ ${bold("Missed:")} ${code(result.totalAttestationsMissed)}
      📈 ${bold("Success Rate:")} ${code(attestationSuccessRate)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(
      `${result.totalBlocksProposed + result.totalBlocksMined}`
    )}
      ❌ ${bold("Missed:")} ${code(`${result.totalBlocksMissed}`)}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}
    `)}`;

    return message;
  }

  handleError(error: unknown): string {
    const defaultErrorMessage = "An error occurred. Please try again.";

    if (axios.isAxiosError(error)) {
      const customErrorMessage = (error as AxiosError<ErrorResponse>).response
        ?.data.error;
      const errorMessage = customErrorMessage
        ? customErrorMessage
        : error.message;
      logger.error(`Axios Error: ${errorMessage}`);

      return customErrorMessage || defaultErrorMessage;
    }
    const unknownErrorMessage = (error as Error).message;
    logger.error(`Unknown Error: ${unknownErrorMessage}`);

    return defaultErrorMessage;
  }
}
