FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.js"]
