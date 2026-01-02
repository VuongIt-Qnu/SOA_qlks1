echo "========================================"
echo "  SOA QUAN LY KHACH SAN - START SCRIPT"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "[ERROR] Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "[1/4] Checking Docker..."
docker --version
echo ""

echo "[2/4] Checking if .env exists..."
if [ ! -f .env ]; then
    echo "[INFO] Creating .env from .env.example..."
    cp .env.example .env
    echo "[INFO] .env file created. You may want to edit it."
else
    echo "[INFO] .env file already exists."
fi
echo ""

echo "[3/4] Building and starting services..."
docker-compose up -d --build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start services!"
    exit 1
fi
echo ""

echo "[4/4] Waiting for services to be ready..."
sleep 10
echo ""

echo "========================================"
echo "  SERVICES STATUS"
echo "========================================"
docker-compose ps
echo ""

echo "========================================"
echo "  SERVICES ARE RUNNING!"
echo "========================================"
echo ""
echo "API Documentation:"
echo "  - Auth:      http://localhost:8001/docs"
echo "  - Customer:  http://localhost:8002/docs"
echo "  - Room:      http://localhost:8003/docs"
echo "  - Booking:   http://localhost:8004/docs"
echo "  - Payment:   http://localhost:8005/docs"
echo "  - Report:    http://localhost:8006/docs"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"
echo ""

