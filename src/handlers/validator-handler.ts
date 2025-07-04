import axios, { AxiosError } from "axios";
import { ValidatorStatsResponse } from "../interfaces/validator-stats-response.interface";
import {
  TopValidatorsResponse,
  TopValidator,
} from "../interfaces/top-validators-response.interface";
import { CurrentEpochStatsResponse } from "../interfaces/current-epoch-stats-response.interface";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { API } from "../consts/api";
import { logger } from "../logger/logger";
import { blockquote, bold, code, format, FormattableString } from "gramio";
import {
  validatorStatus,
  validatorStatusMessage,
} from "../consts/validator-status";

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

      try {
        const epochStats = await this.getCurrentEpochStats();
        result.data.currentEpochStats = epochStats;
      } catch (error) {
        const unknownError = error as Error;
        logger.error(
          `ERROR IN getCurrentEpochStats(): ${unknownError.message}`
        );
      }

      logger.info(`Validator status: ${result.data.status}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getTop10Validators(): Promise<TopValidatorsResponse> {
    try {
      const currentEpoch = (await this.getCurrentEpochStats())
        .currentEpochMetrics.epochNumber;
      const result = await axios.get<TopValidatorsResponse>(
        `${API.TOP_VALIDATORS_API}?startEpoch=1&endEpoch=${currentEpoch}`
      );
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentEpochStats(): Promise<CurrentEpochStatsResponse> {
    try {
      const result = await axios.get<CurrentEpochStatsResponse>(
        API.CURRENT_EPOCH_STATS
      );

      logger.info(
        `Current epoch: ${result.data.currentEpochMetrics.epochNumber}`
      );

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  createFormattedMessageForValidatorStats(
    result: ValidatorStatsResponse
  ): FormattableString {
    let status = "";
    switch (result.status) {
      case validatorStatus.ACTIVE:
        status = validatorStatusMessage.ACTIVE;
        break;
      case validatorStatus.EXITED:
        status = validatorStatusMessage.EXITED;
        break;
    }

    const totalActiveValidators =
      result.currentEpochStats?.totalActiveValidators;
    const totalInactiveValidators =
      result.currentEpochStats?.totalInactiveValidators;

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
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(
      `${result.totalBlocksProposed + result.totalBlocksMined}`
    )}
      ❌ ${bold("Missed:")} ${code(`${result.totalBlocksMissed}`)}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}

      ${
        totalActiveValidators && totalInactiveValidators
          ? format`🌐 ${bold("NETWORK INFO")} 🌐
      🟢 ${bold("Total Active Validators:")} ${code(`${totalActiveValidators}`)}
      🔴 ${bold("Total Inactive Validators:")} ${code(
              `${totalInactiveValidators}`
            )}`
          : ""
      } 

    `)}`;

    return message;
  }

  createFormattedMessageForTop10Validators(
    result: TopValidatorsResponse
  ): FormattableString {
    const message = format`${blockquote(
      format`🔷 ${bold("TOP 10 VALIDATORS ALL TIME")} 🔷
    
${code(
  result.validators
    .map((validator: TopValidator, _index: number) => {
      if (_index === 0) return `🥇${validator.address}`;
      if (_index === 1) return `🥈${validator.address}`;
      if (_index === 2) return `🥉${validator.address}`;
      return `🔹${validator.address}`;
    })
    .join("\n")
)}
    
`
    )}`;
    return message;
  }

  createFormattedMessageForEpochStats(
    result: CurrentEpochStatsResponse
  ): FormattableString {
    const attestationSuccessRate = (
      (result.currentEpochMetrics.successCount /
        (result.currentEpochMetrics.successCount +
          result.currentEpochMetrics.missCount)) *
      100
    ).toFixed(2);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(
      2
    );

    const proposalSuccessRate = (
      (result.currentEpochMetrics.epochBlockProducedVolume /
        (result.currentEpochMetrics.epochBlockProducedVolume +
          result.currentEpochMetrics.epochBlockMissedVolume)) *
      100
    ).toFixed(2);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(2);

    const message = format`${blockquote(
      format`🔷 ${bold("EPOCH DETAILS")} 🔷

      ${bold("Current Epoch:")} ${code(result.currentEpochMetrics.epochNumber)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(result.currentEpochMetrics.successCount)}
      ❌ ${bold("Missed:")} ${code(result.currentEpochMetrics.missCount)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(
        `${result.currentEpochMetrics.epochBlockProducedVolume}`
      )}
      ❌ ${bold("Missed:")} ${code(
        `${result.currentEpochMetrics.epochBlockMissedVolume}`
      )}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}

      🌐 ${bold("NETWORK INFO")} 🌐
      🟢 ${bold("Total Active Validators:")} ${code(
        `${result.totalActiveValidators}`
      )}
      🔴 ${bold("Total Inactive Validators:")} ${code(
        `${result.totalInactiveValidators}`
      )}
      
      
      `
    )}`;

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
