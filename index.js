import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import dotenv from "dotenv";


dotenv.config();
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

// Hardcoded tax rates for jurisdictions
const taxRates = {
  "Alabama": 0.04,
  "Alaska": 0.00,
  "Arizona": 0.056,
  "Arkansas": 0.065,
  "California": 0.06,
  "Colorado": 0.029,
  "Connecticut": 0.0635,
  "Delaware": 0.00,
  "District of Columbia": 0.06,
  "Florida": 0.06,
  "Georgia": 0.04,
  "Hawaii": 0.04,
  "Idaho": 0.06,
  "Illinois": 0.0625,
  "Indiana": 0.07,
  "Iowa": 0.06,
  "Kansas": 0.065,
  "Kentucky": 0.06,
  "Louisiana": 0.05,
  "Maine": 0.055,
  "Maryland": 0.06,
  "Massachusetts": 0.0625,
  "Michigan": 0.06,
  "Minnesota": 0.06875,
  "Mississippi": 0.07,
  "Missouri": 0.04225,
  "Montana": 0.00,
  "Nebraska": 0.055,
  "Nevada": 0.046,
  "New Hampshire": 0.00,
  "New Jersey": 0.06625,
  "New Mexico": 0.0513,
  "New York": 0.04,
  "North Carolina": 0.0475,
  "North Dakota": 0.05,
  "Ohio": 0.0575,
  "Oklahoma": 0.045,
  "Oregon": 0.00,
  "Pennsylvania": 0.06,
  "Rhode Island": 0.07,
  "South Carolina": 0.06,
  "South Dakota": 0.045,
  "Tennessee": 0.07,
  "Texas": 0.0625,
  "Utah": 0.047,
  "Vermont": 0.06,
  "Virginia": 0.043,
  "Washington": 0.065,
  "West Virginia": 0.06,
  "Wisconsin": 0.05,
  "Wyoming": 0.04
};


// Tax calculation handler
const calculateTaxHandler = async ({ amount, jurisdiction }) => {
  if (!taxRates[jurisdiction]) {
    return {
      content: [
        {
          type: "text",
          text: `Jurisdiction "${jurisdiction}" not supported. Supported: ${Object.keys(taxRates).join(", ")}`
        }
      ]
    };
  }
  const tax = amount * taxRates[jurisdiction];
  const total = amount + tax;
  return {
    content: [
      {
        type: "text",
        text: `For ${jurisdiction}: Amount = $${amount.toFixed(2)}, Tax = $${tax.toFixed(2)}, Total = $${total.toFixed(2)}`
      }
    ]
  };
};

server.tool(
  'get-weather',
  'Tool to get the weather of a city',
  {
    city: z.string().describe("The name of the city to get the weather for")
  },
  getWeatherHandler
);

// Register the tax tool
server.tool(
  'calculate-tax',
  'Tool to calculate tax for a given jurisdiction',
  {
    amount: z.number().describe("The amount to calculate tax on"),
    jurisdiction: z.string().describe("The jurisdiction to use for tax calculation")
  },
  calculateTaxHandler
);

// Update the /mcp endpoint to support both tools
app.post("/mcp", async (req, res) => {
  const { tool, params } = req.body;
  if (!tool || !params) {
    return res.status(400).json({ error: "Missing or invalid 'tool' or 'params' in request body." });
  }
  try {
    let result;
    if (tool === "get-weather") {
      result = await getWeatherHandler(params);
    } else if (tool === "calculate-tax") {
      result = await calculateTaxHandler(params);
    } else {
      return res.status(400).json({ error: "Unknown tool." });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP HTTP server listening on port ${PORT}`);
});