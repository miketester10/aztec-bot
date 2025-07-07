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
import { NetworkHealthResponse } from "../interfaces/network-health-response.interface";

export class AztecHandler {
  private static _instance: AztecHandler;

  private constructor() {}

  static getInstance(): AztecHandler {
    if (!AztecHandler._instance) {
      AztecHandler._instance = new AztecHandler();
    }
    return AztecHandler._instance;
  }

  async getNetworkHealth(): Promise<NetworkHealthResponse> {
    try {
      const result = await axios.get<NetworkHealthResponse>(API.NETWORK_HEALTH);

      logger.info(
        `Pending Block: ${result.data[5].height}, Proven Block: ${result.data[1].height}, Current Slot: ${result.data[5].header.globalVariables.slotNumber}`
      );

      return result.data;
    } catch (error) {
      throw error;
    }
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
        `${API.TOP_VALIDATORS}?startEpoch=1&endEpoch=${currentEpoch}`
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

  createFormattedMessageForNetworkHealth(
    rawData: NetworkHealthResponse
  ): FormattableString {
    const message = format`${blockquote(
      format`🔷 ${bold("NETWORK HEALTH")} 🔷

      🏗️ ${bold("Pending Block:")} ${code(rawData[4].height)} 
      🧱 ${bold("Proven Block:")} ${code(rawData[1].height)} 
      🎰 ${bold("Current Slot:")} ${code(
        rawData[4].header.globalVariables.slotNumber
      )}
      
      
      `
    )}`;

    return message;
  }

  createFormattedMessageForValidatorStats(
    rawData: ValidatorStatsResponse
  ): FormattableString {
    let status = "";
    switch (rawData.status) {
      case validatorStatus.ACTIVE:
        status = validatorStatusMessage.ACTIVE;
        break;
      case validatorStatus.EXITED:
        status = validatorStatusMessage.EXITED;
        break;
    }

    const balance = (Number(rawData.balance) / 1e18).toFixed(2);

    const totalActiveValidators =
      rawData.currentEpochStats?.totalActiveValidators;
    const totalInactiveValidators =
      rawData.currentEpochStats?.totalInactiveValidators;

    const attestationSuccessRate = (
      (rawData.totalAttestationsSucceeded /
        (rawData.totalAttestationsSucceeded +
          rawData.totalAttestationsMissed)) *
      100
    ).toFixed(1);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(
      1
    );

    const proposalSuccessRate = (
      ((rawData.totalBlocksProposed + rawData.totalBlocksMined) /
        (rawData.totalBlocksProposed +
          rawData.totalBlocksMined +
          rawData.totalBlocksMissed)) *
      100
    ).toFixed(1);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(1);

    const message = format`${blockquote(format`🔷 ${bold(
      "VALIDATOR DETAILS"
    )} 🔷

      ${bold("Status:")} ${status} 

      📋 ${bold("BASIC INFO")} 📋
      🔑 ${bold("Address:")} ${code(rawData.address)}
      💰 ${bold("Staked Amount:")} ${code(`${balance} STK`)}
      👤 ${bold("Proposer Address:")} ${code(rawData.proposerAddress)}
      💼 ${bold("Withdrawer Address:")} ${code(rawData.withdrawalCredentials)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(rawData.totalAttestationsSucceeded)}
      ❌ ${bold("Missed:")} ${code(rawData.totalAttestationsMissed)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(
      `${rawData.totalBlocksProposed + rawData.totalBlocksMined}`
    )}
      ❌ ${bold("Missed:")} ${code(`${rawData.totalBlocksMissed}`)}
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
    rawData: TopValidatorsResponse
  ): FormattableString {
    const message = format`${blockquote(
      format`🏆 ${bold("TOP 10 VALIDATORS ALL TIME")} 🏆
    
${code(
  rawData.validators
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
    rawData: CurrentEpochStatsResponse
  ): FormattableString {
    const attestationSuccessRate = (
      (rawData.currentEpochMetrics.successCount /
        (rawData.currentEpochMetrics.successCount +
          rawData.currentEpochMetrics.missCount)) *
      100
    ).toFixed(2);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(
      2
    );

    const proposalSuccessRate = (
      (rawData.currentEpochMetrics.epochBlockProducedVolume /
        (rawData.currentEpochMetrics.epochBlockProducedVolume +
          rawData.currentEpochMetrics.epochBlockMissedVolume)) *
      100
    ).toFixed(2);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(2);

    const message = format`${blockquote(
      format`🔷 ${bold("EPOCH DETAILS")} 🔷

      ${bold("Current Epoch:")} ${code(rawData.currentEpochMetrics.epochNumber)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(
        rawData.currentEpochMetrics.successCount
      )}
      ❌ ${bold("Missed:")} ${code(rawData.currentEpochMetrics.missCount)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(
        `${rawData.currentEpochMetrics.epochBlockProducedVolume}`
      )}
      ❌ ${bold("Missed:")} ${code(
        `${rawData.currentEpochMetrics.epochBlockMissedVolume}`
      )}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}

      🌐 ${bold("NETWORK INFO")} 🌐
      🟢 ${bold("Total Active Validators:")} ${code(
        `${rawData.totalActiveValidators}`
      )}
      🔴 ${bold("Total Inactive Validators:")} ${code(
        `${rawData.totalInactiveValidators}`
      )}
      
      
      `
    )}`;

    return message;
  }

  handleError(error: unknown): string {
    const defaultErrorMessage = "An error occurred. Please try again later.";

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
