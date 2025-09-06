#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/**
 * Configuration schema for the OpenAPI MCP Server
 */
export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

/**
 * Utility function for debug logging
 * @param {boolean} debug - Whether debug mode is enabled
 * @param {...any} args - Arguments to log
 */
function log(debug, ...args) {
  if (debug) {
    const msg = `[DEBUG ${new Date().toISOString()}] ${args.join(" ")}\n`;
    process.stderr.write(msg);
  }
}

/**
 * Tool handlers for the MCP server
 */
const HANDLERS = {
  /**
   * Get an overview of an OpenAPI specification
   * @param {Object} request - The tool request
   * @param {Object} config - Server configuration
   * @returns {Promise<Object>} Tool response
   */
  getApiOverview: async (request, config) => {
    const { id } = request.params.arguments;

    log(config.debug, "Executing getApiOverview for API:", id);

    try {
      // Fetch from oapis.org/overview endpoint
      const url = `https://oapis.org/overview/${encodeURIComponent(id)}`;
      log(config.debug, "API request URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${error}`);
      }

      // Get response
      let responseContent = await response.text();

      const tooBig = responseContent.length > 250000;

      if (tooBig) {
        throw new Error(
          `The OpenAPI specification is too large to process with this MCP. Please try a different OpenAPI.`
        );
      }

      return {
        content: [{ type: "text", text: responseContent }],
        metadata: {},
      };
    } catch (error) {
      log(config.debug, "Error handling API overview request:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        metadata: {},
        isError: true,
      };
    }
  },

  /**
   * Get details about a specific API operation
   * @param {Object} request - The tool request
   * @param {Object} config - Server configuration
   * @returns {Promise<Object>} Tool response
   */
  getApiOperation: async (request, config) => {
    const { id, operationIdOrRoute } = request.params.arguments;

    log(
      config.debug,
      "Executing getApiOperation for API:",
      id,
      "Operation:",
      operationIdOrRoute
    );

    try {
      // Fetch from oapis.org/openapi endpoint
      const url = `https://oapis.org/openapi/${encodeURIComponent(
        id
      )}/${operationIdOrRoute}`;
      log(config.debug, "API request URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${error}`);
      }

      return {
        content: [{ type: "text", text: await response.text() }],
        metadata: {},
      };
    } catch (error) {
      log(config.debug, "Error handling API operation request:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        metadata: {},
        isError: true,
      };
    }
  },
};

/**
 * Create and configure the MCP server
 * @param {Object} options - Server creation options
 * @param {Object} options.config - Server configuration
 * @returns {Object} Configured MCP server
 */
export default function createServer({ config }) {
  log(config.debug, "Starting OpenAPI MCP server with config:", config);

  const server = new Server(
    { name: "openapi-mcp-server", version: "2.1.0" },
    { capabilities: { tools: {} } }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log(config.debug, "Received list tools request");

    const openapiIds = await fetch("https://openapisearch.com/").then((res) =>
      res.text()
    );

    // Define the tool schemas
    const GET_API_OVERVIEW_TOOL = {
      name: "getApiOverview",
      description: `Get an overview of an OpenAPI specification. This should be the first step when working with any API.\n\n${openapiIds}`,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "API identifier, can be a known ID from openapisearch.com or a URL leading to a raw OpenAPI file",
          },
        },
        required: ["id"],
      },
    };

    const GET_API_OPERATION_TOOL = {
      name: "getApiOperation",
      description: `Get details about a specific operation from an OpenAPI specification. Use this after getting an overview.\n\n${openapiIds}`,
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "API identifier, can be a known ID from openapisearch.com or a URL leading to a raw OpenAPI file",
          },
          operationIdOrRoute: {
            type: "string",
            description: "Operation ID or route path to retrieve",
          },
        },
        required: ["id", "operationIdOrRoute"],
      },
    };

    return { tools: [GET_API_OVERVIEW_TOOL, GET_API_OPERATION_TOOL] };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    log(config.debug, "Received tool call:", toolName);

    try {
      const handler = HANDLERS[toolName];
      if (!handler) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      return await handler(request, config);
    } catch (error) {
      log(config.debug, "Error handling tool call:", error);
      return {
        toolResult: {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        },
      };
    }
  });

  return server;
}

/**
 * Main function for STDIO compatibility
 * Runs the server with STDIO transport when executed directly
 */
async function main() {
  // Get debug setting from environment variable
  const debug = process.env.DEBUG === "true";

  // Create server with configuration
  const server = createServer({
    config: { debug },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenAPI MCP Server running in stdio mode");
}

// Handle process events
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

// Run server when executed directly (for STDIO compatibility)
main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
