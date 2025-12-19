# This Dockerfile is for running the app in production. It is be connected to Redis with docker-compose.yml.

# Use the official Node.js image as the base image
FROM node:20-bullseye

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 3004

# Command to run the application
CMD ["node", "dist/main"]
