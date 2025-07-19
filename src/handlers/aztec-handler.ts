import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";
import { ValidatorStatsResponse } from "../interfaces/validator-stats-response.interface";
import { ValidatorStatsCombinedResponse } from "../types/validator-stats-combined-response.type";
import { AllValidatorsResponse, Validator } from "../interfaces/all-validators-response.interface";
import { AllValidatorsByAztecResponse, Validator as ValidatorByAztec } from "../interfaces/all-validators-by-aztec-response.interface";
import { TopValidatorsResponse, TopValidator } from "../interfaces/top-validators-response.interface";
import { CurrentEpochStatsResponse } from "../interfaces/current-epoch-stats-response.interface";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { API } from "../consts/api";
import { logger } from "../logger/logger";
import { blockquote, bold, code, format, FormattableString, italic } from "gramio";
import { validatorStatus, validatorStatusByAztec, validatorStatusMessage } from "../consts/validator-status";
import { Block, NetworkHealthResponse } from "../interfaces/network-health-response.interface";
import { ActiveNodesByCountryResponse, Country } from "../interfaces/active-nodes-by-country-response.interface";
import { NodeInfoResponse } from "../interfaces/node-info-response.interface";
import { HttpsProxyAgent } from "https-proxy-agent";
import UserAgent from "user-agents";
import { format as formatDate, parseISO } from "date-fns";
import { ProxyHandler } from "./proxy-handler";
import { headersProperties, referer } from "../consts/headers";
import { ProxyAgentAndBrowserHeaders } from "../types/proxy-agent-and-browser-headers.type";
import { ServerHandler } from "./server-handler";
import { MyMessageContext } from "../interfaces/custom-context.interface";
import { CacheHandler } from "./cache-handler";
import { cacheKeys } from "../consts/cache-keys";

export class AztecHandler {
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

  async getNetworkHealth(): Promise<NetworkHealthResponse> {
    try {
      const [{ data: blocks }, { data: validators }] = await Promise.all([axios.get<Block[]>(API.NETWORK_HEALTH), axios.get<AllValidatorsByAztecResponse>(API.VALIDATORS_STATS_BY_AZTEC)]);

      logger.info(`Pending Block: ${blocks[4].height}, Proven Block: ${blocks[1].height}, Current Slot: ${blocks[4].header.globalVariables.slotNumber}`);

      return { blocks, validators };
    } catch (error) {
      throw error;
    }
  }

  async getActiveNodesByCountry(): Promise<ActiveNodesByCountryResponse> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.NETHERMIND);
      const result = await axios.get<ActiveNodesByCountryResponse>(API.ACTIVE_NODES_BY_COUNTRY, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

      const activeNodes = result.data.countries.reduce((acc: number, country: Country) => acc + country.count, 0);
      logger.info(`Active nodes: ${activeNodes}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getNodeInfo(peerId: string): Promise<NodeInfoResponse> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.NETHERMIND);
      const result = await axios.get<NodeInfoResponse>(`${API.NODE_INFO}?id=${peerId}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

      if (!result.data.peers) {
        throw new Error("Peer ID not found.");
      }
      logger.info(`Peer ID: ${result.data.peers[0].id}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getValidatorStats(validatorAddress: string): Promise<ValidatorStatsCombinedResponse> {
    const key = `${cacheKeys.VALIDATOR_STATS}:${validatorAddress}`;

    try {
      const cache = await this.cacheHandler.get<ValidatorStatsCombinedResponse>(key);
      if (cache) {
        logger.info("🛢️ Using cache");
        return cache;
      }

      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.DASHTEC);
      const result = await axios.get<ValidatorStatsResponse>(`${API.VALIDATORS_STATS}/${validatorAddress}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

      logger.info(`Validator status: ${result.data.status}`);

      let allValidators: AllValidatorsResponse | undefined;
      try {
        allValidators = await this.getAllValidators();
      } catch (error) {
        const unknownError = error as Error;
        logger.error(`ERROR IN getAllValidators(): ${unknownError.message}`);
      }

      const response: ValidatorStatsCombinedResponse = {
        validatorStats: result.data,
        allValidators,
      };

      await this.cacheHandler.set<ValidatorStatsCombinedResponse>(key, response);
      return { validatorStats: result.data, allValidators };
    } catch (error) {
      throw error;
    }
  }

  async getTop10Validators(): Promise<TopValidatorsResponse> {
    const key = cacheKeys.TOP_10_VALIDATORS;

    try {
      const cache = await this.cacheHandler.get<TopValidatorsResponse>(key);
      if (cache) {
        logger.info("🛢️ Using cache");
        return cache;
      }

      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.DASHTEC);
      const result = await axios.get<TopValidatorsResponse>(`${API.TOP_VALIDATORS}?startEpoch=1&endEpoch=99999`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

      await this.cacheHandler.set<TopValidatorsResponse>(key, result.data);
      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentEpochStats(ctx: MyMessageContext): Promise<CurrentEpochStatsResponse> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.DASHTEC);
      const result = await axios.get<CurrentEpochStatsResponse>(API.CURRENT_EPOCH_STATS, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

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

    validators.forEach((validator: ValidatorByAztec) => {
      if (validator.status === validatorStatusByAztec.ACTIVE) {
        totalActiveValidators++;
      } else if (validator.status === validatorStatusByAztec.EXITED) {
        totalInactiveValidators++;
      }
    });

    const message = format`${blockquote(
      format`🔷 ${bold("NETWORK HEALTH")} 🔷

      🏗️ ${bold("Pending Block:")} ${code(blocks[4].height)} 
      🧱 ${bold("Proven Block:")} ${code(blocks[1].height)} 
      🎰 ${bold("Current Slot:")} ${code(blocks[4].header.globalVariables.slotNumber)}

      🟢 ${bold("Total Active Validators:")} ${code(`${totalActiveValidators}`)}
      🔴 ${bold("Total Inactive Validators:")} ${code(`${totalInactiveValidators}`)}
        `
    )}`;

    return message;
  }

  createFormattedMessageForActiveNodesByCountry(rawData: ActiveNodesByCountryResponse): FormattableString {
    const totalActiveNodes = rawData.countries.reduce((acc: number, country: Country) => acc + country.count, 0);

    const countriesWithPercentage: Country[] = rawData.countries.map((c: Country) => {
      const percentage = ((c.count / totalActiveNodes) * 100).toFixed(2);
      return {
        ...c,
        percentage,
      };
    });

    const top10Countries: Country[] = countriesWithPercentage.slice(0, 10);

    const message = format`${blockquote(
      format`🔷 ${bold("ACTIVE NODES INFO")} 🔷

   ℹ️ ${bold("Total:")} ${code(`${totalActiveNodes}`)} 

   🌍 ${bold("TOP 10 COUNTRIES")} 🌍
    ${top10Countries.map((c: Country, _index: number) => {
      let medal = "";
      if (_index === 0) medal = "🥇";
      else if (_index === 1) medal = "🥈";
      else if (_index === 2) medal = "🥉";
      else medal = "🔹";

      return format`${bold(`${medal} ${c.country_name}:`)} ${code(`${c.count}`)} ${italic(`(${c.percentage}%)`)}\n`;
    })}`
    )}`;

    return message;
  }

  createFormattedMessageForNodeInfo(rawData: NodeInfoResponse): FormattableString {
    const version = rawData.peers![0].client;
    const country = rawData.peers![0].multi_addresses[0].ip_info[0].country_name;
    const city = rawData.peers![0].multi_addresses[0].ip_info[0].city_name;
    const location = `${city ? `${country}, ${city}` : country}`;
    const coordinate = `Lat. ${rawData.peers![0].multi_addresses[0].ip_info[0].latitude} - Long. ${rawData.peers![0].multi_addresses[0].ip_info[0].longitude}`;

    const firstSeen = parseISO(rawData.peers![0].created_at);
    const lastSeen = parseISO(rawData.peers![0].last_seen);

    const formattedFirstSeen = formatDate(firstSeen, "dd/MM/yyyy, HH:mm:ss");
    const formattedLastSeen = formatDate(lastSeen, "dd/MM/yyyy, HH:mm:ss");

    const message = format`${blockquote(
      format`🔷 ${bold("NODE INFO")} 🔷

   ℹ️ ${bold("Version:")} ${code(`${version}`)} 
   
   🌍 ${bold("Location:")} ${code(`${location}`)}
   🎯 ${bold("Coordinates:")} ${code(`${coordinate}`)}
   
   🌱 ${bold("First seen:")} ${code(`${formattedFirstSeen}`)}
   👀 ${bold("Last seen:")} ${code(`${formattedLastSeen}`)}
   
   `
    )}`;

    return message;
  }

  createFormattedMessageForValidatorStats({ validatorStats: rawData, allValidators }: ValidatorStatsCombinedResponse): FormattableString {
    let status = "";
    switch (rawData.status) {
      case validatorStatus.ACTIVE:
        status = validatorStatusMessage.ACTIVE;
        break;
      case validatorStatus.EXITED:
        status = validatorStatusMessage.EXITED;
        break;
    }

    const showRankingAndNetworkInfo = allValidators ? true : false;
    // Sort validators descending by performanceScore
    const sortedValidatorsDesc = allValidators?.validators.sort((a: Validator, b: Validator) => b.performanceScore - a.performanceScore);

    let totalActiveValidators = 0;
    let totalInactiveValidators = 0;

    const validatorRank = { rank: -1, emoji: "" };

    sortedValidatorsDesc?.forEach((validator, _index) => {
      // Find the rank and emoji for the target validator
      if (validator.address === rawData.address) {
        validatorRank.rank = _index + 1;
        validatorRank.emoji = _index === 0 ? "🥇" : _index === 1 ? "🥈" : _index === 2 ? "🥉" : "";
      }

      // Count active and inactive validators
      if (validator.status === validatorStatus.ACTIVE) {
        totalActiveValidators++;
      } else if (validator.status === validatorStatus.EXITED) {
        totalInactiveValidators++;
      }
    });

    const attestationSuccessRate = ((rawData.totalAttestationsSucceeded / (rawData.totalAttestationsSucceeded + rawData.totalAttestationsMissed)) * 100).toFixed(1);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(1);

    const proposalSuccessRate = (((rawData.totalBlocksProposed + rawData.totalBlocksMined) / (rawData.totalBlocksProposed + rawData.totalBlocksMined + rawData.totalBlocksMissed)) * 100).toFixed(1);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(1);

    const statusAndRankingTemplate = showRankingAndNetworkInfo
      ? format`ℹ️ ${bold("Status:")} ${status} 
               🏆 ${bold("Ranking:")} ${code(`${validatorRank.rank}${validatorRank.emoji}`)}`
      : format`ℹ️ ${bold("Status:")} ${status}`;

    const networkInfoTemplate = showRankingAndNetworkInfo
      ? format`🌐 ${bold("NETWORK INFO")} 🌐
      🟢 ${bold("Total Active Validators:")} ${code(`${totalActiveValidators}`)}
      🔴 ${bold("Total Inactive Validators:")} ${code(`${totalInactiveValidators}`)}`
      : "";

    const message = format`${blockquote(format`🔷 ${bold("VALIDATOR DETAILS")} 🔷

      ${statusAndRankingTemplate}

      📋 ${bold("BASIC INFO")} 📋
      🔑 ${bold("Address:")} ${code(rawData.address)}
      💰 ${bold("Staked Amount:")} ${code("100.00 STK")}
      👤 ${bold("Proposer Address:")} ${code(rawData.proposerAddress)}
      💼 ${bold("Withdrawer Address:")} ${code(rawData.withdrawalCredentials)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(rawData.totalAttestationsSucceeded)}
      ❌ ${bold("Missed:")} ${code(rawData.totalAttestationsMissed)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(`${rawData.totalBlocksProposed + rawData.totalBlocksMined}`)}
      ❌ ${bold("Missed:")} ${code(`${rawData.totalBlocksMissed}`)}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}
      
      ${networkInfoTemplate}

    `)}`;

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
    const attestationSuccessRate = ((rawData.currentEpochMetrics.successCount / (rawData.currentEpochMetrics.successCount + rawData.currentEpochMetrics.missCount)) * 100).toFixed(2);

    const attestationMissRate = (100 - Number(attestationSuccessRate)).toFixed(2);

    const proposalSuccessRate = (
      (rawData.currentEpochMetrics.epochBlockProducedVolume / (rawData.currentEpochMetrics.epochBlockProducedVolume + rawData.currentEpochMetrics.epochBlockMissedVolume)) *
      100
    ).toFixed(2);

    const proposalMissRate = (100 - Number(proposalSuccessRate)).toFixed(2);

    const message = format`${blockquote(
      format`🔷 ${bold("EPOCH DETAILS")} 🔷

      ℹ️ ${bold("Current Epoch:")} ${code(rawData.currentEpochMetrics.epochNumber)}

      📊 ${bold("ATTESTATION PERFORMANCE")} 📊 
      ✅ ${bold("Successful:")} ${code(rawData.currentEpochMetrics.successCount)}
      ❌ ${bold("Missed:")} ${code(rawData.currentEpochMetrics.missCount)}
      📈 ${bold("Success Rate:")} ${code(`${attestationSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${attestationMissRate}%`)}

      📊 ${bold("PROPOSAL PERFORMANCE")} 📊     
      ✅ ${bold("Successful (Proposed/Mined):")} ${code(`${rawData.currentEpochMetrics.epochBlockProducedVolume}`)}
      ❌ ${bold("Missed:")} ${code(`${rawData.currentEpochMetrics.epochBlockMissedVolume}`)}
      📈 ${bold("Success Rate:")} ${code(`${proposalSuccessRate}%`)}
      📉 ${bold("Miss Rate:")} ${code(`${proposalMissRate}%`)}

      🌐 ${bold("NETWORK INFO")} 🌐
      🟢 ${bold("Total Active Validators:")} ${code(`${rawData.totalActiveValidators}`)}
      🔴 ${bold("Total Inactive Validators:")} ${code(`${rawData.totalInactiveValidators}`)}
      
      
      `
    )}`;

    return message;
  }

  private async getAllValidators(): Promise<AllValidatorsResponse> {
    try {
      const { proxyAgent, browserHeaders } = this.getProxyAgentAndBrowserHeaders(referer.DASHTEC);
      const result = await axios.get<AllValidatorsResponse>(`${API.VALIDATORS_STATS}`, {
        httpsAgent: proxyAgent,
        headers: browserHeaders,
      });

      this.checkWichIPmadeRequest(proxyAgent);

      logger.info(`Total validators: ${result.data.validators.length}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  private getProxyAgentAndBrowserHeaders(referer: string): ProxyAgentAndBrowserHeaders {
    const proxyAgent = this.proxyHandler.getRandomProxyAgent();

    const userAgent = new UserAgent().toString();
    const browserHeaders: RawAxiosRequestHeaders = {
      "Accept": headersProperties.ACCEPT,
      "Accept-Language": headersProperties.ACCEPT_LANGUAGE,
      "Connection": headersProperties.CONNECTION,
      "Referer": referer,
      "Sec-Fetch-Dest": headersProperties.SEC_FETCH_DEST,
      "Sec-Fetch-Mode": headersProperties.SEC_FETCH_MODE,
      "Sec-Fetch-Site": headersProperties.SEC_FETCH_SITE,
      "TE": headersProperties.TE,
      "User-Agent": userAgent,
    };
    return { proxyAgent, browserHeaders };
  }

  private checkWichIPmadeRequest(proxyAgent: HttpsProxyAgent<string>): void {
    const usedIP = proxyAgent.connectOpts.host;
    if (usedIP) logger.debug(`Request made with IP: ${usedIP}`);
  }

  handleError(error: unknown): string {
    const defaultErrorMessage = "An error occurred. Please try again later.";

    if (axios.isAxiosError(error)) {
      const customErrorMessage = (error as AxiosError<ErrorResponse>).response?.data.error;
      const errorMessage = customErrorMessage ? customErrorMessage : error.message;
      logger.error(`Axios Error: ${errorMessage}`);

      if (customErrorMessage?.includes("Validator not found.")) return customErrorMessage;

      return defaultErrorMessage;
    }
    const unknownErrorMessage = (error as Error).message;
    logger.error(`Unknown Error: ${unknownErrorMessage}`);

    if (unknownErrorMessage.includes("Peer ID not found.")) return unknownErrorMessage;

    return defaultErrorMessage;
  }
}
