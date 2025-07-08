export interface NodeInfoResponse {
  peers: Peer[] | null;
  next_pagination_token: string;
  total_peers: number;
}

export interface Peer {
  id: string;
  created_at: string;
  last_seen: string;
  client: string;
  multi_addresses: MultiAddress[];
  protocols: any;
  block_height: any;
  spec_version: any;
  is_synced: any;
}

export interface MultiAddress {
  maddr: string;
  ip_info: IpInfo[];
}

export interface IpInfo {
  ip_address: string;
  port: number;
  as_name: string;
  as_number: number;
  city_name: string;
  country_name: string;
  country_iso: string;
  continent_name: string;
  continent_code: string;
  latitude: number;
  longitude: number;
}
