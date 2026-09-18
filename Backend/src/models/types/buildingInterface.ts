import { Document, Types } from "mongoose";
import { IFloor } from "./floorInterface.js";
import { INode } from "./nodeInterface.js";

export interface IBuilding extends Document {
  name: string;
  mapCreator: Types.ObjectId;
  floors: IFloor[];
  nodes: INode[];
}
