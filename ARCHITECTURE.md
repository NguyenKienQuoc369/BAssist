# Consul - Visual Architecture & User Flow

## Application Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                   (localhost:3000)                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS 14 FRONTEND                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  App Router (TypeScript + Tailwind CSS)         │   │
│  │                                                  │   │
│  │  ├── / (Home Page)                             │   │
│  │  ├── /study-buddy                              │   │
│  │  ├── /polisher                                 │   │
│  │  ├── /shark-tank                               │   │
│  │  ├── /subject-vault                            │   │
│  │  └── /fact-check                               │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ fetch('/api/...')
                 ▼
┌─────────────────────────────────────────────────────────┐
│         FASTAPI BACKEND (Python 3.9)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/index.py - Serverless Functions            │   │
│  │                                                  │   │
│  │  ├── POST /api/study-buddy                       │   │
│  │  ├── POST /api/polisher                          │   │
│  │  ├── POST /api/shark-tank                        │   │
│  │  ├── POST /api/subject-vault                     │   │
│  │  └── POST /api/fact-check                        │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ API Calls
                 ▼
┌─────────────────────────────────────────────────────────┐
│              GOOGLE GEMINI AI                           │
│         (google.generativeai library)                   │
│                                                         │
│  ├── gemini-pro (Text generation)                       │
│  ├── google_search_retrieval (Fact checking)            │
│  └── Embeddings (Vector store - future)                 │ 
└─────────────────────────────────────────────────────────┘
```

---

## User Flow Diagrams

### Flow 1: Study Buddy (Summarization)

```
User visits /study-buddy
         │
         ▼
┌────────────────────┐
│  1. User pastes    │
│     long text      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  2. Click          │
│     "Summarize"    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  3. Loading        │
│     spinner shown  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  4. POST request   │
│     to /api/       │
│     study-buddy    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  5. FastAPI calls  │
│     Gemini AI      │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  6. AI generates   │
│     summary        │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  7. Display in     │
│     Markdown       │
└────────────────────┘
```

### Flow 2: Subject Vault (RAG System)

```
Mode Selection
     │
     ├─── Store Mode ───┐        ┌─── Query Mode
     │                  │        │
     ▼                  │        ▼
Store Document          │    Ask Question
     │                  │        │
     ▼                  │        ▼
POST /api/subject-vault │    POST /api/subject-vault
     │                  │        │
     ▼                  │        ▼
Add to vector store     │    Search documents
     │                  │        │
     ▼                  │        ▼
Success message         │    AI generates answer
                        │        │
                        │        ▼
                        │    Display result
                        │
                        └────────┘
```

---

##  UI Component Structure

```
App Layout
│
├── Sidebar (Fixed Left)
│   ├── Logo "Consul"
│   ├── Navigation Links
│   │   ├── Home
│   │   ├── Study Buddy
│   │   ├── Polisher
│   │   ├── Shark Tank
│   │   ├── Subject Vault
│   │   └── Fact Check
│   └── Footer Text
│
└── Main Content (Right)
    ├── Page Header
    │   ├── Icon
    │   ├── Title
    │   └── Description
    │
    ├── Input Section
    │   ├── Label
    │   └── Textarea/Input
    │
    ├── Action Button
    │   └── Submit/Process
    │
    └── Result Section
        ├── Loading State (conditional)
        │   ├── Spinner
        │   └── Skeleton
        │
        └── Result Display (conditional)
            └── Markdown Renderer
```

---

##  Color Flow

```
Primary Color: #D63384 (Deep Pink)
    ↓
    Used in:
    ├── Active navigation items
    ├── Primary buttons
    ├── Hover states
    ├── Scrollbar thumb
    └── Accent elements

Background: #FFF0F5 (Lavender Blush)
    ↓
    Used in:
    ├── Page background
    ├── Scrollbar track
    └── Input borders (lighter)

White: #FFFFFF
    ↓
    Used in:
    ├── Sidebar background
    ├── Card backgrounds
    ├── Input backgrounds
    └── Result containers
```

---

##  Responsive Breakpoints

```
Mobile          Tablet          Desktop
< 768px         768px-1024px    > 1024px
   │               │               │
   ▼               ▼               ▼
Stack           Adapt           Full
Everything      Layout          Layout
   │               │               │
   ├─ Sidebar     ├─ Sidebar     ├─ Fixed Sidebar
   │  collapsed    │  visible     │  always visible
   │               │               │
   └─ Single      └─ 2-column    └─ 3-column
      column         grid            grid
```

---

##  Data Flow Security

```
Environment Variables (.env.local)
         │
         ├── GEMINI_API_KEY (Secret)
         │
         ▼
FastAPI Backend (Server-side only)
         │
         ├── Never exposed to frontend
         │
         ▼
API Calls to Gemini
         │
         ▼
Response sent to frontend
         │
         └── Only AI-generated text
             (No API keys exposed)
```

---

## Performance Optimization

```
User Request
     │
     ▼
┌─────────────────┐
│ Show loading    │ ← Immediate feedback
│ spinner         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API call        │ ← Async operation
│ (3-10 seconds)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stream response │ ← Progressive display
│ if available    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Render Markdown │ ← Rich formatting
│ with syntax     │
│ highlighting    │
└─────────────────┘
```

---

##  Deployment Flow

```
Local Development
     │
     ├── npm run dev
     │
     ▼
Git Repository
     │
     ├── git push
     │
     ▼
Vercel Platform
     │
     ├── Automatic build
     │   ├── Install Node deps
     │   ├── Install Python deps
     │   └── Build Next.js
     │
     ▼
Deploy to Edge
     │
     ├── Frontend: Vercel Edge
     ├── Backend: Vercel Serverless
     │
     ▼
Production URL
     │
     └── https://your-app.vercel.app
```

---

## Feature Decision Tree

```
User opens Consul
     │
     ├─── Need to understand content? → Study Buddy
     │
     ├─── Need professional writing? → Polisher
     │
     ├─── Testing business idea? → Shark Tank
     │
     ├─── Storing knowledge? → Subject Vault
     │    │
     │    ├─── Store → Add document
     │    └─── Retrieve → Query vault
     │
     └─── Verify information? → Fact Check
```

---

## State Management

```
Component State (useState)
     │
     ├── text/input
     ├── result/output
     ├── loading
     └── error
          │
          ▼
User Interaction
          │
          ▼
State Updates
          │
          ├── setLoading(true)
          ├── API call
          ├── setResult(data)
          └── setLoading(false)
               │
               ▼
UI Re-renders
```

---

## Animation Timeline

```
Button Click
     │ (0ms)
     ▼
Button disabled + Loading text
     │ (50ms)
     ▼
Spinner appears
     │ (100ms - 10s)
     ├── Spinner rotates
     └── Skeleton pulses
          │ (After API response)
          ▼
Fade out spinner
     │ (300ms)
     ▼
Fade in result
     │ (500ms)
     ▼
Smooth scroll to result
     │ (300ms)
     ▼
Button re-enabled
```

---

## User Experience Flow

```
1. Landing Page
   │
   ├── Beautiful hero section
   ├── Feature cards with icons
   ├── Stats display
   └── CTA button
        │
        ▼
2. Select Feature (via sidebar)
        │
        ▼
3. Feature Page
   │
   ├── Clear instructions
   ├── Large input area
   ├── Character count (if applicable)
   └── Prominent submit button
        │
        ▼
4. Processing
   │
   ├── Loading animation
   ├── Disabled inputs
   └── Clear feedback
        │
        ▼
5. Results
   │
   ├── Beautifully formatted
   ├── Easy to read
   ├── Copy-friendly
   └── Option to try again
```

