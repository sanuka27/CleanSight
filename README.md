# CleanSight

CleanSight is a community-driven platform for reporting and managing waste issues, connecting users with volunteers for cleanup coordination.

## Features

- **Waste Reporting**: Users can report waste locations with photos and descriptions
- **Volunteer Coordination**: Volunteers can view and claim cleanup tasks
- **Interactive Maps**: Visualize reports and volunteer activities on maps
- **User Authentication**: Secure login/signup with Firebase
- **Real-time Updates**: Live dashboard for tracking reports and activities
- **Responsive Design**: Mobile-friendly interface built with React and Tailwind CSS

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Framer Motion** for animations
- **Firebase** for authentication
- **TanStack Query** for data fetching
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Firebase Admin** for server-side Firebase operations
- **JWT** for authentication
- **Multer** for file uploads

## Installation

1. Ensure you have Node.js and pnpm installed
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables (see configuration sections below)

## Configuration

### Backend
Create a `.env` file in the `Backend` directory with:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

### Frontend
Create a `.env` file in the `Frontend` directory with:
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_API_BASE_URL=http://localhost:5000/api
```

## Usage

### Development
Run both frontend and backend in development mode:
```bash
pnpm run dev
```

Run frontend only:
```bash
pnpm run dev:frontend
```

Run backend only:
```bash
pnpm run dev:backend
```

### Build
Build the frontend for production:
```bash
pnpm run build
```

### Testing
Run tests for the frontend:
```bash
pnpm test
```

## Project Structure

```
CleanSight/
├── Backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── package.json
└── pnpm-workspace.yaml
```

## License

MIT
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
