from flask import Flask, jsonify
from redis import Redis
import os
from datetime import datetime
from env_validator import EnvironmentValidator

app = Flask(__name__)

# Validate environment variables before starting
EnvironmentValidator.validate_environment()

# Initialize Redis connection
redis_url = os.getenv('KV_REST_API_URL')
redis_token = os.getenv('KV_REST_API_TOKEN')

redis_client = None
if redis_url and redis_token:
    try:
        redis_client = Redis(
            host=redis_url,
            port=6379,
            password=redis_token,
            ssl=True
        )
    except Exception as e:
        print(f"Failed to initialize Redis: {e}")

@app.route('/health')
def health_check():
    try:
        # Check Redis connection if available
        redis_status = 'not_configured'
        if redis_client:
            try:
                redis_client.ping()
                redis_status = 'connected'
            except:
                redis_status = 'error'

        return jsonify({
            'status': 'healthy',
            'services': {
                'redis': redis_status,
                'api': 'running'
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)