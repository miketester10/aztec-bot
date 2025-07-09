import axios, { AxiosError, RawAxiosRequestHeaders } from "axios";
import { ValidatorStatsResponse } from "../interfaces/validator-stats-response.interface";
import {
  TopValidatorsResponse,
  TopValidator,
} from "../interfaces/top-validators-response.interface";
import { CurrentEpochStatsResponse } from "../interfaces/current-epoch-stats-response.interface";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { API } from "../consts/api";
import { logger } from "../logger/logger";
import {
  blockquote,
  bold,
  code,
  format,
  FormattableString,
  italic,
} from "gramio";
import {
  validatorStatus,
  validatorStatusMessage,
} from "../consts/validator-status";
import { NetworkHealthResponse } from "../interfaces/network-health-response.interface";
import {
  ActiveNodesByCountryResponse,
  Country,
} from "../interfaces/active-nodes-by-country-response.interface";
import { NodeInfoResponse } from "../interfaces/node-info-response.interface";
import { HttpsProxyAgent } from "https-proxy-agent";
import UserAgent from "user-agents";
import { format as formatDate, parseISO } from "date-fns";
import { ProxyHandler } from "./proxy-handler";

export class AztecHandler {
  private static _instance: AztecHandler;
  private readonly proxyHandler: ProxyHandler = ProxyHandler.getInstance();

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
        `Pending Block: ${result.data[4].height}, Proven Block: ${result.data[1].height}, Current Slot: ${result.data[4].header.globalVariables.slotNumber}`
      );

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getActiveNodesByCountry(): Promise<ActiveNodesByCountryResponse> {
    try {
      const proxyAgent = this.proxyHandler.getRandomProxyAgent();
      const browserHeaders = this.getBrowserHeaders(); // headers più simili al browser per evitare possibili ban
      const result = await axios.get<ActiveNodesByCountryResponse>(
        API.ACTIVE_NODES_BY_COUNTRY,
        {
          httpsAgent: proxyAgent,
          headers: browserHeaders,
        }
      );

      await this.checkWichIPmadeRequest(proxyAgent);

      const activeNodes = result.data.countries.reduce(
        (acc: number, country: Country) => acc + country.count,
        0
      );
      logger.info(`Active nodes: ${activeNodes}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getNodeInfo(peerId: string): Promise<NodeInfoResponse> {
    try {
      const proxyAgent = this.proxyHandler.getRandomProxyAgent();
      const browserHeaders = this.getBrowserHeaders(); // headers più simili al browser per evitare possibili ban
      const result = await axios.get<NodeInfoResponse>(
        `${API.NODE_INFO}?id=${peerId}`,
        {
          httpsAgent: proxyAgent,
          headers: browserHeaders,
        }
      );

      await this.checkWichIPmadeRequest(proxyAgent);

      if (!result.data.peers) {
        throw new Error("Peer ID not found.");
      }
      logger.info(`Peer ID: ${result.data.peers[0].id}`);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getValidatorStats(
    validatorAddress: string
  ): Promise<ValidatorStatsResponse> {
    try {
      const proxyAgent = this.proxyHandler.getRandomProxyAgent();
      const browserHeaders = this.getBrowserHeaders(); // headers più simili al browser per evitare possibili ban
      const result = await axios.get<ValidatorStatsResponse>(
        `${API.VALIDATOR_STATS}/${validatorAddress}`,
        {
          httpsAgent: proxyAgent,
          headers: browserHeaders,
        }
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
      const proxyAgent = this.proxyHandler.getRandomProxyAgent();
      const browserHeaders = this.getBrowserHeaders(); // headers più simili al browser per evitare possibili ban
      // const currentEpoch = (await this.getCurrentEpochStats())
      //   .currentEpochMetrics.epochNumber;
      const result = await axios.get<TopValidatorsResponse>(
        `${API.TOP_VALIDATORS}?startEpoch=1&endEpoch=99999`,
        {
          httpsAgent: proxyAgent,
          headers: browserHeaders,
        }
      );

      await this.checkWichIPmadeRequest(proxyAgent);

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  async getCurrentEpochStats(): Promise<CurrentEpochStatsResponse> {
    try {
      // throw new Error("API TEMPORARY NOT AVAILABLE.");
      const proxyAgent = this.proxyHandler.getRandomProxyAgent();
      const browserHeaders = this.getBrowserHeaders(); // headers più simili al browser per evitare possibili ban
      const result = await axios.get<CurrentEpochStatsResponse>(
        API.CURRENT_EPOCH_STATS,
        {
          httpsAgent: proxyAgent,
          headers: browserHeaders,
        }
      );

      await this.checkWichIPmadeRequest(proxyAgent);

      if (
        result.data.totalActiveValidators.toString().includes("Stolen Data") ||
        result.data.currentEpochMetrics.epochNumber === 9999
      ) {
        throw new Error("IP banned by DASHTEC API");
      }
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

  createFormattedMessageForActiveNodesByCountry(
    rawData: ActiveNodesByCountryResponse
  ): FormattableString {
    const totalActiveNodes = rawData.countries.reduce(
      (acc: number, country: Country) => acc + country.count,
      0
    );

    const countriesWithPercentage: Country[] = rawData.countries.map(
      (c: Country) => {
        const percentage = ((c.count / totalActiveNodes) * 100).toFixed(2);
        return {
          ...c,
          percentage,
        };
      }
    );

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

      return format`${bold(`${medal} ${c.country_name}:`)} ${code(
        `${c.count}`
      )} ${italic(`(${c.percentage}%)`)}\n`;
    })}`
    )}`;

    return message;
  }

  createFormattedMessageForNodeInfo(
    rawData: NodeInfoResponse
  ): FormattableString {
    const version = rawData.peers![0].client;
    const country =
      rawData.peers![0].multi_addresses[0].ip_info[0].country_name;
    const city = rawData.peers![0].multi_addresses[0].ip_info[0].city_name;
    const location = `${city ? `${country}, ${city}` : country}`;
    const coordinate = `Lat. ${
      rawData.peers![0].multi_addresses[0].ip_info[0].latitude
    } - Long. ${rawData.peers![0].multi_addresses[0].ip_info[0].longitude}`;

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

      ℹ️ ${bold("Status:")} ${status} 

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

      ℹ️ ${bold("Current Epoch:")} ${code(
        rawData.currentEpochMetrics.epochNumber
      )}

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

    if (unknownErrorMessage.includes("Peer ID not found."))
      return unknownErrorMessage;

    return defaultErrorMessage;
  }

  private getBrowserHeaders(): RawAxiosRequestHeaders {
    const userAgent = new UserAgent().toString();
    const headers = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
      Referer: "https://www.dashtec.xyz/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      TE: "trailers",
      "User-Agent": userAgent,
    };
    return headers;
  }

  private async checkWichIPmadeRequest(
    proxyAgent: HttpsProxyAgent<string>
  ): Promise<void> {
    try {
      const result = await axios.get("https://ifconfig.me", {
        httpsAgent: proxyAgent,
      });
      logger.debug(`Request made with IP: ${result.data}`);
    } catch (error) {
      logger.error(`Error while getting IP: ${(error as Error).message}`);
    }
  }
}
