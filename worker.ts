/// <reference lib="esnext" />

import { dereferenceSync } from "@trojs/openapi-dereference";
import { load, dump } from "js-yaml";

// ==================== TYPES ====================

type JSONSchema = {
  type?: string;
  properties?: { [key: string]: JSONSchema };
  items?: JSONSchema;
  required?: string[];
  enum?: any[];
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
  nullable?: boolean;
  description?: string;
};

interface Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  required?: boolean;
  schema?: {
    type: string;
    enum?: string[];
    default?: any;
  };
  description?: string;
}

interface RequestBody {
  required?: boolean;
  content: {
    [key: string]: {
      schema: any;
    };
  };
}

interface Operation {
  operationId?: string;
  servers?: Server[];
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: {
    [key: string]: any;
  };
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

type Server = { url: string; description?: string };

interface OpenapiDocument {
  tags?: any;
  components?: any;
  webhooks?: any;
  openapi?: string;
  servers?: Server[];
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [key: string]: PathItem;
  };
}

type SchemaObject = {
  type: string;
  pattern?: string;
  properties?: { [key: string]: SchemaObject };
  items?: SchemaObject;
  required?: string[];
  enum?: any[];
  description?: string;
  format?: string;
  default?: any;
  minimum?: number;
  maximum?: number;
} & { [key: string]: any };

type OperationObject = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: any;
  servers?: Server[];
};

// ==================== CORS HEADERS ====================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, MCP-Protocol-Version",
};

// ==================== HELPER FUNCTIONS ====================

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function tryParseJson<T extends unknown>(text: string): T | null {
  try {
    const removeCommentsRegex =
      /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;
    const jsonStringWithoutComments = text.replace(
      removeCommentsRegex,
      (m, g) => (g ? "" : m)
    );
    return JSON.parse(jsonStringWithoutComments) as T;
  } catch (parseError) {
    return null;
  }
}

async function convertSwaggerToOpenapi(
  swaggerUrl: string
): Promise<OpenapiDocument | undefined> {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 10000);
  const result = await fetch(
    `https://converter.swagger.io/api/convert?url=${swaggerUrl}`,
    { signal: abortController.signal }
  )
    .then((res) => res.json() as Promise<OpenapiDocument>)
    .catch((e) => {
      return undefined;
    });

  clearTimeout(timeoutId);
  return result;
}

// ==================== OPENAPI SEARCH ====================

async function searchOpenapi(providerId: string) {
  const urlResponse = await fetch(
    `https://openapisearch.com/redirect/${providerId}`,
    { redirect: "follow" }
  );
  if (!urlResponse.ok) {
    console.log("Not ok", providerId);
    return;
  }
  const openapiUrl = urlResponse.url;

  const res = await fetch(openapiUrl);
  if (!res.ok) {
    console.log("Not ok", openapiUrl);
    return;
  }

  const text = await res.text();
  let json = undefined;

  try {
    json = JSON.parse(text);
  } catch (e) {
    try {
      json = load(text);
    } catch (e) {
      return;
    }
  }

  const basePath = json.servers?.[0]?.url || new URL(openapiUrl).hostname;
  return { openapiUrl, openapiJson: json, basePath };
}

// ==================== OVERVIEW GENERATOR ====================

function generateOverview(hostname: string, openapi: OpenapiDocument): string {
  const output: string[] = [];

  const getServerOrigin = (operation: any, rootServers: any[]): string => {
    const servers = operation?.servers || rootServers || [];
    if (servers.length === 0) return "";
    try {
      const url = new URL(servers[0].url);
      return url.origin;
    } catch (e) {
      return servers[0].url.split("/")[0];
    }
  };

  if (openapi.info) {
    const { title, version, description } = openapi.info;
    const serverOrigin = getServerOrigin(undefined, openapi.servers || []);
    output.push(`${title} v${version} - ${serverOrigin}`);
    if (description) output.push(description);
    output.push("");
  }

  const items: {
    operationId: string;
    pathPart: string;
    summaryPart: string;
    openapiUrl: string;
  }[] = [];

  if (openapi.paths) {
    for (const [path, pathItem] of Object.entries(openapi.paths)) {
      const methods = ["get", "post", "put", "patch", "delete"];

      for (const method of methods) {
        const operation = pathItem[method as keyof typeof pathItem];
        if (!operation) continue;

        const serverOrigin = getServerOrigin(operation, openapi.servers || []);
        const operationId = operation.operationId
          ? `${operation.operationId}`
          : "";

        const queryParams = operation.parameters
          ?.filter((p) => p.in === "query")
          ?.map((p) => `${p.name}=${p.schema?.type || p.name}`)
          ?.join("&");

        const queryString = queryParams ? `?${queryParams}` : "";
        const summaryPart = operation.summary ? ` - ${operation.summary}` : "";
        const pathPart = `${method.toUpperCase()} ${serverOrigin}${path}${queryString}`;
        const openapiUrl = `https://oapis.org/openapi/${hostname}${
          operationId ? `/` + operationId : path
        }`;

        items.push({ operationId, pathPart, summaryPart, openapiUrl });
      }
    }
  }

  const isLong = JSON.stringify(items).length > 50000;

  output.push(
    ...items.map(
      (item) =>
        `- ${item.operationId}${isLong ? " " : " " + item.pathPart}${
          item.summaryPart
        } ( Spec: ${item.openapiUrl} )`
    )
  );

  const endpointCount = output.length - 3;
  output.unshift("");
  output.unshift(
    `Below is an overview of the ${hostname} openapi in simple language. This API contains ${endpointCount} endpoints. For more detailed information of an endpoint, visit https://oapis.org/summary/${hostname}/[idOrRoute]`
  );

  return output.join("\n");
}

// ==================== OPENAPI OPERATIONS ====================

function matchOperation(openapi: OpenapiDocument, pathname: string) {
  if (!openapi.paths) {
    return;
  }

  // First try direct path match
  const directMatch = openapi.paths[pathname]?.get;
  if (directMatch) {
    return {
      operation: directMatch,
      originalPath: pathname,
      method: "GET",
    };
  }

  const normalizedPathname = pathname.slice(1);

  // Then try operationId match
  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    const matchingMethod = ["get", "post", "put", "patch", "delete"].find(
      (httpMethod) => {
        const operation = pathItem?.[httpMethod as keyof typeof pathItem];
        return operation?.operationId === normalizedPathname;
      }
    );

    if (matchingMethod) {
      return {
        operation: pathItem[matchingMethod as keyof typeof pathItem],
        originalPath: path,
        method: matchingMethod.toUpperCase(),
      };
    }
  }

  return undefined;
}

// ==================== MCP HANDLERS ====================

function getInitializeResult() {
  return {
    protocolVersion: "2025-06-18",
    capabilities: { tools: {} },
    serverInfo: {
      name: "openapi-mcp-server",
      version: "2.2.0",
      title: "OpenAPI MCP Server",
      websiteUrl: "https://openapisearch.com",
      description:
        "Explore and interact with OpenAPI specifications through MCP. Discover APIs from openapisearch.com or provide your own OpenAPI spec URL.",
      icons: [
        {
          src: "https://www.google.com/s2/favicons?domain=openapisearch.com&sz=48",
          sizes: ["32x32", "16x16", "48x48"],
        },
        {
          src: "https://www.google.com/s2/favicons?domain=openapisearch.com&sz=256",
          sizes: ["any"],
        },
      ],
    },
    instructions:
      "This MCP server provides access to OpenAPI specifications. Use 'getApiOverview' first to understand an API's structure, then use 'getApiOperation' to get details about specific endpoints.",
  };
}

async function handleGetApiOverview(args: { id: string }) {
  const { id } = args;

  if (!id) {
    return {
      content: [
        {
          type: "text",
          text: "Error: 'id' parameter is required",
        },
      ],
      isError: true,
    };
  }

  try {
    const openapi = await searchOpenapi(id);

    if (!openapi) {
      throw new Error("OpenAPI not found");
    }

    const { openapiUrl, openapiJson } = openapi;

    if (!openapiJson) {
      throw new Error("Could not parse OpenAPI JSON");
    }

    const isSwagger =
      (openapiJson as any)?.swagger ||
      !openapiJson?.openapi ||
      !openapiJson?.openapi.startsWith("3.");

    const convertedOpenapi = isSwagger
      ? await convertSwaggerToOpenapi(openapiUrl)
      : (openapiJson as OpenapiDocument);

    if (!convertedOpenapi?.openapi) {
      throw new Error("Conversion failed");
    }

    const overview = generateOverview(id, convertedOpenapi);

    if (overview.length > 250000) {
      throw new Error(
        "The OpenAPI specification is too large to process with this MCP. Please try a different OpenAPI."
      );
    }

    return {
      content: [{ type: "text", text: overview }],
      isError: false,
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleGetApiOperation(args: {
  id: string;
  operationIdOrRoute: string;
}) {
  const { id, operationIdOrRoute } = args;

  if (!id || !operationIdOrRoute) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Both 'id' and 'operationIdOrRoute' parameters are required",
        },
      ],
      isError: true,
    };
  }

  try {
    const openapi = await searchOpenapi(id);

    if (!openapi) {
      throw new Error("OpenAPI not found");
    }

    const { openapiUrl, openapiJson } = openapi;

    if (!openapiJson) {
      throw new Error("Could not parse OpenAPI JSON");
    }

    const isSwagger =
      (openapiJson as any)?.swagger ||
      !openapiJson?.openapi ||
      !openapiJson?.openapi.startsWith("3.");

    const convertedOpenapi = isSwagger
      ? await convertSwaggerToOpenapi(openapiUrl)
      : (openapiJson as OpenapiDocument);

    if (!convertedOpenapi?.openapi) {
      throw new Error("Conversion failed");
    }

    // Match the operation
    const op = matchOperation(convertedOpenapi, `/${operationIdOrRoute}`);

    if (!op?.operation) {
      const operationIds = Object.values(convertedOpenapi.paths)
        .map((item) =>
          [
            item.get?.operationId,
            item.post?.operationId,
            item.delete?.operationId,
            item.put?.operationId,
            item.patch?.operationId,
          ]
            .filter(Boolean)
            .map((x) => x!)
        )
        .flat();
      const routes = Object.keys(convertedOpenapi.paths);

      throw new Error(
        `Operation wasn't found. Available IDs: ${operationIds.join(
          ", "
        )}. Routes: ${routes.join(", ")}`
      );
    }

    // Get the subset for this operation
    const subset = {
      ...convertedOpenapi,
      paths: {
        [op.originalPath]: {
          [op.method.toLowerCase()]: op.operation,
        },
      },
    };

    try {
      const { tags, webhooks, components, ...dereferenced } = dereferenceSync(
        subset
      ) as OpenapiDocument;

      return {
        content: [{ type: "text", text: dump(dereferenced) }],
        isError: false,
      };
    } catch {
      return {
        content: [{ type: "text", text: dump(subset) }],
        isError: false,
      };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
}

// ==================== MCP HANDLER ====================

async function handleMcp(request: Request) {
  // Handle SSE rejection
  if (
    request.method === "GET" &&
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return new Response("Only Streamable HTTP is supported", {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (request.method === "GET") {
    const initializeResult = getInitializeResult();
    return new Response(JSON.stringify(initializeResult, null, 2), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const message = await request.json();

    // Handle ping
    if (message.method === "ping") {
      return jsonRpcResponse(message.id, {});
    }

    // Handle initialize
    if (message.method === "initialize") {
      return jsonRpcResponse(message.id, getInitializeResult());
    }

    // Handle initialized notification
    if (message.method === "notifications/initialized") {
      return new Response(null, {
        status: 202,
        headers: corsHeaders,
      });
    }

    // Handle prompts/list
    if (message.method === "prompts/list") {
      return jsonRpcResponse(message.id, { prompts: [] });
    }

    // Handle resources/list
    if (message.method === "resources/list") {
      return jsonRpcResponse(message.id, { resources: [] });
    }

    // Handle resources/read
    if (message.method === "resources/read") {
      const { uri } = message.params;
      return jsonRpcError(message.id, -32602, `Resource not found: ${uri}`);
    }

    // Handle tools/list
    if (message.method === "tools/list") {
      const openapiIds = await fetch("https://openapisearch.com/").then((res) =>
        res.text()
      );

      const tools = [
        {
          name: "getApiOverview",
          title: "Get API Overview",
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
        },
        {
          name: "getApiOperation",
          title: "Get API Operation",
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
        },
      ];

      return jsonRpcResponse(message.id, { tools });
    }

    // Handle tools/call
    if (message.method === "tools/call") {
      const { name, arguments: args } = message.params;

      try {
        let result;

        if (name === "getApiOverview") {
          result = await handleGetApiOverview(args);
        } else if (name === "getApiOperation") {
          result = await handleGetApiOperation(args);
        } else {
          return jsonRpcResponse(message.id, {
            content: [
              {
                type: "text",
                text: `Error: Unknown tool: ${name}`,
              },
            ],
            isError: true,
          });
        }

        return jsonRpcResponse(message.id, result);
      } catch (error: any) {
        return jsonRpcResponse(message.id, {
          content: [
            {
              type: "text",
              text: `Error executing tool: ${error.message}`,
            },
          ],
          isError: true,
        });
      }
    }

    // Method not found
    return jsonRpcError(
      message.id,
      -32601,
      `Method not found: ${message.method}`
    );
  } catch (error) {
    return jsonRpcError(null, -32700, "Parse error");
  }
}

function jsonRpcResponse(id: any, result: any) {
  return new Response(
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id,
        result,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

function jsonRpcError(id: any, code: number, message: string) {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

// ==================== MAIN EXPORT ====================

export default {
  async fetch(request: Request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Root redirect
    if (path === "/") {
      return new Response(null, { status: 302, headers: { Location: "/mcp" } });
    }

    // Only handle /mcp endpoint
    if (path !== "/mcp") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    return handleMcp(request);
  },
};
