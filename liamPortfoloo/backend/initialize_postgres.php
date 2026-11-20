<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/db.php';

$pdo = null;

try {
    $pdo = getDbConnection();
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'pgsql') {
        throw new RuntimeException('DATABASE_URL must connect to PostgreSQL.');
    }

    $username = trim((string) (getenv('ADMIN_USERNAME') ?: 'Mckeever'));
    $password = getenv('ADMIN_PASSWORD');
    $password = is_string($password) ? $password : '';
    if ($username === '' || strlen($username) > 50 || strlen($password) < 12) {
        throw new RuntimeException('Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.');
    }

    $schemaPath = __DIR__ . '/../database/digital_cv_postgres.sql';
    $schema = file_get_contents($schemaPath);
    if (!is_string($schema)) {
        throw new RuntimeException('The PostgreSQL schema file could not be read.');
    }

    $pdo->beginTransaction();
    foreach (explode(';', $schema) as $statementSql) {
        $statementSql = trim($statementSql);
        if ($statementSql !== '') {
            $pdo->exec($statementSql);
        }
    }

    $statement = $pdo->prepare(
        'INSERT INTO admins (username, password_hash)
         VALUES (:username, :password_hash)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash'
    );
    $statement->execute([
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);

    $pdo->commit();
    fwrite(STDOUT, "PostgreSQL schema and admin account are ready.\n");
} catch (Throwable $exception) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('PostgreSQL setup failed: ' . $exception->getMessage());
    fwrite(STDERR, "PostgreSQL setup failed. Check DATABASE_URL, ADMIN_USERNAME, and ADMIN_PASSWORD.\n");
    exit(1);
}
