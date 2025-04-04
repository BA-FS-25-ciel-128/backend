FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application if needed
# RUN npm run build

# Expose the port your application runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]