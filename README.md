[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/janwilmake-openapi-mcp-server-badge.png)](https://mseep.ai/app/janwilmake-openapi-mcp-server)

# OpenAPI MCP Server

[![smithery badge](https://smithery.ai/badge/@janwilmake/openapi-mcp-server)](https://smithery.ai/server/@janwilmake/openapi-mcp-server) [![janwilmake/openapi-mcp-server context](https://badge.forgithub.com/janwilmake/openapi-mcp-server?excludePathPatterns=README-v1.md&excludePathPatterns=*.yaml)](https://uithub.com/janwilmake/openapi-mcp-server?excludePathPatterns=README-v1.md&excludePathPatterns=*.yaml)

A Model Context Protocol (MCP) server for Claude/Cursor that enables searching and exploring OpenAPI specifications through oapis.org.

- Demo: https://x.com/janwilmake/status/1903497808134496583
- HN Thread: https://news.ycombinator.com/item?id=43447278
- OpenAPISearch: https://github.com/janwilmake/openapisearch
- OAPIS: https://github.com/janwilmake/oapis

The MCP works by applying a 3 step process :

1. It figures out the openapi identifier you need
2. It requests a summary of that in simple language
3. It determines which endpoints you need, and checks out how exactly they work (again, in simple language)

> [!IMPORTANT]
> OpenAPI MCP has found a [new owner](https://github.com/janwilmake) and has been migrated from v1.2 to v2, which works different to the previous version. You can still access any version prior to v2.0.0 and their README is [here](README-v1.md)
>
> OpenAPI MCP v2 is a Work In Progress and focuses on exploration and providing context about APIs. It **does not** allow executing the endpoints as tools directly, as authentication isn't a solved problem with MCP yet. However, it's great for codegen!
>
> Expect bugs. Open To Contributers, [DM](https://x.com/janwilmake)

## Features

- Get an overview of any OpenAPI specification
- Retrieve details about specific API operations
- Support for both JSON and YAML formats
- Tested with Claude Desktop and Cursor

## Installation

### Installing via Smithery

To install openapi-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@janwilmake/openapi-mcp-server):

```bash
npx -y @smithery/cli install @janwilmake/openapi-mcp-server --client claude
```

### Installing via npx

Run and follow instructions:

```bash
npx openapi-mcp-server@latest init
```

## Usage in Claude

Once installed, you can ask Claude to:

- "Find information about the Stripe API"
- "Explain how to use the GitHub API's repository endpoints"

Claude will use the MCP server to:

1. First get an overview of the requested API
2. Then retrieve specific operation details as needed

## Requirements

- Node.js >= 16.17.0
- Claude Desktop, Cursor, or any other MCP client.

## License

MIT
