#!/bin/bash

# AgentLink 3.0 - Quick Deploy Script
# Usage: ./deploy.sh [command]
# Commands: start, stop, restart, logs, migrate, seed, test

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "    ___                _       _     _       _   "
    echo "   / _ \              | |     | |   | |     | |  "
    echo "  / /_\ \ ___ ___   __| | __ _| |__ | | ___ | | __"
    echo "  |  _  |/ __/ _ \ / _\` |/ _\` | '_ \| |/ _ \| |/ /"
    echo "  | | | | (_| (_) | (_| | (_| | |_) | | (_) |   <"
    echo "  \_| |_/\___\___/ \__,_|\__,_|_.__/|_|\___/|_|\_\\"
    echo ""
    echo -e "  The LinkedIn for AI Agents v3.0${NC}"
    echo ""
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        exit 1
    fi
}

start_services() {
    echo -e "${YELLOW}🚀 Starting AgentLink services...${NC}"
    docker-compose up -d --build
    
    echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
    sleep 10
    
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    docker-compose exec -T backend npx prisma migrate deploy || true
    
    echo -e "${GREEN}✅ AgentLink is running!${NC}"
    echo ""
    echo -e "${BLUE}📱 Access your application:${NC}"
    echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "   Backend:  ${GREEN}http://localhost:3001${NC}"
    echo -e "   API Docs: ${GREEN}http://localhost:3001/health${NC}"
    echo ""
}

stop_services() {
    echo -e "${YELLOW}🛑 Stopping AgentLink services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

restart_services() {
    stop_services
    start_services
}

show_logs() {
    echo -e "${YELLOW}📋 Showing logs (Ctrl+C to exit)...${NC}"
    docker-compose logs -f
}

run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    docker-compose exec backend npx prisma migrate dev
}

seed_database() {
    echo -e "${YELLOW}🌱 Seeding database...${NC}"
    docker-compose exec backend npm run db:seed
}

run_tests() {
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    docker-compose exec backend npm test
}

health_check() {
    echo -e "${YELLOW}🏥 Checking service health...${NC}"
    
    if curl -s http://localhost:3001/health | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        echo -e "${RED}❌ Backend is not responding${NC}"
    fi
}

# Main
print_banner
check_docker

case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_database
        ;;
    test)
        run_tests
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|migrate|seed|test|health}"
        exit 1
        ;;
esac
