-- Add 'awaiting_payment' to order_status enum (before 'pending')
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'pending';
