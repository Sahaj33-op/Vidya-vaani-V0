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
    langdetect

# Switch back to rasa user
USER 1001

# Train the model
RUN rasa train

# Expose port
EXPOSE 5005

# Start Rasa server
CMD ["run", "--enable-api", "--cors", "*", "--debug"]
