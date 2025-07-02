# Tax Calculation MCP Server

## Use Case

**Objective:**  
Automatically calculate sales tax during Salesforce sales processes (quotes/invoices) using an MCP server integrated with Agentforce 3.0.

- The MCP server exposes a `calculateTax` tool.
- Salesforce Agentforce agent calls this tool to fetch tax amounts based on transaction details and jurisdiction.
- Ensures accurate, automated, and auditable tax calculations.

## How to Run

1. **Install dependencies:**

npm install


2. **Start the MCP server:**

node index.js


3. **Integration:**
- Register this MCP server's endpoint in Salesforce Agentforce.
- Add the `calculateTax` tool to your agent's actions.
- Use in Salesforce flows for quotes/invoices.

## Security & Compliance

- All tax calculations are logged.
- For production, connect to a real tax API and implement OAuth2 authentication.
- Ensure compliance with relevant data privacy and tax regulations.

## Example Tool Call

{
"amount": 100,
"jurisdiction": "CA"
}

**Response:**  
`Tax for $100 in CA: $7.50 (Rate: 7.5%)`
