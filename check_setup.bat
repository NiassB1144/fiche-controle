@echo off
REM Script to install reportlab and test exports
cd /d "C:\Users\DELL\Desktop\Inspection du travail\Projet\fiche-controle"

echo ====================================
echo Installing/Checking reportlab...
echo ====================================

python -m pip install reportlab -q

echo.
echo ====================================
echo Checking imports...
echo ====================================

python -c "from reportlab.lib.pagesizes import A4; from reportlab.platypus import SimpleDocTemplate; print('✓ ReportLab imports successful')" || (echo ✗ ReportLab import failed && exit /b 1)

echo.
echo ====================================
echo Syntax check on views.py...
echo ====================================

python -m py_compile inspection\views.py && echo ✓ views.py syntax OK || (echo ✗ views.py has syntax errors && exit /b 1)

echo.
echo ====================================
echo All checks passed!
echo ====================================
pause
