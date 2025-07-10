import { HttpsProxyAgent } from "https-proxy-agent";
import { logger } from "../logger/logger";

export class ProxyHandler {
  private static instance: ProxyHandler;
  //   private readonly proxyListAllUser: string[] = [
  //     "38.154.227.167:5868:kwlgteuf:ccj5adj8for4",
  //     "198.23.239.134:6540:kwlgteuf:ccj5adj8for4",
  //     "207.244.217.165:6712:kwlgteuf:ccj5adj8for4",
  //     "107.172.163.27:6543:kwlgteuf:ccj5adj8for4",
  //     "216.10.27.159:6837:kwlgteuf:ccj5adj8for4",
  //     "136.0.207.84:6661:kwlgteuf:ccj5adj8for4",
  //     "64.64.118.149:6732:kwlgteuf:ccj5adj8for4",
  //     "142.147.128.93:6593:kwlgteuf:ccj5adj8for4",
  //     "104.239.105.125:6655:kwlgteuf:ccj5adj8for4",
  //     "206.41.172.74:6634:kwlgteuf:ccj5adj8for4",

  //     "38.154.227.167:5868:vbphlqtb:osndmjqemiq9",
  //     "198.23.239.134:6540:vbphlqtb:osndmjqemiq9",
  //     "207.244.217.165:6712:vbphlqtb:osndmjqemiq9",
  //     "107.172.163.27:6543:vbphlqtb:osndmjqemiq9",
  //     "216.10.27.159:6837:vbphlqtb:osndmjqemiq9",
  //     "136.0.207.84:6661:vbphlqtb:osndmjqemiq9",
  //     "64.64.118.149:6732:vbphlqtb:osndmjqemiq9",
  //     "142.147.128.93:6593:vbphlqtb:osndmjqemiq9",
  //     "104.239.105.125:6655:vbphlqtb:osndmjqemiq9",
  //     "206.41.172.74:6634:vbphlqtb:osndmjqemiq9",

  //     "38.154.227.167:5868:buvvlriw:6wqgicecfuvn",
  //     "198.23.239.134:6540:buvvlriw:6wqgicecfuvn",
  //     "207.244.217.165:6712:buvvlriw:6wqgicecfuvn",
  //     "107.172.163.27:6543:buvvlriw:6wqgicecfuvn",
  //     "216.10.27.159:6837:buvvlriw:6wqgicecfuvn",
  //     "136.0.207.84:6661:buvvlriw:6wqgicecfuvn",
  //     "64.64.118.149:6732:buvvlriw:6wqgicecfuvn",
  //     "142.147.128.93:6593:buvvlriw:6wqgicecfuvn",
  //     "104.239.105.125:6655:buvvlriw:6wqgicecfuvn",
  //     "206.41.172.74:6634:buvvlriw:6wqgicecfuvn",

  //     "38.154.227.167:5868:iznswdaj:3xnod0d4etmi",
  //     "198.23.239.134:6540:iznswdaj:3xnod0d4etmi",
  //     "207.244.217.165:6712:iznswdaj:3xnod0d4etmi",
  //     "107.172.163.27:6543:iznswdaj:3xnod0d4etmi",
  //     "216.10.27.159:6837:iznswdaj:3xnod0d4etmi",
  //     "136.0.207.84:6661:iznswdaj:3xnod0d4etmi",
  //     "64.64.118.149:6732:iznswdaj:3xnod0d4etmi",
  //     "142.147.128.93:6593:iznswdaj:3xnod0d4etmi",
  //     "104.239.105.125:6655:iznswdaj:3xnod0d4etmi",
  //     "206.41.172.74:6634:iznswdaj:3xnod0d4etmi",
  //   ];
  private readonly proxiesList: string[] = [
    "38.154.227.167:5868:kwlgteuf:ccj5adj8for4",
    "198.23.239.134:6540:kwlgteuf:ccj5adj8for4",
    "207.244.217.165:6712:kwlgteuf:ccj5adj8for4",
    "107.172.163.27:6543:kwlgteuf:ccj5adj8for4",
    "216.10.27.159:6837:kwlgteuf:ccj5adj8for4",
    "136.0.207.84:6661:kwlgteuf:ccj5adj8for4",
    "64.64.118.149:6732:kwlgteuf:ccj5adj8for4",
    "142.147.128.93:6593:kwlgteuf:ccj5adj8for4",
    "104.239.105.125:6655:kwlgteuf:ccj5adj8for4",
    "206.41.172.74:6634:kwlgteuf:ccj5adj8for4",
  ];
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
