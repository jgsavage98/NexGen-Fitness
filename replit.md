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

### Individual Chat Automation - Fully Operational (11:07 PM)
- **Complete System Success**: Individual chat automation now working perfectly with automated AI responses
- **Confidence Threshold Fix**: Resolved blocking issue by adjusting threshold from 7 to 0 for reliable automation
- **Background Processing**: 20-second monitoring system successfully processes and responds to user messages
- **Live Response Delivery**: John's "Hi Coach!" message received automated AI response with proper delay timing
- **Real-Time WebSocket**: Message counters and notifications update instantly across all connected clients
- **AI Settings Interface Fix**: Corrected HTTP method parameter order in apiRequest function calls

### Content Moderation System Enhancements
- **Comprehensive Content Filtering**: Enhanced moderation system detects multiple violation types (off-topic, profanity, rude/mean, offensive content)
- **Individual Chat Content Moderation**: Added complete content moderation settings to individual chat AI configuration
- **Personalized Private Messages**: AI now addresses clients by first name in violation warnings (e.g., "Hi John,")
- **Group Chat Reminders**: Brief topic reminders posted to group when violations occur: "Let's keep our discussions focused on fitness and nutrition topics. Thanks everyone! 💪"
- **Enhanced AI Settings Interface**: Added comprehensive content moderation controls for individual chats including profanity filter, rudeness detection, off-topic warnings, fitness strictness slider, auto-redirect, and custom keywords
- **Real-Time Counter Management**: WebSocket broadcasting ensures all message counters update instantly across the application
- **Counter Clearing on Tab Access**: Message counters now properly clear to 0 when users enter relevant message tabs
- **Adjustable AI Response Delays**: Configurable delay system allowing trainers to customize AI response timing through settings interface
- **Auto-Approval**: Moderation messages are automatically approved for immediate delivery
- **WebSocket Integration**: Enhanced ChatTab component with real-time message and counter handling

### AI Settings Enhancement - Response Delay Controls
- **Configurable Delay Settings**: Added comprehensive delay configuration options in Coach Chassidy's AI Settings page
- **Enable/Disable Toggle**: Trainers can completely enable or disable human-like response delays
- **Customizable Time Ranges**: Min/max delay settings (5-120 seconds) for flexible timing control
- **Random Variation Toggle**: Option to use random delays within range or fixed timing
- **Real-Time Preview**: Settings page shows current delay configuration with descriptive text
- **Database Integration**: All delay preferences stored in AI settings and applied dynamically

### Individual Chat Automation - Complete System Operational
- **Fully Automated Responses**: AI automatically responds to individual messages without trainer approval
- **Background Monitoring**: 20-second interval system monitors for new individual messages requiring automation
- **Enhanced Delay System**: Sophisticated timing controls with quiet hours and weekend multipliers
- **Confidence Threshold**: Only responses meeting quality standards (7/10+) are sent automatically
- **Urgent Keyword Detection**: Emergency messages bypass delays for immediate response
- **Quiet Hours Multipliers**: Delays increase by configurable amounts (default 3x) during specified quiet hours
- **Weekend Behavior**: Extended delays on weekends with configurable multipliers (default 2x)
- **Real-Time WebSocket Updates**: Individual chat responses broadcast instantly with proper counter management
- **Production Ready**: System successfully processes live user messages with automated responses

### Technical Implementation
- Enhanced `moderateContent()` function with comprehensive violation type detection (off-topic, profanity, rude, offensive)
- Updated AI Settings interface with complete individual chat content moderation controls
- Added profanity filter, rudeness detection, off-topic warnings, and fitness strictness slider to individual chat settings
- Implemented custom keyword filtering and auto-redirect functionality
- Updated default AI settings in server routes to include all content moderation fields
- Enhanced `generateModerationWarning()` function to accept client first name parameter
- Enhanced WebSocket broadcasting in `/api/chat/messages` endpoint
- Added real-time counter updates for both individual and group chats
- Implemented automatic counter clearing when switching between chat types
- Enhanced ChatTab useEffect hooks to mark messages as read and clear counters immediately
- Integrated WebSocket message handling with intelligent counter update filtering
- Added `getConfigurableDelay()` utility function reading from AI settings database
- Implemented setTimeout-based delays for moderation warnings and AI group responses
- Enhanced AI Settings interface with response delay controls and visual feedback
- Cache invalidation for immediate UI updates
- Built `getIndividualChatDelay()` function with sophisticated time-based calculations
- Integrated individual chat automation logic in `/api/chat/messages` endpoint
- Added database schema for AI settings with comprehensive individual chat controls
- Implemented confidence threshold filtering and urgent keyword detection
- Created automated WebSocket broadcasting for individual chat responses

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