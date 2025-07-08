export interface ActiveNodesByCountryResponse {
  countries: Country[]
}

export interface Country {
  country_name: string
  country_code: string
  count: number
  percentage?: string
}