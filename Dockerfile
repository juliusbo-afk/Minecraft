FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 SAVE_DIR=/data
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server/index.js"]
