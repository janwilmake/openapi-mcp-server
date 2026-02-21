# OpenAPI MCP 2.0

Inspired by https://x.com/mattzcarey/status/2024847630811980277 this could be a new way the mcp functions:

- Install https://mcp.openapisearch.com/mcp. auth provider requires github login
- Tool to manage `openapis {url,enabled,auth_header_name,auth_header_value}` state for user: `manage(action?:"add"|"remove"|"disable"|"enable",urls?)` lists all installed openapi urls in description. Great to also have this as MCP-UI
- When adding an openapi, one-time oauth flow is created to gather the authentication method of the openapi as described in the `openapi.json` but able to say provide it in a custom way
- Tools available to use it are `search` and `execute` same as https://github.com/cloudflare/mcp, advantage being it wastes very little tokens.
- We can have it use regular fetch so code can also be copied and used in codebase
- We can also offer an sdk for each openapi automatically so code looks a bit neater
