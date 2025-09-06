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

| Summary                                       | Prompt it                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic understanding of the OpenAPI MCP Server | [![](https://b.lmpify.com/overview)](https://lmpify.com?q=https%3A%2F%2Fuuithub.com%2Fjanwilmake%2Fopenapi-mcp-server%2Ftree%2Fmain%3FpathPatterns%3DREADME.md%26pathPatterns%3Dopenapi-mcp.drawio.png%0A%0ACan%20you%20explain%20what%20OpenAPI%20MCP%20Server%20does%20and%20how%20I%20can%20use%20it%20with%20Claude%20Desktop%3F)                     |
| Core implementation details of the MCP server | [![](https://b.lmpify.com/implementation)](https://lmpify.com?q=https%3A%2F%2Fuuithub.com%2Fjanwilmake%2Fopenapi-mcp-server%2Ftree%2Fmain%3FpathPatterns%3Dindex.js%26pathPatterns%3Dpackage.json%0A%0AHow%20does%20the%20OpenAPI%20MCP%20Server%20handle%20API%20requests%3F%20Can%20you%20explain%20the%20tool%20handlers%3F)                           |
| How to extend or contribute to the project    | [![](https://b.lmpify.com/extend)](https://lmpify.com?q=https%3A%2F%2Fuuithub.com%2Fjanwilmake%2Fopenapi-mcp-server%2Ftree%2Fmain%3FpathPatterns%3Dindex.js%26pathPatterns%3Dpackage.json%26pathPatterns%3DREADME.md%0A%0AI'd%20like%20to%20add%20support%20for%20a%20new%20feature%20to%20the%20OpenAPI%20MCP%20Server.%20Where%20should%20I%20start%3F) |

## Installation

### Installing via Smithery

To install openapi-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@janwilmake/openapi-mcp-server):

```bash
npx -y @smithery/cli install @janwilmake/openapi-mcp-server --client claude
```

### Installing using stdio

```
{
  "mcpServers": {
    "openapi-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/openapi-mcp-server/index.js"],
      "env": {
        "DEBUG": "true"
      }
    }
  }
}
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
