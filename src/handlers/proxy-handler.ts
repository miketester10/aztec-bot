import { HttpsProxyAgent } from "https-proxy-agent";
import { logger } from "../logger/logger";
import proxies from "../../proxies.json";

export class ProxyHandler {
  private static instance: ProxyHandler;
  private readonly proxiesList: string[] = proxies;
  private usedProxies: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): ProxyHandler {
    if (!ProxyHandler.instance) {
      ProxyHandler.instance = new ProxyHandler();
    }
    return ProxyHandler.instance;
  }

  public getRandomProxyAgent(): HttpsProxyAgent<string> {
    if (this.usedProxies.size === this.proxiesList.length) {
      this.usedProxies.clear();
    }

    const availableProxies = this.proxiesList.filter(
      (proxy: string) => !this.usedProxies.has(proxy)
    );
    const randomProxy =
      availableProxies[Math.floor(Math.random() * availableProxies.length)];
    this.usedProxies.add(randomProxy);

    const [host, port, username, password] = randomProxy.split(":");
    const proxyUrl = `http://${username}:${password}@${host}:${port}`;
    // logger.warn(`Proxy List lenght: ${this.proxiesList.length}`);
    // logger.warn(`Used proxies lenght: ${this.usedProxies.size}`);
    // logger.warn(Array.from(this.usedProxies));
    logger.debug(`Using proxy: ${proxyUrl}`);

    return new HttpsProxyAgent(proxyUrl);
  }
}
