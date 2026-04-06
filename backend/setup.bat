@echo off
echo === Smart Wardrobe Backend Setup ===

:: Create virtual environment
python -m venv venv
call venv\Scripts\activate.bat

:: Install dependencies
pip install -r requirements.txt

:: Create .env if it doesn't exist
if not exist .env (
    copy .env.example .env
    echo.
    echo IMPORTANT: Open .env and add your ANTHROPIC_API_KEY
    echo Get your key at: https://console.anthropic.com/
)

echo.
echo Setup complete! To start the server:
echo   call venv\Scripts\activate.bat
echo   uvicorn main:app --reload
echo.
echo API docs will be at: http://localhost:8000/docs
pause
