#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { TrelloClient } from '../build/trello-client.js';

async function checkLists() {
  const client = new TrelloClient({
    apiKey: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_TOKEN,
    defaultBoardId: process.env.TRELLO_BOARD_ID
  });

  try {
    const boardId = process.env.TRELLO_BOARD_ID || '661af5159b899646c00a5cc0';
    const lists = await client.getLists(boardId);
    console.log(`Available lists on board ${boardId}:`);
    console.log('=' .repeat(60));
    
    for (const list of lists) {
      // Get card count for each list
      try {
        const cards = await client.getCardsInList(boardId, list.id, 1000);
        console.log(`  - ${list.name}: ${list.id} (${cards.length} cards)`);
      } catch (e) {
        console.log(`  - ${list.name}: ${list.id} (error counting cards)`);
      }
    }
    
    // Check if the target list exists
    const targetId = '661af5159b899646c00a5cc0';
    const targetList = lists.find(l => l.id === targetId || l.id.includes(targetId));
    if (targetList) {
      console.log(`\nTarget list found: ${targetList.name} (${targetList.id})`);
    } else {
      console.log(`\nTarget list ${targetId} not found in board lists`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkLists();