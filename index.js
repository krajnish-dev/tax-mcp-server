import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "MCP Server",
  version: "1.0.0"
});
console.log("MCP server initialized.");

// Store the handler reference
let getWeatherHandler = null;

getWeatherHandler = async ({ city }) => {
  try {
    // Step 1: Get coordinates for the city
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`
    );
    const geoData = await geoResponse.json();

    // Handle city not found
    if (!geoData.results || geoData.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `Sorry, I couldn't find a city named "${city}". Please check the spelling and try again.`
          }
        ]
      };
    }

    // Step 2: Get weather data using coordinates
    const { latitude, longitude } = geoData.results[0];
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code&hourly=temperature_2m,precipitation&forecast_days=1`
    );
    const weatherData = await weatherResponse.json();

    // Return the complete weather data as JSON
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(weatherData, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error fetching weather data: ${error.message}`
        }
      ]
    };
  }
};

server.tool(
  'get-weather',
  'Tool to get the weather of a city',
  {
    city: z.string().describe("The name of the city to get the weather for")
  },
  getWeatherHandler
);

// HTTP endpoint for MCP tool
app.post("/mcp", async (req, res) => {
  const { tool, params } = req.body;
  if (tool !== "get-weather" || !params) {
    return res.status(400).json({ error: "Missing or invalid 'tool' or 'params' in request body." });
  }
  try {
    const result = await getWeatherHandler(params);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP HTTP server listening on port ${PORT}`);
});