# AI-Powered Fitness & Nutrition Coaching Application

## Overview
An AI-powered fitness and nutrition coaching web application that provides intelligent, personalized wellness support through advanced data-driven insights and interactive user experiences. Built with React frontend, Node.js/Express backend, TypeScript, and Drizzle ORM.

## Key Features
- Real-time group chat and individual coaching sessions
- AI-powered content moderation with personalized responses
- Macro tracking and nutrition analysis
- Progress reporting and PDF generation
- Voice message transcription
- Automated topic generation for group discussions

## Recent Changes (June 13, 2025)

### Content Moderation System Enhancements
- **Personalized Private Messages**: AI now addresses clients by first name in violation warnings (e.g., "Hi John,")
- **Group Chat Reminders**: Brief topic reminders posted to group when violations occur: "Let's keep our discussions focused on fitness and nutrition topics. Thanks everyone! 💪"
- **Real-Time Counter Management**: WebSocket broadcasting ensures all message counters update instantly across the application
- **Counter Clearing on Tab Access**: Message counters now properly clear to 0 when users enter relevant message tabs
- **Auto-Approval**: Moderation messages are automatically approved for immediate delivery
- **WebSocket Integration**: Enhanced ChatTab component with real-time message and counter handling

### Technical Implementation
- Updated `generateModerationWarning()` function to accept client first name parameter
- Enhanced WebSocket broadcasting in `/api/chat/messages` endpoint
- Added real-time counter updates for both individual and group chats
- Implemented automatic counter clearing when switching between chat types
- Enhanced ChatTab useEffect hooks to mark messages as read and clear counters immediately
- Integrated WebSocket message handling with intelligent counter update filtering
- Cache invalidation for immediate UI updates

## User Preferences
- Focus on fitness and nutrition topics in group discussions
- Supportive but firm moderation approach using Coach Chassidy persona
- Real-time functionality for all chat interactions
- Personalized messaging addressing clients by name

## Project Architecture

### Backend Structure
- `server/routes.ts`: Main API routes including enhanced chat moderation
- `server/openai.ts`: AI coaching and moderation logic
- `server/storage.ts`: Database operations with Drizzle ORM
- `server/db.ts`: PostgreSQL connection management

### Frontend Structure
- `client/src/components/ChatTab.tsx`: Enhanced with WebSocket real-time updates
- `client/src/hooks/useWebSocket.ts`: WebSocket connection management
- Real-time message and counter synchronization

### WebSocket Implementation
- Path: `/ws` (separate from Vite HMR)
- Message types: `private_moderation_message`, `new_group_message`, `counter_update`, `group_counter_update`
- Real-time broadcasting for all chat interactions

## Content Moderation Workflow
1. AI analyzes group messages for fitness/nutrition relevance
2. Off-topic messages trigger personalized private warnings with client's first name
3. Group receives brief, encouraging reminders to stay on topic
4. All messages auto-approved for instant delivery
5. WebSocket broadcasting ensures real-time counter updates

## Technology Stack
- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4 for coaching and moderation
- **Real-time**: WebSocket for live updates
- **UI**: shadcn/ui components with dark mode support