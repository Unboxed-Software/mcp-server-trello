#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TrelloClient } from './trello-client.js';

class TrelloServer {
  private server: McpServer;
  private trelloClient: TrelloClient;

  constructor() {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const defaultBoardId = process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token) {
      throw new Error('TRELLO_API_KEY and TRELLO_TOKEN environment variables are required');
    }

    this.trelloClient = new TrelloClient({
      apiKey,
      token,
      defaultBoardId,
      boardId: defaultBoardId,
    });

    this.server = new McpServer({
      name: 'trello-server',
      version: '1.0.0',
    });

    this.setupTools();

    // Error handling
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupTools() {
    // Get cards from a specific list
    this.server.registerTool(
      'get_cards_by_list_id',
      {
        title: 'Get Cards by List ID',
        description: 'Fetch cards from a specific Trello list on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the Trello list'),
        },
      },
      async ({ boardId, listId }) => {
        try {
          const cards = await this.trelloClient.getCardsByList(boardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(cards, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get all lists from a board
    this.server.registerTool(
      'get_lists',
      {
        title: 'Get Lists',
        description: 'Retrieve all lists from the specified board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ boardId }) => {
        try {
          const lists = await this.trelloClient.getLists(boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(lists, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get recent activity
    this.server.registerTool(
      'get_recent_activity',
      {
        title: 'Get Recent Activity',
        description: 'Fetch recent activity on the Trello board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of activities to fetch (default: 10)'),
        },
      },
      async ({ boardId, limit }) => {
        try {
          const activity = await this.trelloClient.getRecentActivity(boardId, limit);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(activity, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Add a new card to a list
    this.server.registerTool(
      'add_card_to_list',
      {
        title: 'Add Card to List',
        description: 'Add a new card to a specified list on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the list to add the card to'),
          name: z.string().describe('Name of the card'),
          description: z.string().optional().describe('Description of the card'),
          dueDate: z.string().optional().describe('Due date for the card (ISO 8601 format)'),
          start: z
            .string()
            .optional()
            .describe('Start date for the card (YYYY-MM-DD format, date only)'),
          labels: z
            .array(z.string())
            .optional()
            .describe('Array of label IDs to apply to the card'),
        },
      },
      async args => {
        try {
          const card = await this.trelloClient.addCard(args.boardId, args);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Update card details
    this.server.registerTool(
      'update_card_details',
      {
        title: 'Update Card Details',
        description: "Update an existing card's details on a specific board",
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          cardId: z.string().describe('ID of the card to update'),
          name: z.string().optional().describe('New name for the card'),
          description: z.string().optional().describe('New description for the card'),
          dueDate: z.string().optional().describe('New due date for the card (ISO 8601 format)'),
          start: z
            .string()
            .optional()
            .describe('New start date for the card (YYYY-MM-DD format, date only)'),
          dueComplete: z
            .boolean()
            .optional()
            .describe('Mark the due date as complete (true) or incomplete (false)'),
          labels: z.array(z.string()).optional().describe('New array of label IDs for the card'),
        },
      },
      async args => {
        try {
          const card = await this.trelloClient.updateCard(args.boardId, args);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Archive a card
    this.server.registerTool(
      'archive_card',
      {
        title: 'Archive Card',
        description: 'Send a card to the archive on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          cardId: z.string().describe('ID of the card to archive'),
        },
      },
      async ({ boardId, cardId }) => {
        try {
          const card = await this.trelloClient.archiveCard(boardId, cardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Move a card
    this.server.registerTool(
      'move_card',
      {
        title: 'Move Card',
        description: 'Move a card to a different list, potentially on a different board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the target Trello board (where the listId resides, uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to move'),
          listId: z.string().describe('ID of the target list'),
        },
      },
      async ({ boardId, cardId, listId }) => {
        try {
          const card = await this.trelloClient.moveCard(boardId, cardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Add a new list to a board
    this.server.registerTool(
      'add_list_to_board',
      {
        title: 'Add List to Board',
        description: 'Add a new list to the specified board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          name: z.string().describe('Name of the new list'),
        },
      },
      async ({ boardId, name }) => {
        try {
          const list = await this.trelloClient.addList(boardId, name);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Archive a list
    this.server.registerTool(
      'archive_list',
      {
        title: 'Archive List',
        description: 'Send a list to the archive on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
          listId: z.string().describe('ID of the list to archive'),
        },
      },
      async ({ boardId, listId }) => {
        try {
          const list = await this.trelloClient.archiveList(boardId, listId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get cards assigned to current user
    this.server.registerTool(
      'get_my_cards',
      {
        title: 'Get My Cards',
        description: 'Fetch all cards assigned to the current user',
        inputSchema: {},
      },
      async () => {
        try {
          const cards = await this.trelloClient.getMyCards();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(cards, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Attach image to card
    this.server.registerTool(
      'attach_image_to_card',
      {
        title: 'Attach Image to Card',
        description: 'Attach an image to a card from a URL on a specific board',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe(
              'ID of the Trello board where the card exists (uses default if not provided)'
            ),
          cardId: z.string().describe('ID of the card to attach the image to'),
          imageUrl: z.string().describe('URL of the image to attach'),
          name: z
            .string()
            .optional()
            .default('Image Attachment')
            .describe('Optional name for the attachment (defaults to "Image Attachment")'),
        },
      },
      async ({ boardId, cardId, imageUrl, name }) => {
        try {
          const attachment = await this.trelloClient.attachImageToCard(
            boardId,
            cardId,
            imageUrl,
            name
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(attachment, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // List all boards
    this.server.registerTool(
      'list_boards',
      {
        title: 'List Boards',
        description: 'List all boards the user has access to',
        inputSchema: {},
      },
      async () => {
        try {
          const boards = await this.trelloClient.listBoards();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(boards, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Set active board
    this.server.registerTool(
      'set_active_board',
      {
        title: 'Set Active Board',
        description: 'Set the active board for future operations',
        inputSchema: {
          boardId: z.string().describe('ID of the board to set as active'),
        },
      },
      async ({ boardId }) => {
        try {
          const board = await this.trelloClient.setActiveBoard(boardId);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully set active board to "${board.name}" (${board.id})`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // List workspaces
    this.server.registerTool(
      'list_workspaces',
      {
        title: 'List Workspaces',
        description: 'List all workspaces the user has access to',
        inputSchema: {},
      },
      async () => {
        try {
          const workspaces = await this.trelloClient.listWorkspaces();
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(workspaces, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Set active workspace
    this.server.registerTool(
      'set_active_workspace',
      {
        title: 'Set Active Workspace',
        description: 'Set the active workspace for future operations',
        inputSchema: {
          workspaceId: z.string().describe('ID of the workspace to set as active'),
        },
      },
      async ({ workspaceId }) => {
        try {
          const workspace = await this.trelloClient.setActiveWorkspace(workspaceId);
          return {
            content: [
              {
                type: 'text' as const,
                text: `Successfully set active workspace to "${workspace.displayName}" (${workspace.id})`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // List boards in workspace
    this.server.registerTool(
      'list_boards_in_workspace',
      {
        title: 'List Boards in Workspace',
        description: 'List all boards in a specific workspace',
        inputSchema: {
          workspaceId: z.string().describe('ID of the workspace to list boards from'),
        },
      },
      async ({ workspaceId }) => {
        try {
          const boards = await this.trelloClient.listBoardsInWorkspace(workspaceId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(boards, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get active board info
    this.server.registerTool(
      'get_active_board_info',
      {
        title: 'Get Active Board Info',
        description: 'Get information about the currently active board',
        inputSchema: {},
      },
      async () => {
        try {
          const boardId = this.trelloClient.activeBoardId;
          if (!boardId) {
            return {
              content: [{ type: 'text' as const, text: 'No active board set' }],
              isError: true,
            };
          }
          const board = await this.trelloClient.getBoardById(boardId);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    ...board,
                    isActive: true,
                    activeWorkspaceId: this.trelloClient.activeWorkspaceId || 'Not set',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get card details
    this.server.registerTool(
      'get_card',
      {
        title: 'Get Card',
        description: 'Get detailed information about a specific Trello card',
        inputSchema: {
          cardId: z.string().describe('ID of the card to fetch'),
          includeMarkdown: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to return card description in markdown format (default: false)'),
        },
      },
      async ({ cardId, includeMarkdown }) => {
        try {
          const card = await this.trelloClient.getCard(cardId, includeMarkdown);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(card, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Checklist tools
    this.server.registerTool(
      'get_checklist_items',
      {
        title: 'Get Checklist Items',
        description: 'Get all items from a checklist by name',
        inputSchema: {
          name: z.string().describe('Name of the checklist to retrieve items from'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ name, boardId }) => {
        try {
          const items = await this.trelloClient.getChecklistItems(name, boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.registerTool(
      'add_checklist_item',
      {
        title: 'Add Checklist Item',
        description: 'Add a new item to a checklist',
        inputSchema: {
          text: z.string().describe('Text content of the checklist item'),
          checkListName: z.string().describe('Name of the checklist to add the item to'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ text, checkListName, boardId }) => {
        try {
          const item = await this.trelloClient.addChecklistItem(text, checkListName, boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(item, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.registerTool(
      'find_checklist_items_by_description',
      {
        title: 'Find Checklist Items by Description',
        description: 'Search for checklist items containing specific text in their description',
        inputSchema: {
          description: z.string().describe('Text to search for in checklist item descriptions'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ description, boardId }) => {
        try {
          const items = await this.trelloClient.findChecklistItemsByDescription(
            description,
            boardId
          );
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.registerTool(
      'get_acceptance_criteria',
      {
        title: 'Get Acceptance Criteria',
        description: 'Get all items from the "Acceptance Criteria" checklist',
        inputSchema: {
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ boardId }) => {
        try {
          const items = await this.trelloClient.getAcceptanceCriteria(boardId);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    this.server.registerTool(
      'get_checklist_by_name',
      {
        title: 'Get Checklist by Name',
        description: 'Get a complete checklist with all its items and completion percentage',
        inputSchema: {
          name: z.string().describe('Name of the checklist to retrieve'),
          boardId: z
            .string()
            .optional()
            .describe('ID of the Trello board (uses default if not provided)'),
        },
      },
      async ({ name, boardId }) => {
        try {
          const checklist = await this.trelloClient.getChecklistByName(name, boardId);
          if (!checklist) {
            return {
              content: [{ type: 'text' as const, text: `Checklist "${name}" not found` }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(checklist, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Paginated get cards by list
    this.server.registerTool(
      'get_cards_by_list_paginated',
      {
        title: 'Get Cards by List (Paginated)',
        description: 'Fetch cards from a list with pagination support for large lists',
        inputSchema: {
          listId: z.string().describe('The ID of the list'),
          boardId: z
            .string()
            .optional()
            .describe('The ID of the board (uses default if not provided)'),
          limit: z.number().min(1).max(100).default(100).optional().describe('Cards per page'),
          before: z.string().optional().describe('Card ID or date for pagination cursor'),
          fields: z
            .array(z.string())
            .optional()
            .describe('Specific fields to return (reduces token usage)'),
          lightweight: z
            .boolean()
            .default(false)
            .optional()
            .describe('Return only essential fields (id, name, desc)'),
        },
      },
      async input => {
        try {
          const { getCardsByListPaginated } = await import(
            './tools/get-cards-by-list-paginated.js'
          );
          const result = await getCardsByListPaginated(this.trelloClient, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get all cards by list
    this.server.registerTool(
      'get_all_cards_by_list',
      {
        title: 'Get All Cards by List',
        description: 'Fetch all cards from a list automatically handling pagination',
        inputSchema: {
          listId: z.string().describe('The ID of the list'),
          boardId: z.string().optional().describe('The ID of the board'),
          maxCards: z
            .number()
            .min(1)
            .max(10000)
            .default(5000)
            .optional()
            .describe('Maximum cards to fetch (safety limit)'),
          lightweight: z.boolean().default(true).optional().describe('Fetch only essential fields'),
          progressCallback: z
            .boolean()
            .default(false)
            .optional()
            .describe('Report progress during fetch'),
        },
      },
      async input => {
        try {
          const { getAllCardsByList } = await import('./tools/get-all-cards-by-list.js');
          const result = await getAllCardsByList(this.trelloClient, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get card IDs by list
    this.server.registerTool(
      'get_card_ids_by_list',
      {
        title: 'Get Card IDs by List',
        description: 'Fetch only card IDs and names from a list (minimal token usage)',
        inputSchema: {
          listId: z.string().describe('The ID of the list'),
          boardId: z.string().optional().describe('The ID of the board'),
        },
      },
      async input => {
        try {
          const { getCardIdsByList } = await import('./tools/get-card-ids-by-list.js');
          const result = await getCardIdsByList(this.trelloClient, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get cards batch
    this.server.registerTool(
      'get_cards_batch',
      {
        title: 'Get Cards Batch',
        description: 'Fetch multiple specific cards by ID',
        inputSchema: {
          cardIds: z.array(z.string()).min(1).max(100).describe('Array of card IDs to fetch'),
          fields: z.array(z.string()).optional().describe('Specific fields to return'),
        },
      },
      async input => {
        try {
          const { getCardsBatch } = await import('./tools/get-cards-batch.js');
          const result = await getCardsBatch(this.trelloClient, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Get list stats
    this.server.registerTool(
      'get_list_stats',
      {
        title: 'Get List Stats',
        description: 'Get list statistics without fetching all cards',
        inputSchema: {
          listId: z.string().describe('The ID of the list'),
          boardId: z.string().optional().describe('The ID of the board'),
        },
      },
      async input => {
        try {
          const { getListStats } = await import('./tools/get-list-stats.js');
          const result = await getListStats(this.trelloClient, input);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    // Load configuration before starting the server
    await this.trelloClient.loadConfig().catch(() => {
      // Continue with default config if loading fails
    });
    await this.server.connect(transport);
  }
}

const server = new TrelloServer();
server.run().catch(() => {
  // Silently handle errors to avoid interfering with MCP protocol
});
