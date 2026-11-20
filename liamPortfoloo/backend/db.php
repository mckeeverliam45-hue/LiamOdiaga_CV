<?php

declare(strict_types=1);

function getDbConnection(): PDO
{
    $databaseUrl = getenv('DATABASE_URL');
    if (is_string($databaseUrl) && trim($databaseUrl) !== '') {
        $parts = parse_url(trim($databaseUrl));
        $query = [];
        if (is_array($parts)) {
            parse_str((string) ($parts['query'] ?? ''), $query);
        }

        $scheme = is_array($parts) ? strtolower((string) ($parts['scheme'] ?? '')) : '';
        $host = is_array($parts) ? (string) ($parts['host'] ?? '') : '';
        $database = is_array($parts)
            ? rawurldecode(ltrim((string) ($parts['path'] ?? ''), '/'))
            : '';
        $port = is_array($parts) ? ($parts['port'] ?? 5432) : 0;
        $sslMode = $query['sslmode'] ?? 'require';

        if (
            !in_array($scheme, ['postgres', 'postgresql'], true) ||
            $host === '' ||
            preg_match('/^[A-Za-z0-9.\[\]:-]+$/D', $host) !== 1 ||
            $database === '' ||
            preg_match('/^[A-Za-z0-9_.-]+$/D', $database) !== 1 ||
            !is_int($port) ||
            $port < 1 ||
            $port > 65535 ||
            !is_string($sslMode) ||
            !in_array($sslMode, ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'], true) ||
            !is_array($parts) ||
            !isset($parts['user'], $parts['pass'])
        ) {
            $exception = new PDOException('Invalid PostgreSQL DATABASE_URL configuration.');
            error_log('Database connection failed: ' . $exception->getMessage());
            throw $exception;
        }

        $dsn = "pgsql:host={$host};port={$port};dbname={$database};sslmode={$sslMode}";
        $username = rawurldecode((string) $parts['user']);
        $password = rawurldecode((string) $parts['pass']);
    } else {
        $host = getenv('DB_HOST') ?: $_ENV['DB_HOST'] ?? 'localhost';
        $dbname = getenv('DB_NAME') ?: $_ENV['DB_NAME'] ?? 'digital_cv';
        $username = getenv('DB_USER') ?: $_ENV['DB_USER'] ?? 'root';
        $password = getenv('DB_PASS') ?: $_ENV['DB_PASS'] ?? '';
        $port = getenv('DB_PORT') ?: $_ENV['DB_PORT'] ?? '3306';
        $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    }

    try {
        return new PDO(
            $dsn,
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } catch (PDOException $e) {
        error_log('Database connection failed: ' . $e->getMessage());
        throw $e;
    }
}

if (php_sapi_name() === 'cli' && basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    try {
        $pdo = getDbConnection();
        echo "Database connection successful.\n";
    } catch (PDOException $e) {
        http_response_code(500);
        echo "Database connection failed: " . $e->getMessage() . "\n";
        exit(1);
    }
}
