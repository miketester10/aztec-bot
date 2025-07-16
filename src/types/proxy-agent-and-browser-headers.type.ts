import { RawAxiosRequestHeaders } from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

export type ProxyAgentAndBrowserHeaders = {
  proxyAgent: HttpsProxyAgent<string>;
  browserHeaders: RawAxiosRequestHeaders;
};
