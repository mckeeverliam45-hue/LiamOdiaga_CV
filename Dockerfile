FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql

WORKDIR /var/www/html

COPY liamPortfoloo/index/index.html /var/www/html/index.html
COPY liamPortfoloo/index/robots.txt /var/www/html/robots.txt
COPY liamPortfoloo/index/sitemap.xml /var/www/html/sitemap.xml
COPY liamPortfoloo/index/styles.css /var/www/html/styles.css
COPY liamPortfoloo/assets/liam-mark.svg /var/www/html/assets/liam-mark.svg
COPY liamPortfoloo/images/ /var/www/html/images/
COPY liamPortfoloo/documents/ /var/www/html/documents/
COPY liamPortfoloo/js/contact.js liamPortfoloo/js/portfolio-content.js /var/www/html/js/
COPY liamPortfoloo/backend/admin-api.php liamPortfoloo/backend/contact.php liamPortfoloo/backend/db.php /var/www/html/backend/

RUN mkdir -p /opt/portfolio/backend /opt/portfolio/database
COPY liamPortfoloo/backend/create_admin.php liamPortfoloo/backend/db.php /opt/portfolio/backend/
COPY liamPortfoloo/database/digital_cv.sql /opt/portfolio/database/digital_cv.sql

COPY docker/render-entrypoint.sh /usr/local/bin/render-entrypoint
RUN chmod +x /usr/local/bin/render-entrypoint

EXPOSE 10000

ENTRYPOINT ["/usr/local/bin/render-entrypoint"]
