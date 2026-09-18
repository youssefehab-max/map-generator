import { Schema } from "mongoose";
import { INode } from "../types/nodeInterface.js";
import { adjacencyItemSchema } from "./adjacencyItemSchema.js";

export const nodeSchema = new Schema<INode>({
  name: { type: String, required: false, default: "" },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  floorId: { type: String, required: true },
  adjacencyList: [adjacencyItemSchema],
});
