# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre
RUN groupadd --system orgest && useradd --system --gid orgest --home /app --shell /usr/sbin/nologin orgest \
 && mkdir -p /app /data/uploads && chown -R orgest:orgest /app /data
WORKDIR /app
COPY --from=build --chown=orgest:orgest /src/target/orgest.jar /app/orgest.jar
USER orgest
ENV SERVER_ADDRESS=0.0.0.0 SERVER_PORT=8080 UPLOAD_DIR=/data/uploads
EXPOSE 8080
ENTRYPOINT ["java","-Xms256m","-Xmx512m","-XX:+ExitOnOutOfMemoryError","-Djava.security.egd=file:/dev/urandom","-jar","/app/orgest.jar"]
