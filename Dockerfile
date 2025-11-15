FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies separately for better layer caching
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# The app listens on 3001 by default
ENV PORT=3001
EXPOSE 3001

# Ensure production environment by default
ENV NODE_ENV=production

# Start the server
CMD ["node", "src/server.js"]


