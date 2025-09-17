# Dockerfile for Rasa server
FROM rasa/rasa:3.6.4-full

# Set working directory
WORKDIR /app

# Copy Rasa files
COPY . /app

# Install additional dependencies
USER root
RUN pip install --no-cache-dir \
    requests \
    redis \
    langdetect \
    curl

# Switch back to rasa user
USER 1001

# Train the model
RUN rasa train

# Expose port
EXPOSE 5005

# Add health check for Rasa server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5005/status || exit 1

# Start Rasa server
CMD ["run", "--enable-api", "--cors", "*", "--debug"]
