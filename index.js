#!/usr/bin/env node
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fetch } from "undici";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "url";

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(execCallback);
const version = process.env.npm_package_version || "0.1.0";
const debug = process.env.DEBUG === "true";

// Utility functions
function createDialog(lines) {
  const maxLineWidth = Math.max(...lines.map((line) => line.length), 60);
  const border = chalk.gray("-".repeat(maxLineWidth));
  return [border, ...lines, border, ""].join("\n");
}

function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

function log(...args) {
  if (debug) {
    const msg = `[DEBUG ${new Date().toISOString()}] ${args.join(" ")}\n`;
    process.stderr.write(msg);
  }
}

async function findNodePath() {
  try {
    return process.execPath;
  } catch (error) {
    try {
      const cmd = process.platform === "win32" ? "where" : "which";
      const { stdout } = await execAsync(`${cmd} node`);
      return stdout.toString().trim().split("\n")[0];
    } catch (err) {
      return "node"; // Fallback
    }
  }
}

// Tool handlers
const HANDLERS = {
  getApiOverview: async (request) => {
    const { id } = request.params.arguments;

    log("Executing getApiOverview for API:", id);

    try {
      // Fetch from oapis.org/overview endpoint
      const url = `https://oapis.org/overview/${encodeURIComponent(id)}`;
      log("SLOP API request URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SLOP API error: ${error}`);
      }

      // Get response
      let responseContent = await response.text();

      const tooBig = responseContent.length > 250000;

      if (tooBig) {
        throw new Error(
          `The SLOP found is too large to process with this MCP. Please try a different OpenAPI.`,
        );
      }
      return {
        content: [{ type: "text", text: responseContent }],
        metadata: {},
      };
    } catch (error) {
      log("Error handling SLOP API overview request:", error);
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

  getApiOperation: async (request) => {
    const { id, operationIdOrRoute } = request.params.arguments;

    log(
      "Executing getApiOperation for API:",
      id,
      "Operation:",
      operationIdOrRoute,
    );

    try {
      // Fetch from oapis.org/openapi endpoint instead of summary
      const url = `https://oapis.org/openapi/${encodeURIComponent(
        id,
      )}/${operationIdOrRoute}`;
      log("SLOP API request URL:", url);

      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SLOP API error: ${error}`);
      }

      return {
        content: [{ type: "text", text: await response.text() }],
        metadata: {},
      };
    } catch (error) {
      log("Error handling SLOP API operation request:", error);
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

// Initialize the SLOP MCP server
export async function init() {
  console.log(
    createDialog([
      `👋 Welcome to ${chalk.yellow("mcp-server-slop")} v${version}!`,
      `💁‍♀️ This ${chalk.green(
        "'init'",
      )} process will install the SLOP MCP Server into Claude Desktop`,
      `   enabling Claude to search and analyze OpenAPI specifications.`,
      `🧡 Let's get started.`,
    ]),
  );

  console.log(`${chalk.yellow("Step 1:")} Checking for Claude Desktop...`);

  const claudeConfigPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Claude",
    "claude_desktop_config.json",
  );

  const nodePath = await findNodePath();
  const config = {
    command: nodePath,
    args: [__filename, "run"],
  };

  console.log(
    `Looking for existing config in: ${chalk.yellow(
      path.dirname(claudeConfigPath),
    )}`,
  );
  const configDirExists = isDirectory(path.dirname(claudeConfigPath));

  if (configDirExists) {
    const existingConfig = fs.existsSync(claudeConfigPath)
      ? JSON.parse(fs.readFileSync(claudeConfigPath, "utf8"))
      : { mcpServers: {} };

    if ("slop" in (existingConfig?.mcpServers || {})) {
      console.log(
        `${chalk.green(
          "Note:",
        )} Replacing existing SLOP MCP config:\n${chalk.gray(
          JSON.stringify(existingConfig.mcpServers.slop),
        )}`,
      );
    }

    const newConfig = {
      ...existingConfig,
      mcpServers: {
        ...existingConfig.mcpServers,
        slop: config,
      },
    };

    fs.writeFileSync(claudeConfigPath, JSON.stringify(newConfig, null, 2));

    console.log(
      `${chalk.yellow(
        "mcp-server-slop",
      )} configured & added to Claude Desktop!`,
    );
    console.log(`Wrote config to ${chalk.yellow(claudeConfigPath)}`);
    console.log(
      chalk.blue(
        `Try asking Claude to "search for an OpenAPI specification" to get started!`,
      ),
    );
  } else {
    const fullConfig = { mcpServers: { slop: config } };
    console.log(
      `Couldn't detect Claude Desktop config at ${claudeConfigPath}.\nTo add the SLOP MCP server manually, add the following config to your ${chalk.yellow(
        "MCP config-file",
      )}:\n\n${JSON.stringify(fullConfig, null, 2)}`,
    );
  }
}

// Start the MCP server
async function main() {
  log("Starting SLOP MCP server...");

  try {
    const server = new Server(
      { name: "slop", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );

    // Handle list tools request
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      log("Received list tools request");

      const openpaiIds = await fetch("https://openapisearch.com/").then((res) =>
        res.text(),
      );

      // Define the tool schemas
      const GET_API_OVERVIEW_TOOL = {
        name: "getApiOverview",
        description: `Get an overview of an OpenAPI specification. This should be the first step when working with any API.\n\n${openpaiIds}`,
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
        description: `Get details about a specific operation from an OpenAPI specification. Use this after getting an overview.\n\n${openpaiIds}`,
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
      log("Received tool call:", toolName);

      try {
        const handler = HANDLERS[toolName];
        if (!handler) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        return await handler(request);
      } catch (error) {
        log("Error handling tool call:", error);
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

    // Connect to transport
    const transport = new StdioServerTransport();
    log("Created transport");
    await server.connect(transport);
    log("Server connected and running");
  } catch (error) {
    log("Fatal error:", error);
    process.exit(1);
  }
}

// Handle process events
process.on("uncaughtException", (error) => {
  log("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  log("Unhandled rejection:", error);
});

// Command line handling
const [cmd, ...args] = process.argv.slice(2);
if (cmd === "init") {
  init()
    .then(() => {
      console.log("Initialization complete!");
    })
    .catch((error) => {
      console.error("Error during initialization:", error);
      process.exit(1);
    });
} else if (cmd === "run") {
  main().catch((error) => {
    console.error("Error starting server:", error);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${cmd}. Expected 'init' or 'run'.`);
  process.exit(1);
}
