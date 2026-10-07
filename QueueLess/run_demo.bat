@echo off
echo Starting QueueLess System...

echo ----------------------------------------
echo Starting FastAPI Backend (Port 8000)...
echo ----------------------------------------
start cmd /k "Title QueueLess Backend && cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo ----------------------------------------
echo Starting React Vite Frontend (Port 5173)...
echo ----------------------------------------
start cmd /k "Title QueueLess Frontend && cd frontend && npm run dev"

echo.
echo All services have been started in separate windows!
echo.
echo View Citizen/Employee UI: http://localhost:5173
echo View Backend API Docs: http://127.0.0.1:8000/docs
echo.
pause
