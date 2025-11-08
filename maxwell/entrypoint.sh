#!/bin/sh

# Replace environment variables in config template using sed
sed -e "s/\${MAIN_DB_USERNAME}/$MAIN_DB_USERNAME/g" \
    -e "s/\${MAIN_DB_PASSWORD}/$MAIN_DB_PASSWORD/g" \
    -e "s/\${MAIN_DB_DATABASE}/$MAIN_DB_DATABASE/g" \
    -e "s/\${RABBITMQ_USER}/$RABBITMQ_USER/g" \
    -e "s/\${RABBITMQ_PASS}/$RABBITMQ_PASS/g" \
    -e "s/\${NODE_ENV}/$NODE_ENV/g" \
    /config/config.template.properties > /tmp/config.properties

echo "Generated Maxwell config:"
cat /tmp/config.properties

# Start Maxwell
# Maxwell publishes all outbox events to "outbox.event" routing key
# OutboxTransformerProcessor extracts routing_key from outbox data and republishes
exec bin/maxwell --config /tmp/config.properties
