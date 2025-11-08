-- MySQL initialization script
-- This runs automatically when MySQL container starts for the first time

-- Create chat database (for Maxwell metadata)
CREATE DATABASE IF NOT EXISTS `chat`;

-- chat-service database is created automatically by MYSQL_DATABASE env var

-- Grant all privileges to postgres user on both databases
GRANT ALL PRIVILEGES ON `chat`.* TO 'postgres'@'%';
GRANT ALL PRIVILEGES ON `chat-service`.* TO 'postgres'@'%';

-- Grant replication privileges for Maxwell CDC
GRANT REPLICATION CLIENT ON *.* TO 'postgres'@'%';
GRANT REPLICATION SLAVE ON *.* TO 'postgres'@'%';

FLUSH PRIVILEGES;
