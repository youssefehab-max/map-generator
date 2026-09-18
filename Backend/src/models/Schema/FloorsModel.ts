import { Schema } from "mongoose";
import { IFloor } from "../types/floorInterface.js";

export const floorSchema = new Schema<IFloor>(
  {
    id: { type: String, required: true },
    image: { type: String, required: true },
  },
  { _id: false },
);
