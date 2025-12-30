# Use Playwright's official image with browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Set environment variable for Cloud Run
ENV PORT=8080

# Run the server
CMD ["node", "server.js"]
