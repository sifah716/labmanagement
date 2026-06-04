#!/bin/bash

# Database Backup Script
# Creates a backup of the SQLite database with timestamp

BACKUP_DIR="./backups"
DB_FILE="./data/lab.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/lab_backup_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
    echo "📁 Location: $BACKUP_FILE"
    
    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Size: $SIZE"
    
    # Keep only last 10 backups
    echo "🧹 Cleaning old backups..."
    ls -t "$BACKUP_DIR"/lab_backup_*.db | tail -n +11 | xargs -r rm
    
    echo "✅ Done!"
else
    echo "❌ Backup failed!"
    exit 1
fi
