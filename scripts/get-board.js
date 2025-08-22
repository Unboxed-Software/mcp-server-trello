#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { TrelloClient } from '../build/trello-client.js';

async function getBoard() {
  const client = new TrelloClient({
    apiKey: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN
  });

  try {
    // Get boards from workspace
    const workspaceId = process.env.TRELLO_WORKSPACE_ID;
    console.log(`Getting boards from workspace: ${workspaceId}`);
    
    const boards = await client.listBoardsInWorkspace(workspaceId);
    console.log('\nAvailable boards:');
    for (const board of boards) {
      console.log(`  - ${board.name}: ${board.id}`);
      
      // Get lists for each board to find our target list
      try {
        const lists = await client.getLists(board.id);
        const targetList = lists.find(l => l.id === '661af5159b899646c00a5cc0');
        if (targetList) {
          console.log(`    ✓ Found target list "${targetList.name}" in this board!`);
          console.log(`\nTo test pagination, set this in your .env:`);
          console.log(`TRELLO_BOARD_ID=${board.id}`);
        }
      } catch (e) {
        // Skip if we can't access lists
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getBoard();