import HotelSettings from "../models/HotelSettings.js";

export async function getSettings() {
  try {
    return await HotelSettings.findOneAndUpdate(
      { key: "main" },
      { $setOnInsert: { key: "main" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code === 11000) return HotelSettings.findOne({ key: "main" });
    throw error;
  }
}
