# Sweet Dreams Music Platform

A modern web platform for Sweet Dreams Music, combining professional audio production, videography, and AI-powered artist development.

## Features

- Professional Audio Production Services
- Professional Videography Services
- AI-Powered Brand Development
- Secure File Management
- Integrated Payment Processing
- Artist Development Platform
- Personalized Dashboards
- Gamified Growth System

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Firebase Authentication
- **Database**: Firestore
- **Storage**: Firebase Cloud Storage
- **Backend**: Firebase Cloud Functions
- **Payments**: Stripe
- **Accounting**: Xero API
- **AI Integration**: Relevance AI API

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sweetdreamsstudios.git
   cd sweetdreamsstudios
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   XERO_CLIENT_ID=your_xero_client_id
   XERO_CLIENT_SECRET=your_xero_client_secret
   RELEVANCE_AI_API_KEY=your_relevance_ai_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
sweetdreamsstudios/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # Reusable React components
│   ├── lib/                 # Utility functions and shared logic
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles and Tailwind config
├── public/                 # Static assets
├── firebase/              # Firebase configuration and functions
└── scripts/               # Build and deployment scripts
```

## Development Guidelines

- Follow the TypeScript strict mode guidelines
- Use Tailwind CSS for styling
- Implement responsive design for all components
- Write unit tests for critical functionality
- Follow the Git flow branching strategy
- Keep components small and focused
- Use proper error handling and loading states

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited. 