-- Ruimt het eerdere omzet-demo schema op (klanten, bestellingen, testdata).
-- Alleen draaien als je die demo-data niet meer nodig hebt: dit verwijdert de tabellen definitief.

drop function if exists public.dashboard_kpis(int);
drop function if exists public.dashboard_monthly(int);
drop function if exists public.dashboard_channel_revenue(int);
drop table if exists public.orders;
drop table if exists public.customers;
