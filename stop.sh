echo "========================================"
echo "  STOPPING SOA SERVICES"
echo "========================================"
echo ""

docker-compose down

echo ""
echo "Services stopped!"
echo ""
echo "To remove volumes (delete data): docker-compose down -v"
echo ""

