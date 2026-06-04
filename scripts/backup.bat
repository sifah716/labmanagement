@echo off
REM Database Backup Script for Windows
REM Creates a backup of the SQLite database with timestamp

set BACKUP_DIR=.\backups
set DB_FILE=.\data\lab.db
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\lab_backup_%TIMESTAMP%.db

REM Create backup directory if it doesn't exist
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

REM Check if database exists
if not exist %DB_FILE% (
    echo X Database file not found: %DB_FILE%
    pause
    exit /b 1
)

REM Create backup
echo Creating backup...
copy %DB_FILE% %BACKUP_FILE%

if %ERRORLEVEL% EQU 0 (
    echo + Backup created successfully!
    echo Location: %BACKUP_FILE%
    echo + Done!
) else (
    echo X Backup failed!
    pause
    exit /b 1
)

pause
