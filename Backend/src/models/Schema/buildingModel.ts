import mongoose, { Schema, Model } from "mongoose";
import { IBuilding } from "../types/buildingInterface.js";
import { floorSchema } from "./FloorsModel.js";
import { nodeSchema } from "./nodeSchema.js";

export const buildingSchema = new Schema<IBuilding>({
  name: { type: String, required: true, trim: true },
  mapCreator: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  floors: [floorSchema],
  nodes: [nodeSchema],
});

export const BuildingModel: Model<IBuilding> = mongoose.model<IBuilding>(
  "Building",
  buildingSchema,
);

export default BuildingModel;
