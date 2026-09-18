import { Types } from "mongoose";
import { IAdjacencyItem } from "./adjacencyItemInterface.js";

export interface INode {
  _id?: Types.ObjectId;
  // Conjunction nodes (plain intersections, stairs, bridges) don't need a name.
  name?: string;
  x: number;
  y: number;
  floorId: string;
  adjacencyList: IAdjacencyItem[];
}
