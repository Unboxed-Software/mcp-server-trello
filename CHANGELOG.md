# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-08-22

### Added
- **Advanced Pagination Support** for handling large Trello boards
  - `get_cards_by_list_paginated` - Manual pagination with cursor support
  - `get_all_cards_by_list` - Automatic pagination for full list fetching
  - `get_card_ids_by_list` - Lightweight card enumeration (IDs and names only)
  - `get_cards_batch` - Efficient batch fetching of specific cards
  - `get_list_stats` - Quick list statistics without full fetch
- **PaginationHelper utility class** for cursor-based pagination
- **Lightweight mode** that reduces token usage by 70-80%
- **Client-side pagination fix** for proper cursor handling
- Comprehensive test scripts for pagination features

### Changed
- Forked to @unboxed-software scope for continued development
- Enhanced error handling for token limit exceeded scenarios
- Improved documentation with pagination examples

### Fixed
- Pagination cursor overlap issue - now properly handles sequential pages
- Token limit errors when fetching large lists (>50 cards)

## [1.3.0] - 2024-08-21 (Original by @delorenj)

### Added
- Initial pagination infrastructure
- Basic pagination tools

## [1.2.0] - Prior Version (Original by @delorenj)

### Added
- Complete Checklist Management Suite
- 5 new checklist tools for comprehensive checklist operations
- Modern MCP SDK architecture
- Enhanced type safety

## [1.1.0] - Prior Version (Original by @delorenj)

### Added
- Workspace management tools
- Board switching capabilities
- Card metadata features

## [1.0.0] - Prior Version (Original by @delorenj)

### Added
- Initial stable release
- Core Trello operations
- Basic card and list management
- MCP protocol compatibility

## Attribution

This project is a fork of the original [mcp-server-trello](https://github.com/delorenj/mcp-server-trello) by Jarad DeLorenzo. We extend our gratitude for the excellent foundation provided by the original implementation.