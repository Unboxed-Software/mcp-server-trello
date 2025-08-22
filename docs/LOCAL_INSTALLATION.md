# Installing Local MCP Server in Claude Code

Since this is a local development branch not published to npm, you'll need to install it using the local file path.

## Prerequisites

1. Ensure the project is built:
```bash
npm install
npm run build
```

2. Get your Trello credentials:
   - API Key: https://trello.com/app-key
   - Token: https://trello.com/1/authorize?expiration=never&name=MCP-Server&scope=read,write&response_type=token&key=YOUR_API_KEY
   - Board ID: Navigate to your board and add `.json` to the URL, the `:id` field is your board ID

## Installation Methods

### Method 1: Using Local Path (Recommended)

Run this command in Claude Code:

```bash
claude mcp add /Users/James/Dev/mcp-server-trello/build/index.js --name trello-local
```

Then configure the environment variables when prompted:
- `TRELLO_API_KEY`: Your Trello API key
- `TRELLO_TOKEN`: Your Trello token
- `TRELLO_BOARD_ID`: Your default board ID (optional)

### Method 2: Using npm link (Alternative)

1. In the mcp-server-trello directory:
```bash
npm link
```

2. Then in Claude Code:
```bash
claude mcp add mcp-server-trello --name trello-local
```

### Method 3: Direct Node Execution

```bash
claude mcp add "node /Users/James/Dev/mcp-server-trello/build/index.js" --name trello-local
```

## Configuration

After installation, Claude Code will create a configuration file. You can also manually edit it:

```json
{
  "mcpServers": {
    "trello-local": {
      "command": "node",
      "args": ["/Users/James/Dev/mcp-server-trello/build/index.js"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token",
        "TRELLO_BOARD_ID": "your-board-id"
      }
    }
  }
}
```

## Verify Installation

After installation, restart Claude Code and check if the MCP server is loaded:

```bash
/mcp
```

You should see "trello-local" in the list of available MCP servers.

## Testing the Pagination Features

Once installed, you can test the new pagination tools:

1. **Get list statistics:**
   ```
   Use the get-list-stats tool to check card counts
   ```

2. **Fetch cards with pagination:**
   ```
   Use get-cards-by-list-paginated with a limit of 10
   ```

3. **Get all card IDs (lightweight):**
   ```
   Use get-card-ids-by-list for quick enumeration
   ```

4. **Batch fetch specific cards:**
   ```
   Use get-cards-batch with an array of card IDs
   ```

## Troubleshooting

1. **Server not showing up:** 
   - Ensure the build completed successfully
   - Check that the file path is correct
   - Restart Claude Code

2. **Authentication errors:**
   - Verify your API key and token are correct
   - Check that the token has read/write permissions

3. **Board not found:**
   - Ensure TRELLO_BOARD_ID is set correctly
   - The board ID should be the alphanumeric string from your board URL

## Development Workflow

When making changes to the MCP server:

1. Make your changes in the source code
2. Rebuild: `npm run build`
3. Restart Claude Code to pick up the changes
4. Test the updated functionality

## Uninstalling

To remove the local MCP server:

```bash
claude mcp remove trello-local
```