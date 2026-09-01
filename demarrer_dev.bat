

echo ============================================
echo   Plan de Formation - Mode DEV local
echo   Backend  : http://localhost:3004
echo   Frontend : http://localhost:5173
echo ============================================
echo.



echo.
echo [OK] Démarrage du backend (port 3004)...
echo.
start "PlanForma Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo [OK] Démarrage du frontend (port 5173)...
echo.
start "PlanForma Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Les deux serveurs sont lancés dans des fenêtres séparées.
echo Ouvrez ensuite : http://localhost:5173
echo Fermez la fenêtre concernée pour arrêter chaque serveur.
echo.
pause