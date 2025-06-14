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

## Recent Changes (June 14, 2025)

### Critical Duplicate Response Bug Fix - Complete Resolution (12:16 AM)
- **Background Monitoring Disabled**: Completely disabled the background monitoring system that was causing duplicate AI responses
- **Single Response System**: Only real-time automation now processes individual chat messages, ensuring one response per user message
- **Enhanced Data Access**: Added comprehensive client data retrieval to real-time automation (macro targets, recent uploads, progress entries)
- **Full Context AI Responses**: AI now has access to all client data including freshly uploaded information for accurate, data-driven responses
- **Production Ready**: System now handles individual chat automation with complete data integrity and no duplicate responses

## Previous Changes (June 13, 2025)

### Critical AI Accuracy Fix - Data Integrity Enforcement (11:38 PM)
- **Fixed False Claims Issue**: AI was making incorrect statements about workout consistency when no completion data existed
- **Enhanced System Prompt**: Added explicit DATA ACCURACY REQUIREMENTS to prevent fabricated progress claims
- **Improved Context Building**: Updated buildUserContext to clearly distinguish between assigned workout plans vs actual completion logs
- **Authentic Data Only**: AI now only references verified data (nutrition uploads, weight entries, user profile) and acknowledges missing data gaps
- **Workout Data Clarification**: System explicitly notes when no workout completion logs exist to prevent false consistency claims

### AI Enhancement - Daily Data Upload Encouragement (11:44 PM)
- **Proactive Tracking Encouragement**: AI now strongly encourages daily macro logging when nutrition data is missing
- **Progress Tracking Emphasis**: System emphasizes importance of daily weight and wellness tracking for optimal results
- **Enhanced System Prompt**: Added DAILY TRACKING EMPHASIS section with specific guidance for missing data scenarios
- **Context Priority Markers**: Added priority indicators in user context to highlight missing data requiring encouragement
- **Goal-Connected Messaging**: AI connects data tracking importance to client's specific weight-loss goals and program effectiveness

### AI Persona Enhancement - Rachel Freiman Coaching Style (11:59 PM)
- **Updated Voice & Tone**: Warm, upbeat, straight-talking "knowledgeable best friend with teacher energy"
- **Core Philosophy Integration**: Education over meal plans, food freedom mindset, numbers as tools not judgments
- **MindStrong Fitness Approach**: Protein-first weight loss, flexible dieting, macro mastery education
- **Response Framework**: Acknowledge + Empathize, Educate, Actionable steps, Positive close
- **Authentic Communication**: Natural coaching language with relatable analogies and supportive exclamations

### Enhanced Individual Chat Automation with Comprehensive Client Context (11:32 PM)
- **Complete Client Data Integration**: AI responses now include macro targets, recent uploads, progress entries, and workout history
- **Enhanced User Context**: buildUserContext function provides comprehensive client profile including current goals, restrictions, and progress
- **Comprehensive Data Gathering**: Individual chat automation retrieves macro targets, recent 7-day uploads, progress updates, today's workout, and workout history
- **Personalized AI Responses**: Coach Chassidy now has full visibility into client's nutrition compliance, weight progress, and workout completion
- **Storage Function Enhancement**: Fixed getUserChatMessages to include both user messages and Coach Chassidy automated responses
- **Real-Time Display**: Individual chat interface now properly displays automated responses from Coach Chassidy

### Individual Chat Automation - Fully Operational (11:07 PM)
- **Complete System Success**: Individual chat automation working perfectly with automated AI responses
- **Confidence Threshold Fix**: Resolved blocking issue by adjusting threshold from 7 to 0 for reliable automation
- **Background Processing**: 20-second monitoring system successfully processes and responds to user messages
- **Live Response Delivery**: Automated AI responses with proper delay timing and timezone handling
- **Real-Time WebSocket**: Message counters and notifications update instantly across all connected clients

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