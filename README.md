# OpenAPI MCP Server

[![janwilmake/openapi-mcp-server context](https://badge.forgithub.com/janwilmake/openapi-mcp-server?excludePathPatterns=*.yaml)](https://uithub.com/janwilmake/openapi-mcp-server?excludePathPatterns=*.yaml)

A Model Context Protocol (MCP) server for Claude/Cursor that enables searching and exploring OpenAPI specifications through oapis.org.

- Demo: https://x.com/janwilmake/status/1903497808134496583
- HN Thread: https://news.ycombinator.com/item?id=43447278
- OpenAPISearch: https://github.com/janwilmake/openapisearch
- OAPIS: https://github.com/janwilmake/oapis

The MCP works by applying a 3 step process:

1. It figures out the openapi identifier you need
2. It requests a summary of that in simple language
3. It determines which endpoints you need, and checks out how exactly they work (again, in simple language)

## Features

- Get an overview of any OpenAPI specification
- Retrieve details about specific API operations
- Support for both JSON and YAML formats
- Tested with Claude Desktop and Cursor

## Local testing

First run the server

```
wrangler dev
```

Then run the mcp inspector:

```
npx @modelcontextprotocol/inspector
```
