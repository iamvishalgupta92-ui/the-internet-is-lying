# The Internet Is Lying

### AI-Powered Digital Truth Investigation Platform

**The Internet Is Lying** is a digital investigation platform designed to organize digital evidence, investigate suspicious incidents, connect clues, track people involved, and manage investigation cases through a centralized dashboard.

The platform follows a digital-forensics-inspired workflow that helps investigators organize information and examine the details of a case in a structured way.

---

## Overview

Digital information can come from many sources, including messages, emails, browser history, photographs, documents, and location records. Keeping these details organized and understanding how they relate to one another can be challenging.

**The Internet Is Lying** provides a centralized workspace for managing investigation cases and their associated evidence, clues, people, and notes. Its dark, detective-inspired interface is designed to make complex investigation workflows easier to navigate.

The project includes a React-based frontend and a Spring Boot backend, with an AI assistant powered by Google's Gemini API.

## Key Features

### 1. Investigation Dashboard
- Centralized overview of investigation cases.
- Case status and investigation progress.
- Quick access to investigation modules.
- Organized workspace for reviewing case information.

### 2. Case Management
- Create and manage investigation cases.
- View individual case details.
- Track case status and progress.
- Organize related evidence and investigation records.

### 3. Digital Evidence Management
- Store and manage evidence associated with a case.
- Organize evidence records for investigation.
- Link evidence to the relevant investigation.
- Retrieve evidence for further review.

### 4. Clue Investigation
- Create and manage clues linked to investigation cases.
- Track clue statuses, including investigating, confirmed, and dismissed.
- Reopen previously resolved clues when necessary.
- Automatically update case progress according to resolved clues.

### 5. People Management
- Maintain records of people associated with a case.
- Keep investigation-related information organized.

### 6. Investigation Notes
- Create and manage notes for individual cases.
- Keep observations and investigation details in one place.

### 7. AI Investigation Assistant
- Send questions to an AI assistant.
- Receive AI-generated responses through the backend.
- Use AI assistance to explore investigation questions and analyze provided context.

*AI responses may depend on model availability and network connectivity.*

### 8. Timeline and Navigation
- Access investigation areas through a dedicated dashboard navigation.
- Keep case-related activities and records organized within the application.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Development server and build tooling |
| JavaScript | Frontend application logic |
| CSS | Application styling and responsive layouts |
| Java | Backend application logic |
| Spring Boot | REST API development |
| REST APIs | Communication between frontend and backend |
| Google Gemini API | AI assistant responses |
| Git and GitHub | Version control and source code hosting |

## Application Architecture

The frontend communicates with the backend through REST API endpoints. The backend handles application operations and connects to the AI service when an AI request is submitted.

```text
User
  |
  v
React + Vite Frontend
  |
  | HTTP / REST API
  v
Spring Boot Backend
  |
  +---- Case Management
  |
  +---- Evidence Management
  |
  +---- Clue Management
  |
  +---- People and Notes
  |
  +---- Gemini AI Service
```

## Project Structure

```text
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running the frontend:

- Node.js (LTS version recommended)
- npm
- Git
- A code editor such as Visual Studio Code

The Spring Boot backend must also be running for features that require API access.

### 1. Clone the Repository

```bash
git clone https://github.com/iamvishalgupta92-ui/the-internet-is-lying.git
```

### 2. Open the Frontend Directory

```bash
cd the-internet-is-lying/frontend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal. With the default Vite configuration, this is usually:

```text
http://localhost:5173
```

### 5. Build for Production

```bash
npm run build
```

Vite generates the production build in the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Backend Configuration

The frontend is configured to communicate with the backend API at:

```text
http://localhost:8080/api
```

The backend should be running on port `8080` before testing API-dependent features.

Common API routes include:

| Module | Endpoint |
|---|---|
| Cases | `/api/cases` |
| Evidence | `/api/evidence` |
| Case Evidence | `/api/evidence/case/{caseId}` |
| Clues | `/api/clues` |
| Case Clues | `/api/clues/case/{caseId}` |
| People | `/api/people` |
| Notes | `/api/notes` |
| AI Assistant | `/api/ai/chat` |

The AI service requires a valid Gemini API key configured on the backend. **Never place API keys or other secrets in frontend source code or commit them to GitHub.**

## Design Approach

The interface follows a dark, digital-investigation aesthetic with a charcoal background, crimson accents, and contrasting status colors.

The design focuses on:

- Clear navigation between investigation modules.
- Readable case and evidence information.
- Distinct investigation status indicators.
- A consistent visual language across the application.
- A dashboard-oriented workflow for case review and management.

## Development Workflow

1. Start the Spring Boot backend.
2. Open the `frontend` directory in VS Code.
3. Install dependencies using `npm install`.
4. Run the frontend using `npm run dev`.
5. Test case, evidence, clue, people, notes, and AI workflows.
6. Create a production build using `npm run build`.

## Future Enhancements

Potential future improvements include:

- Secure user authentication and role-based access.
- Advanced evidence filtering and search.
- Visual relationships between clues, evidence, and people.
- Enhanced investigation timelines.
- AI-assisted evidence summaries and case insights.
- Automated testing and production deployment.

These are potential enhancements and should not be interpreted as already implemented features.

## Project Status

The project is under active development as a digital investigation platform combining a React frontend, a Spring Boot backend, and an AI assistant.

## Author

**Vishal Gupta**

GitHub: [iamvishalgupta92-ui](https://github.com/iamvishalgupta92-ui)

---

*The Internet Is Lying — Investigate the evidence. Connect the clues. Find the truth.*
