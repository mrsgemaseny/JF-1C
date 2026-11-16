-- Provider-agnostic online payment ledger. kaspi_payments (V133) becomes online_payments;
-- every existing row is a Kaspi payment.
ALTER TABLE kaspi_payments RENAME TO online_payments;
ALTER TABLE online_payments RENAME CONSTRAINT kaspi_payments_pkey TO online_payments_pkey;
ALTER TABLE online_payments DROP CONSTRAINT IF EXISTS kaspi_payments_provider_payment_id_key;
ALTER TABLE online_payments ADD COLUMN provider VARCHAR(16) NOT NULL DEFAULT 'KASPI';
ALTER TABLE online_payments ALTER COLUMN provider DROP DEFAULT;
ALTER TABLE online_payments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE online_payments ADD CONSTRAINT online_payments_provider_check CHECK (provider IN ('KASPI', 'FREEDOM'));
ALTER TABLE online_payments ADD CONSTRAINT online_payments_provider_payment_uq UNIQUE (provider, provider_payment_id);
ALTER SEQUENCE IF EXISTS kaspi_payments_id_seq RENAME TO online_payments_id_seq;

-- Every request Kaspi sends to the provider interface, keyed by Kaspi's txn_id. The stored
-- response is replayed verbatim on a repeated txn_id (protocol requirement).
CREATE TABLE kaspi_callbacks (
    id BIGSERIAL PRIMARY KEY,
    txn_id VARCHAR(32) NOT NULL,
    command VARCHAR(8) NOT NULL CHECK (command IN ('check', 'pay')),
    account VARCHAR(200) NOT NULL,
    amount NUMERIC(12, 2),
    txn_date VARCHAR(14),
    invoice_id BIGINT REFERENCES invoices(id),
    result_code INTEGER NOT NULL,
    prv_txn_id VARCHAR(40),
    response_body TEXT NOT NULL,
    client_ip VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT kaspi_callbacks_txn_command_uq UNIQUE (txn_id, command)
);
CREATE INDEX idx_kaspi_callbacks_invoice ON kaspi_callbacks(invoice_id);

-- A client-initiated attempt to pay an invoice through a redirect provider (Freedom Pay).
CREATE TABLE payment_intents (
    id BIGSERIAL PRIMARY KEY,
    provider VARCHAR(16) NOT NULL CHECK (provider IN ('FREEDOM')),
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    client_id BIGINT NOT NULL REFERENCES app_users(id),
    merchant_order_id VARCHAR(64) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency = 'KZT'),
    status VARCHAR(16) NOT NULL CHECK (status IN ('CREATED', 'REDIRECTED', 'PAID', 'FAILED', 'EXPIRED')),
    provider_payment_id VARCHAR(64),
    redirect_url TEXT,
    failure_reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payment_intents_invoice ON payment_intents(invoice_id);
CREATE INDEX idx_payment_intents_provider_payment ON payment_intents(provider, provider_payment_id);
