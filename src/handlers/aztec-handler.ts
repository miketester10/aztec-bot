import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";
import { ValidatorStatsResponse } from "../interfaces/validator-stats-response.interface";
import { ValidatorStatsCombinedResponse } from "../types/validator-stats-combined-response.type";
import { AllValidatorsResponse, Status, Validator } from "../interfaces/all-validators-response.interface";
import { TopValidatorsResponse, TopValidator } from "../interfaces/top-validators-response.interface";
import { CurrentEpochStatsResponse } from "../interfaces/current-epoch-stats-response.interface";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { API } from "../consts/api";
import { logger } from "../logger/logger";
import { blockquote, bold, code, format, FormattableString, italic } from "gramio";
import { ValidatorStatus, ValidatorStatusMessage } from "../enums/validator-status.enum";
import { Block, NetworkHealthResponse } from "../interfaces/network-health-response.interface";
import { HttpsProxyAgent } from "https-proxy-agent";
import UserAgent from "user-agents";
import { DateArg, format as formatDate } from "date-fns";
import { ProxyHandler } from "./proxy-handler";
import { HeadersProperties, Referer } from "../enums/headers.type.enum";
import { ProxyAgentAndBrowserHeaders } from "../types/proxy-agent-and-browser-headers.type";
import { ServerHandler } from "./server-handler";
import { MyMessageContext } from "../interfaces/custom-context.interface";
import { CacheHandler } from "./cache-handler";
import { CacheKeys } from "../enums/cache-keys.enum";
import { ValidatorInQueue, ValidatorsInQueueResponse } from "../interfaces/validators-in-queue-response.interface";
import { ethers } from "ethers";

export class AztecHandler {
  private readonly PROXY_MODE: string = process.env.PROXY_MODE!;

  private static _instance: AztecHandler;
  private readonly proxyHandler: ProxyHandler = ProxyHandler.getInstance();
  private readonly serverHandler: ServerHandler = ServerHandler.getInstance();
  private readonly cacheHandler: CacheHandler = CacheHandler.getInstance();

  private constructor() {}

  static getInstance(): AztecHandler {
    if (!AztecHandler._instance) {
      AztecHandler._instance = new AztecHandler();
    }
    return AztecHandler._instance;
  }

  /**
   * Optimization:
   * - Use `Promise.all` to execute both requests in parallel and fail quickly if problems occur.
   */
  async getNetworkHealth(): Promise<NetworkHealthResponse> {
    try {
      const [blocksResponse, validatorsResponse] = await Promise.all([axios.get<Block[]>(API.NETWORK_HEALTH), this.getAllValidators()]);
      const blocks = blocksResponse.data;
      const validators = validatorsResponse.validators;

      logger.info(`Pending Block: ${blocks[5].height}, Proven Block: ${blocks[2].height}, Current Slot: ${blocks[5].header.globalVariables.slotNumber}`);

      return { blocks, validators };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Optimization:
   * - Both requests are initiated in parallel to reduce response times.
   * - Use `Promise.allSettled` to explicitly handle success and failure cases separately.
   */
  async getValidatorStats(validatorAddress: string): Promise<ValidatorStatsCombinedResponse> {
    const key = `${CacheKeys.VALIDATOR_STATS}:${validatorAddress}`;

    try {
      const cache = await this.cacheHandler.get<ValidatorStatsCombinedResponse>(key);
      if (cache) return cache;

      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(Referer.DASHTEC);

      // Start both requests immediately in parallel
      const validatorStatsPromise = axios.get<ValidatorStatsResponse>(`${API.VALIDATORS_STATS}/${validatorAddress}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });
      const allValidatorsPromise = this.getAllValidators();

      // Waiting for the results
      const [validatorStatsResult, allValidatorsResult] = await Promise.allSettled([validatorStatsPromise, allValidatorsPromise]);

      // If validatorStats fails → throw
      if (validatorStatsResult.status === "rejected") {
        throw validatorStatsResult.reason;
      }

      proxyAgent && this.checkWichIPmadeRequest(proxyAgent);
      logger.info(`Validator status: ${validatorStatsResult.value.data.status}`);

      // If allValidators fails → undefined
      const allValidators = allValidatorsResult.status === "fulfilled" ? allValidatorsResult.value : (logger.error(`ERROR IN getAllValidators(): ${allValidatorsResult.reason}`), undefined);

      const response: ValidatorStatsCombinedResponse = {
        validatorStats: validatorStatsResult.value.data,
        allValidators,
      };

      await this.cacheHandler.set<ValidatorStatsCombinedResponse>(key, response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getValidatorInQueue(address: string): Promise<ValidatorInQueue> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(Referer.DASHTEC);
      const result = await axios.get<ValidatorsInQueueResponse>(`${API.VALIDATORS_IN_QUEUE}${address}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      proxyAgent && this.checkWichIPmadeRequest(proxyAgent);

      const validatorInQueue = result.data.validatorsInQueue;
      if (!(validatorInQueue.length > 0)) throw new Error("Validator not found in queue.");

      const validatorFound = validatorInQueue[0];
      logger.info(`Validator found in queue. Position: ${validatorFound.position}`);

      return validatorFound;
    } catch (error) {
      throw error;
    }
  }

  async getTop10Validators(): Promise<TopValidatorsResponse> {
    const key = CacheKeys.TOP_10_VALIDATORS;

    try {
      const cache = await this.cacheHandler.get<TopValidatorsResponse>(key);
      if (cache) return cache;

      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(Referer.DASHTEC);
      const result = await axios.get<TopValidatorsResponse>(`${API.TOP_VALIDATORS}?startEpoch=1&endEpoch=99999`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      proxyAgent && this.checkWichIPmadeRequest(proxyAgent);

      await this.cacheHandler.set<TopValidatorsResponse>(key, result.data);
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentEpochStats(ctx: MyMessageContext): Promise<CurrentEpochStatsResponse> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(Referer.DASHTEC);
      const result = await axios.get<CurrentEpochStatsResponse>(API.CURRENT_EPOCH_STATS, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      proxyAgent && this.checkWichIPmadeRequest(proxyAgent);

      if (result.data.totalActiveValidators.toString().includes("Stolen Data") || result.data.currentEpochMetrics.epochNumber === 9999) {
        throw new Error("IP banned by DASHTEC API");
      }
      logger.info(`Current epoch: ${result.data.currentEpochMetrics.epochNumber}`);

      return result.data;
    } catch (error) {
      // Add 1 point to user in case of error, because the middleware consumed 1 point before knowing the outcome of the API request.
      const userID = ctx.from?.id!;
      this.serverHandler.rateLimiter.reward(userID, 1);

      throw error;
    }
  }

  createFormattedMessageForNetworkHealth(rawData: NetworkHealthResponse): FormattableString {
    const { blocks, validators } = rawData;

    let totalActiveValidators = 0;
    let totalInactiveValidators = 0;

    validators.forEach((validator: Validator) => {
      // Count active and inactive validators
      if (validator.status === ValidatorStatus.ACTIVE) {
        totalActiveValidators++;
      } else if (validator.status === ValidatorStatus.EXITED) {
        totalInactiveValidators++;
      }
    });

    const message = format`${blockquote(
      format`🔷 ${bold("NETWORK HEALTH")} 🔷

      🏗️ ${bold("Pending Block:")} ${code(blocks[5].height)} 
      🧱 ${bold("Proven Block:")} ${code(blocks[2].height)} 
      🎰 ${bold("Current Slot:")} ${code(blocks[5].header.globalVariables.slotNumber)}

      🟢 ${bold("Total Active Validators:")} ${code(`${totalActiveValidators}`)}
      🔴 ${bold("Total Inactive Validators:")} ${code(`${totalInactiveValidators}`)}
        `
    )}`;

    return message;
  }

  createFormattedMessageForValidatorStats({ validatorStats: rawData, allValidators }: ValidatorStatsCombinedResponse): FormattableString {
    let status = "";
    switch (rawData.status) {
      case ValidatorStatus.ACTIVE:
        status = ValidatorStatusMessage.ACTIVE;
        break;
      case ValidatorStatus.EXITED:
        status = ValidatorStatusMessage.EXITED;
        break;
      case ValidatorStatus.ZOMBIE:
        status = ValidatorStatusMessage.ZOMBIE;
        break;
      case ValidatorStatus.NONE:
        status = ValidatorStatusMessage.NONE;
      default:
        status = "N/A";
    }

    let totalActiveValidators = 0;
    let totalInactiveValidators = 0;

    allValidators?.statuses.forEach((s: Status) => {
      if (s.status === ValidatorStatus.ACTIVE) {
        totalActiveValidators = s.count;
      } else if (s.status === ValidatorStatus.EXITED || s.status === ValidatorStatus.ZOMBIE) {
        totalInactiveValidators += s.count;
      }
    });

    const stakedAmount = Number(ethers.formatUnits(rawData.balance, 18)).toFixed(2);
    const rewards = Number(ethers.formatUnits(rawData.unclaimedRewards, 18)).toFixed(2);

    const formattingRate = (rate: number): string => (isNaN(rate) ? "N/A" : `${rate.toFixed(1)}%`);

    const attestationSuccessRate = (rawData.totalAttestationsSucceeded / (rawData.totalAttestationsSucceeded + rawData.totalAttestationsMissed)) * 100;

    const attestationMissRate = 100 - attestationSuccessRate;

    const proposalSuccessRate = ((rawData.totalBlocksProposed + rawData.totalBlocksMined) / (rawData.totalBlocksProposed + rawData.totalBlocksMined + rawData.totalBlocksMissed)) * 100;

    const proposalMissRate = 100 - proposalSuccessRate;

    const formattedActivationDate = this.formattingDate(rawData.activationDate);
    const formattedRate = {
      attestationSuccessRate: formattingRate(attestationSuccessRate),
      attestationMissRate: formattingRate(attestationMissRate),
      proposalSuccessRate: formattingRate(proposalSuccessRate),
      proposalMissRate: formattingRate(proposalMissRate),
    };

    const message = format`${blockquote(format`🔷 ${bold("VALIDATOR DETAILS")} 🔷

      ℹ️ ${bold("Status:")} ${status}

      📋 ${bold("BASIC INFO")} 📋
      🔑 ${bold("Address:")} ${code(rawData.address)}
      💼 ${bold("Withdrawer Address:")} ${code(rawData.withdrawalCredentials)}
      🕒 ${bold("Activation:")} ${code(formattedActivationDate)}
      💰 ${bold("Staked Amount:")} ${code(`${stakedAmount} STK`)}
      🎁 ${bold("Rewards:")} ${code(`${rewards} STK`)}
      
      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(rawData.totalAttestationsSucceeded)}
      ❌ ${bold("Missed:")} ${code(rawData.totalAttestationsMissed)}
      📈 ${bold("Success Rate:")} ${code(formattedRate.attestationSuccessRate)}
      📉 ${bold("Miss Rate:")} ${code(formattedRate.attestationMissRate)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(`${rawData.totalBlocksProposed + rawData.totalBlocksMined}`)}
      ❌ ${bold("Missed:")} ${code(`${rawData.totalBlocksMissed}`)}
      📈 ${bold("Success Rate:")} ${code(formattedRate.proposalSuccessRate)}
      📉 ${bold("Miss Rate:")} ${code(formattedRate.proposalMissRate)}
      
      ${
        allValidators
          ? format`🌐 ${bold("NETWORK INFO")} 🌐
            🟢 ${bold("Total Active Validators:")} ${code(`${totalActiveValidators}`)}
            🔴 ${bold("Total Inactive Validators:")} ${code(`${totalInactiveValidators}`)}`
          : ""
      }

    `)}`;

    return message;
  }

  createFormattedMessageForValidatorInQueue(rawData: ValidatorInQueue): FormattableString {
    const formattedQueuedAt = this.formattingDate(rawData.queuedAt);

    const VALIDATORS_ACTIVATED_PER_EPOCH = 30;
    const MINUTES_PER_EPOCH = 20;
    const MINUTES_PER_DAY = 1440;
    const MINUTES_PER_HOUR = 60;

    const epochsRequired = Math.ceil(rawData.position / VALIDATORS_ACTIVATED_PER_EPOCH);
    const totalMinutes = epochsRequired * MINUTES_PER_EPOCH;
    const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
    const remainingMinutes = totalMinutes % MINUTES_PER_DAY;
    const hours = Math.floor(remainingMinutes / MINUTES_PER_HOUR);
    const minutes = remainingMinutes % MINUTES_PER_HOUR;

    const formattingUnit = (value: number): string => value.toString().padStart(2, "0");
    const eta = `~${formattingUnit(days)}d:${formattingUnit(hours)}h:${formattingUnit(minutes)}m`;

    const message = format`${blockquote(
      format`🔷 ${bold("VALIDATOR IN QUEUE")} 🔷

      📍 ${bold("Position:")} ${code(rawData.position)}
      ⏳ ${bold("Estimated Time to Activation:")} ${code(eta)}
      🕒 ${bold("Queued Since:")} ${code(formattedQueuedAt)} 
      🔑 ${bold("Address:")} ${code(rawData.address)} 
      🔗 ${bold("Transaction Hash:")} ${code(rawData.transactionHash)}
      
        `
    )}`;

    return message;
  }

  createFormattedMessageForTop10Validators(rawData: TopValidatorsResponse): FormattableString {
    const message = format`${blockquote(
      format`🏆 ${bold("TOP 10 VALIDATORS ALL TIME")} 🏆
    
${code(
  rawData.validators
    .map((validator: TopValidator, _index: number) => {
      let medal = "";
      if (_index === 0) medal = "🥇";
      else if (_index === 1) medal = "🥈";
      else if (_index === 2) medal = "🥉";
      else medal = "🔹";

      return `${medal}${validator.address}`;
    })
    .join("\n")
)}
    
`
    )}`;
    return message;
  }

  createFormattedMessageForEpochStats(rawData: CurrentEpochStatsResponse): FormattableString {
    const attestationSuccessRate = (rawData.currentEpochMetrics.successCount / (rawData.currentEpochMetrics.successCount + rawData.currentEpochMetrics.missCount)) * 100;

    const attestationMissRate = 100 - attestationSuccessRate;

    const proposalSuccessRate =
      (rawData.currentEpochMetrics.epochBlockProducedVolume / (rawData.currentEpochMetrics.epochBlockProducedVolume + rawData.currentEpochMetrics.epochBlockMissedVolume)) * 100;

    const proposalMissRate = 100 - proposalSuccessRate;

    const message = format`${blockquote(
      format`🔷 ${bold("EPOCH DETAILS")} 🔷

      ℹ️ ${bold("Current Epoch:")} ${code(rawData.currentEpochMetrics.epochNumber)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(rawData.currentEpochMetrics.successCount)}
      ❌ ${bold("Missed:")} ${code(rawData.currentEpochMetrics.missCount)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate.toFixed(2)}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate.toFixed(2)}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(`${rawData.currentEpochMetrics.epochBlockProducedVolume}`)}
      ❌ ${bold("Missed:")} ${code(`${rawData.currentEpochMetrics.epochBlockMissedVolume}`)}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate.toFixed(2)}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate.toFixed(2)}%`)}
      `
    )}`;

    return message;
  }

  private async getAllValidators(): Promise<AllValidatorsResponse> {
    const key = `${CacheKeys.ALL_VALIDATORS}`;

    try {
      const cache = await this.cacheHandler.get<AllValidatorsResponse>(key);
      if (cache) return cache;

      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(Referer.DASHTEC);
      const result = await axios.get<AllValidatorsResponse>(`${API.VALIDATORS_STATS}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      proxyAgent && this.checkWichIPmadeRequest(proxyAgent);

      logger.info(`Total validators: ${result.data.validators.length}`);

      await this.cacheHandler.set<AllValidatorsResponse>(key, result.data, { ttl: 7200, smart: true });
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  private getProxyAgentAndBrowserHeaders(referer: string): ProxyAgentAndBrowserHeaders {
    let proxyAgent: HttpsProxyAgent<string> | undefined;
    if (this.PROXY_MODE === "active") {
      proxyAgent = this.proxyHandler.getRandomProxyAgent();
    }

    const userAgent = new UserAgent().toString();
    const browserHeaders: RawAxiosRequestHeaders = {
      "Accept": HeadersProperties.ACCEPT,
      "Accept-Language": HeadersProperties.ACCEPT_LANGUAGE,
      "Connection": HeadersProperties.CONNECTION,
      "Referer": referer,
      "Sec-Fetch-Dest": HeadersProperties.SEC_FETCH_DEST,
      "Sec-Fetch-Mode": HeadersProperties.SEC_FETCH_MODE,
      "Sec-Fetch-Site": HeadersProperties.SEC_FETCH_SITE,
      "TE": HeadersProperties.TE,
      "User-Agent": userAgent,
    };
    return { proxyAgent, browserHeaders };
  }

  private checkWichIPmadeRequest(proxyAgent: HttpsProxyAgent<string>): void {
    const usedIP = proxyAgent.connectOpts.host;
    if (usedIP) logger.debug(`Request made with IP: ${usedIP}`);
  }

  private formattingDate(date: DateArg<Date>): string {
    return formatDate(date, "dd/MM/yyyy, HH:mm:ss");
  }

  handleError(error: unknown): string {
    const defaultErrorMessage = "An error occurred. Please try again later.";

    if (axios.isAxiosError(error)) {
      const customErrorMessage = (error as AxiosError<ErrorResponse>).response?.data.error;
      const errorMessage = customErrorMessage ? customErrorMessage : error.message;
      logger.error(`Axios Error: ${errorMessage}`);

      if (customErrorMessage?.includes("Validator not found."))
        return `${customErrorMessage}\n\nCheck if you're in the validators queue with the command:\n\n/queue <wallet_address>\n\nOtherwise, contact Aztec Team.`;

      return defaultErrorMessage;
    }
    const unknownErrorMessage = (error as Error).message;
    logger.error(`Unknown Error: ${unknownErrorMessage}`);

    if (unknownErrorMessage.includes("Peer ID not found.") || unknownErrorMessage.includes("Validator not found in queue.")) return unknownErrorMessage;

    return defaultErrorMessage;
  }
}
