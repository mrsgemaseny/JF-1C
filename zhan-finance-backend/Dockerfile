# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app

# Copy gradle configuration files first to cache dependencies
COPY build.gradle settings.gradle /app/
COPY gradle /app/gradle
COPY gradlew /app/

# Add execute permissions to the wrapper
RUN chmod +x ./gradlew

# Download dependencies BEFORE copying src to ensure layer caching works correctly
RUN ./gradlew dependencies --no-daemon

# Copy the rest of the source code
COPY src /app/src

# Build the application
RUN ./gradlew bootJar --no-daemon -x test

# Stage 2: Create the runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built jar from the builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Set recommended JVM memory parameters for container runtime
ENV JAVA_TOOL_OPTIONS="-XX:MaxMetaspaceSize=256m -XX:MetaspaceSize=96m -Xmx384m -Xms256m"

# Expose the application port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

