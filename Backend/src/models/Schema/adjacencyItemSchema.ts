import { Schema } from "mongoose";
import { IAdjacencyItem } from "../types/adjacencyItemInterface.js";

export const adjacencyItemSchema = new Schema<IAdjacencyItem>(
  {
    node: { type: Schema.Types.ObjectId, required: true },
    weight: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);
