import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Initialize Express app
const app = express();
app.use(express.json()); // Parse JSON request bodies

// Step 1: Create the MCP server instance
console.log("Initializing MCP server...");
const server = new McpServer({
    name: "Tax Calculation MCP Server",
    version: "1.0.0",
    capabilities: {}
});
console.log("MCP server initialized.");

// Step 2: Register the tax calculation tool
console.log("Registering 'calculateTax' tool...");
server.tool(
    "calculateTax",
    "Calculates sales tax based on amount and jurisdiction.",
    {
        amount: z.number().describe("The transaction amount"),
        jurisdiction: z.string().describe("The tax jurisdiction code (e.g., CA, NY, TX, IN)")
    },
    async ({ amount, jurisdiction }) => {
        console.log(`Received request: amount=${amount}, jurisdiction=${jurisdiction}`);
        const taxRates = { CA: 0.075, NY: 0.085, TX: 0.065 };
        const rate = taxRates[jurisdiction] || 0.05;
        const tax = amount * rate;
        console.log(`Calculated tax: ${tax} (rate: ${rate})`);
        return {
            content: [
                {
                    type: "text",
                    text: `Tax for $${amount} in ${jurisdiction}: $${tax.toFixed(2)} (Rate: ${(rate * 100).toFixed(1)}%)`
                }
            ]
        };
    }
);
console.log("'calculateTax' tool registered.");

// Step 3: Set up JSON-RPC over HTTP with Express
console.log("Setting up JSON-RPC endpoint...");

// POST /mcp: Handle JSON-RPC requests
app.post("/mcp", async (req, res) => {
    try {
        const jsonRpcRequest = req.body;
        const needsStreaming = jsonRpcRequest.method === "calculateTax" && jsonRpcRequest.params.stream; // Example condition for streaming

        if (needsStreaming) {
            // Set up SSE for streaming responses
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");

            // Example: Stream multiple responses (e.g., tax calculation steps)
            const response = await server.handle(jsonRpcRequest); // Assuming MCP server has a handle method
            res.write(`data: ${JSON.stringify(response)}\n\n`);

            // Simulate additional streaming updates (customize as needed)
            setTimeout(() => {
                res.write(`data: ${JSON.stringify({
                    jsonrpc: "2.0",
                    result: { content: [{ type: "text", text: "Streaming update: Tax calculation complete" }] },
                    id: jsonRpcRequest.id
                })}\n\n`);
                res.end();
            }, 1000);
        } else {
            // Single JSON response
            const response = await server.handle(jsonRpcRequest);
            res.json(response);
        }
    } catch (error) {
        res.status(500).json({
            jsonrpc: "2.0",
            error: { code: -32000, message: error.message },
            id: req.body.id || null
        });
    }
});

// GET /mcp: Support server-initiated SSE streams
app.get("/mcp", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Example: Send server-initiated notifications
    res.write(`data: ${JSON.stringify({
        jsonrpc: "2.0",
        method: "serverNotification",
        params: { message: "Server is online" }
    })}\n\n`);

    // Keep the connection alive and send periodic updates
    const interval = setInterval(() => {
        res.write(`data: ${JSON.stringify({
            jsonrpc: "2.0",
            method: "serverNotification",
            params: { message: "Server heartbeat" }
        })}\n\n`);
    }, 30000);

    // Clean up on connection close
    req.on("close", () => {
        clearInterval(interval);
        res.end();
    });
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`MCP server running on port ${port}`);
});