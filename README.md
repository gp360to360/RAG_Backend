# **RAG-Powered News Chatbot \- Backend**

This repository contains the backend server for a full-stack, Retrieval-Augmented Generation (RAG) powered chatbot. Built with NestJS, this server acts as the central brain of the application, handling the core AI logic, session management, and API communications.

## **🚀 Features**

* **Advanced RAG Pipeline:** Orchestrates the entire RAG flow:  
  * Retrieves relevant context from a **Qdrant** vector database.  
  * Constructs detailed, instruction-based prompts for the LLM.  
  * Calls the **Google Gemini API** to generate context-aware responses.  
* **Real-time Streaming:** Implements Server-Sent Events (SSE) to stream AI responses word-by-word to the client, providing an instant and engaging user experience.  
* **Robust API:** Exposes a clean REST API for the frontend to manage chat interactions, including fetching history and resetting sessions.  
* **High-Performance Caching:** Utilizes **Redis** for fast, in-memory caching of all user session histories.  
* **Scalable Architecture:** Built with NestJS, providing a modular, scalable, and maintainable codebase using TypeScript.

## **🛠️ Tech Stack**

* **Framework:** NestJS (Node.js) with TypeScript.  
* **Vector Database:** Qdrant (for storing and searching text embeddings).  
* **Cache & Session Store:** Redis.  
* **AI Services:**  
  * **Google Gemini API:** For generating the final text responses.  
  * **Jina AI API:** For creating the text embeddings.  
* **Containerization:** Docker (for running Qdrant and Redis).

## **⚙️ Setup and Installation**

Follow these steps to get the backend server running on your local machine.

### **Prerequisites**

* [Node.js](https://nodejs.org/) (v18 or higher recommended)  
* pnpm package manager (or npm/yarn)  
* [Docker](https://www.docker.com/products/docker-desktop/) must be installed and running.

### **Installation**

1. **Clone the repository:**  
   git clone \[https://github.com/your-username/your-backend-repo-link.git\](https://github.com/your-username/your-backend-repo-link.git)  
   cd your-backend-repo-folder

2. **Install dependencies:**  
   pnpm install

3. Start Services with Docker:  
   This project requires Qdrant and Redis instances. The easiest way to run them is with Docker.  
   \# Start Redis container  
   docker run \--name my-redis \-p 6379:6379 \-d redis

   \# Start Qdrant container  
   docker run \--name my-qdrant \-p 6333:6333 \-d qdrant/qdrant

   *Note: You must also run the Python ingestion script (ingest.py) to populate the Qdrant database with data.*  
4. Configure Environment Variables:  
   Create a new file named .env in the root of the project directory. This file will hold your secret keys and connection URLs.  
   \# .env

   \# Port for the server to run on  
   PORT=8000

   \# API Keys for AI Services  
   GEMINI\_API\_KEY="your\_google\_ai\_studio\_api\_key"  
   JINA\_API\_KEY="your\_jina\_ai\_key"

   \# Connection URLs for Docker services  
   QDRANT\_URL="http://localhost:6333"  
   REDIS\_URL="redis://localhost:6379"

### **Running the Development Server**

Start the NestJS development server. The application will be available at http://localhost:8000.

pnpm run start:dev

## **Endpoints API**

The server exposes the following REST API endpoints:

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| GET | /api/chat/sessions | Retrieves all session IDs and their chat histories. |
| GET | /api/chat/:sessionId | Fetches the chat history for a specific session ID. |
| SSE | /api/chat/stream | Streams a new chat response back to the client. |
| DELETE | /api/chat/:sessionId | Deletes the chat history for a specific session ID. |

## **☁️ Deployment**

This NestJS application is ready for deployment on any platform that supports Node.js, such as **Render**, **Fly.io**, or **AWS**.

When deploying:

* Deploy Qdrant and Redis as private services/add-ons on your hosting platform.  
* Set all the required environment variables (QDRANT\_URL, REDIS\_URL, GEMINI\_API\_KEY, etc.) in your deployment service's settings.  
* Ensure the CORS configuration in src/main.ts is updated to allow requests from your live frontend's URL.