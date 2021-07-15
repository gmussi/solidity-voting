FROM node:16-slim
WORKDIR /app
COPY package.json /app
COPY gui /app/gui/
COPY bin/contracts /app/bin/contracts
RUN npm install
CMD ["npm", "run", "server"]