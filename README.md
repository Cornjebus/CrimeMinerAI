# CrimeMiner AI

An AI-powered criminal investigation case management system designed to help law enforcement agencies manage cases, evidence, and analysis more efficiently.

## Project Structure

This project consists of two main parts:

- **crimeminer-ai-server**: Backend API server built with Node.js, Express, and Prisma
- **crimeminer-ai-web**: Frontend web application built with Next.js and React

## Features

- Case management
- Evidence collection and analysis
- Multi-file upload support
- Document type validation
- User management
- Reporting tools

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- PostgreSQL (for production)

### Development Setup

1. Clone this repository
2. Set up the backend:
   ```
   cd crimeminer-ai-server
   npm install
   npm run dev
   ```

3. Set up the frontend:
   ```
   cd crimeminer-ai-web
   npm install
   npm run dev
   ```

4. The backend will be available at http://localhost:4000
5. The frontend will be available at http://localhost:3000

## Recent Updates

- Added support for multiple file uploads
- Added extensive file type validation (images, documents, audio, video)
- Improved error handling and user feedback
- Fixed issues with file upload database schema

## Development

### Backend

The backend server is located in the `crimeminer-ai-server` directory and runs on port 4000.

To start the backend server manually:

```bash
cd crimeminer-ai-server
PORT=4000 npm run dev
```

### Frontend

The frontend application is located in the `crimeminer-ai-web` directory and runs on port 3000.

To start the frontend server manually:

```bash
cd crimeminer-ai-web
npm run dev
```

## Technology Stack

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- TypeScript
- RESTful API

### Frontend
- Next.js
- React
- Tailwind CSS
- TypeScript
- shadcn/ui components

## License

[MIT](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or support, please reach out to [Cornelius@chuqlab.com]Cornelius@chuqlab.com). 