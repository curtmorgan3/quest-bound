FROM node:24.0.0
WORKDIR /app
COPY package*.json ./

RUN npm install --legacy-peer-deps
COPY . .

# Prisma generate needs DATABASE_URL at config load time, but doesn't actually connect.
# Provide a dummy value for the build phase.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build:docker

RUN mkdir -p ./dist/storage/images ./dist/storage/charts ./dist/storage/documents ./dist/storage/uploads

EXPOSE 8000
CMD ["npm", "run", "start:docker"]