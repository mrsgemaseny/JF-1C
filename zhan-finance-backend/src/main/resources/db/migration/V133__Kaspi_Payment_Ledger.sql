-- Only confirmed provider payments belong here. The provider protocol is configured separately.
CREATE TABLE kaspi_payments (
    id BIGSERIAL PRIMARY KEY,
    provider_payment_id VARCHAR(128) NOT NULL UNIQUE,
    invoice_id BIGINT NOT NULL UNIQUE REFERENCES invoices(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL CHECK (currency = 'KZT'),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
