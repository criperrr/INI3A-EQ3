export interface Point {
  lat: number;
  lng: number;
}

export interface CreateMarketDTO {
  name: string;
  location: Point;
}

export type UpdateMarketDTO = Partial<CreateMarketDTO>;
