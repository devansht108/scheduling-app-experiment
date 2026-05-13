import axios from "axios";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const BASE_URL = "https://api.vapi.ai";

export const createVapiAssistant = async (serverUrl: string) => {
  try {
    if (!VAPI_ASSISTANT_ID) {
      throw new Error("VAPI_ASSISTANT_ID missing in .env");
    }

    const response = await axios.get(
      `${BASE_URL}/assistant/${VAPI_ASSISTANT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Error loading VAPI assistant:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getAssistants = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/assistant`, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching assistants:", error.message);
    return [];
  }
};

export const getPhoneNumbers = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/phone-number`, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching phone numbers:", error.message);
    return [];
  }
};