FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache python3 py3-reportlab ttf-dejavu
COPY package.json ./
RUN npm install --omit=dev
COPY . ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
