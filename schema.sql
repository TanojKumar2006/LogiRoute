create table zones (
  zone_id text not null primary key,
  center_lat numeric(9,6) not null check (center_lat between -90 and 90),
  center_lon numeric(9,6) not null check (center_lon between -180 and 180)
);
create table customer_sites (
  site_id text not null primary key,
  name text not null,
  address text not null,
  area text not null,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  zone_id text not null references zones(zone_id),
  service_base_min integer not null check (service_base_min between 1 and 120),
  max_vehicle_class text not null check (max_vehicle_class in ('SMALL','MEDIUM','LARGE')),
  access_difficulty integer not null check (access_difficulty between 0 and 3),
  signature_required boolean not null,
  contact_name text not null,
  phone text not null,
  email text,
  effective_from date not null
);
create index idx_customer_sites_zone_id on customer_sites (zone_id);
create table delivery_partners (
  partner_id text not null primary key,
  name text not null unique,
  contact_person text not null,
  phone text not null,
  email text,
  address text not null
);
create table vehicles (
  vehicle_id text not null primary key,
  vehicle_class text not null check (vehicle_class in ('SMALL','MEDIUM','LARGE')),
  registration_no text not null unique,
  cost_per_km_inr numeric(12,2) not null check (cost_per_km_inr between 0 and 1000),
  status text not null check (status in ('Available','Maintenance'))
);
create table vehicle_capacities (
  capacity_id text not null primary key,
  vehicle_id text not null references vehicles(vehicle_id),
  max_weight_kg numeric(12,2) not null check (max_weight_kg between 0 and 100000),
  max_volume_m3 numeric(12,2) not null check (max_volume_m3 between 0 and 1000),
  effective_from date not null,
  effective_to date
);
create index idx_vehicle_capacities_vehicle_id on vehicle_capacities (vehicle_id);
create table drivers (
  driver_id text not null primary key,
  full_name text not null,
  phone text not null,
  email text,
  address text not null,
  licence_no text not null unique,
  status text not null check (status in ('Active','Inactive'))
);
create table shifts (
  shift_id text not null primary key,
  driver_id text not null references drivers(driver_id),
  vehicle_id text not null references vehicles(vehicle_id),
  shift_date date not null,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  break_start_ts timestamptz not null,
  break_min integer not null check (break_min between 0 and 120)
);
create index idx_shifts_driver_id on shifts (driver_id);
create index idx_shifts_vehicle_id on shifts (vehicle_id);
create table traffic_scenarios (
  scenario_id text not null primary key,
  scenario_date date not null,
  period text not null check (period in ('AM','MID','PM')),
  multiplier numeric(12,2) not null check (multiplier between 0.5 and 3),
  label text not null
);
create table travel_time_matrix (
  matrix_id text not null primary key,
  scenario_id text not null references traffic_scenarios(scenario_id),
  origin_zone text not null references zones(zone_id),
  dest_zone text not null references zones(zone_id),
  distance_km numeric(12,2) not null check (distance_km between 0 and 500),
  duration_min numeric(12,2) not null check (duration_min between 0 and 1000)
);
create index idx_travel_time_matrix_scenario_id on travel_time_matrix (scenario_id);
create index idx_travel_time_matrix_origin_zone on travel_time_matrix (origin_zone);
create index idx_travel_time_matrix_dest_zone on travel_time_matrix (dest_zone);
create table orders (
  order_id text not null primary key,
  site_id text not null references customer_sites(site_id),
  order_date date not null,
  total_weight_kg numeric(12,2) not null check (total_weight_kg between 0 and 1000000),
  total_volume_m3 numeric(12,2) not null check (total_volume_m3 between 0 and 100000),
  status text not null check (status in ('IN_PROGRESS','COMPLETED','COMPLETED_WITH_ISSUES'))
);
create index idx_orders_site_id on orders (site_id);
create table deliveries (
  delivery_id text not null primary key,
  order_id text not null references orders(order_id),
  site_id text not null references customer_sites(site_id),
  partner_id text not null references delivery_partners(partner_id),
  category text not null,
  weight_kg numeric(12,2) not null check (weight_kg between 0 and 100000),
  volume_m3 numeric(12,2) not null check (volume_m3 between 0 and 1000),
  value_inr numeric(12,2) not null check (value_inr between 0 and 1000000000),
  priority integer not null check (priority between 1 and 3),
  service_min integer not null check (service_min between 1 and 240),
  required_min_class text not null check (required_min_class in ('SMALL','MEDIUM','LARGE')),
  planned_date date not null,
  status text not null check (status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED'))
);
create index idx_deliveries_order_id on deliveries (order_id);
create index idx_deliveries_site_id on deliveries (site_id);
create index idx_deliveries_partner_id on deliveries (partner_id);
create table time_windows (
  window_id text not null primary key,
  delivery_id text not null references deliveries(delivery_id),
  window_date date not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  window_type text not null check (window_type in ('ORIGINAL','RESCHEDULED'))
);
create index idx_time_windows_delivery_id on time_windows (delivery_id);
create table planning_runs (
  run_id text not null primary key,
  run_date date not null,
  algorithm_version text not null,
  seed integer not null,
  objective_weights text not null,
  input_delivery_count integer not null,
  routes_created integer not null,
  deliveries_assigned integer not null,
  deliveries_unserved integer not null,
  total_distance_km numeric(12,2) not null,
  solver_status text not null check (solver_status in ('HEURISTIC_FEASIBLE')),
  created_at timestamptz not null
);
create table routes (
  route_id text not null primary key,
  run_id text not null references planning_runs(run_id),
  route_date date not null,
  vehicle_id text not null references vehicles(vehicle_id),
  driver_id text not null references drivers(driver_id),
  shift_id text not null references shifts(shift_id),
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  stop_count integer not null,
  total_distance_km numeric(12,2) not null,
  return_distance_km numeric(12,2) not null,
  return_travel_min numeric(12,2) not null,
  total_service_min integer not null,
  total_wait_min integer not null,
  total_weight_kg numeric(12,2) not null,
  total_volume_m3 numeric(12,2) not null,
  status text not null check (status in ('PLANNED','COMPLETED'))
);
create index idx_routes_run_id on routes (run_id);
create index idx_routes_vehicle_id on routes (vehicle_id);
create index idx_routes_driver_id on routes (driver_id);
create index idx_routes_shift_id on routes (shift_id);
create table route_stops (
  stop_id text not null primary key,
  route_id text not null references routes(route_id),
  sequence integer not null check (sequence between 1 and 500),
  delivery_id text not null references deliveries(delivery_id),
  attempt_no integer not null check (attempt_no between 1 and 5),
  assignment_status text not null check (assignment_status in ('ACTIVE','COMPLETED','CANCELLED')),
  travel_min_from_prev integer not null,
  distance_km_from_prev numeric(12,2) not null,
  planned_arrival timestamptz not null,
  wait_min integer not null,
  service_min integer not null,
  planned_departure timestamptz not null
);
create index idx_route_stops_route_id on route_stops (route_id);
create index idx_route_stops_delivery_id on route_stops (delivery_id);
create table delivery_outcomes (
  outcome_id text not null primary key,
  delivery_id text not null references deliveries(delivery_id),
  attempt_no integer not null check (attempt_no between 1 and 5),
  stop_id text references route_stops(stop_id),
  outcome text not null check (outcome in ('DELIVERED','FAILED','UNSERVED')),
  reason_code text check (reason_code in ('LATE_WINDOW_CLOSED','CUSTOMER_UNAVAILABLE','ACCESS_BLOCKED','NO_ELIGIBLE_VEHICLE','CAPACITY_EXCEEDS_FLEET','WINDOW_INFEASIBLE','SHIFT_INFEASIBLE','INSUFFICIENT_FLEET_CAPACITY')),
  actual_arrival timestamptz,
  actual_departure timestamptz,
  recorded_at timestamptz not null
);
create index idx_delivery_outcomes_delivery_id on delivery_outcomes (delivery_id);
create index idx_delivery_outcomes_stop_id on delivery_outcomes (stop_id);
create table delivery_events (
  event_id text not null primary key,
  delivery_id text not null references deliveries(delivery_id),
  event_seq integer not null check (event_seq between 1 and 1000),
  event_type text not null check (event_type in ('CREATED','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED','RESCHEDULED')),
  from_status text check (from_status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED')),
  to_status text not null check (to_status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED')),
  event_ts timestamptz not null,
  route_id text references routes(route_id)
);
create index idx_delivery_events_delivery_id on delivery_events (delivery_id);
create index idx_delivery_events_route_id on delivery_events (route_id);
create table planning_exceptions (
  exception_id text not null primary key,
  run_id text not null references planning_runs(run_id),
  delivery_id text not null references deliveries(delivery_id),
  issue_type text not null check (issue_type in ('UNSERVED_DELIVERY','DELIVERY_FAILED')),
  severity text not null check (severity in ('High','Medium','Low')),
  detail text not null,
  recommended_action text not null,
  resolution_status text not null check (resolution_status in ('OPEN','RESCHEDULED','RESOLVED')),
  detected_at timestamptz not null
);
create index idx_planning_exceptions_run_id on planning_exceptions (run_id);
create index idx_planning_exceptions_delivery_id on planning_exceptions (delivery_id);
-- Business rule: a delivery may have many historical stops but no two ACTIVE stops on the same date (checked by checks.py).
