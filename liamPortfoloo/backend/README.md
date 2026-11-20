# Admin setup

The local admin dashboard uses PHP with PDO MySQL and the `digital_cv` database.
Serve the repository root through Apache/PHP (for example, with Laragon) and open
`/index/admin.html`; opening the HTML files with a `file://` URL will not connect to PHP.

1. Import `database/digital_cv.sql` into MySQL. The script creates the required
   tables, including the editable skills catalog, and adds starter portfolio
   content only when the corresponding tables are empty. To add the skills
   feature to an existing installation, import the updated SQL file again; it
   creates and seeds the skills table without replacing existing records.
2. Configure `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASS` for PHP. The defaults in
   `db.php` are `localhost`, `digital_cv`, `root`, and an empty password.
3. Create the `Mckeever` admin account from PowerShell in the project directory.
   The command securely prompts for a password of at least 12 characters:

   ```powershell
   $securePassword = Read-Host "Choose an admin password (12+ characters)" -AsSecureString
   $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
   try {
     $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
     php backend/create_admin.php
   } finally {
     Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
   }
   ```

   Running the script again resets the `Mckeever` account's password. To use a
   different username, set `ADMIN_USERNAME` before running the script.
4. Visit `/index/admin.html` and sign in. The dashboard can review/delete contact
   messages and create, edit, or delete projects, education records, and skills.
   Portfolio content changes appear on the public site.

## Online admin on Render

The footer lock icon opens the admin sign-in page. After the Render database
and environment are configured, you can also open the live site URL followed
by `/admin.html` and sign in with username `Mckeever` and the password stored
in Render's `ADMIN_PASSWORD` environment variable.

1. Create a PostgreSQL database in the same Render region as the web service.
   Review its plan, price, and retention before creating it.
2. Set `DATABASE_URL` in the web service to the database's Internal Database URL.
3. Set `ADMIN_PASSWORD` to a strong password of at least 12 characters. Keep it
   in Render's environment settings; do not send it in chat or commit it.
4. Deploy or restart the web service. Startup creates the schema, starter
   portfolio records, and the `Mckeever` admin account. If the password is
   changed in Render, the next restart updates the admin password.

The `DATABASE_URL` connection path enables PostgreSQL on Render; local MySQL
continues to use `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASS`. Use HTTPS for
online sign-in so the admin session cookie is secure.
