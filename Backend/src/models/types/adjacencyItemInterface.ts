import { Types } from "mongoose";

export interface IAdjacencyItem {
  node: Types.ObjectId;
  weight: number;
}
