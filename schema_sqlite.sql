create table zones (
  zone_id TEXT not null primary key,
  center_lat REAL not null check (center_lat between -90 and 90),
  center_lon REAL not null check (center_lon between -180 and 180)
);
create table customer_sites (
  site_id TEXT not null primary key,
  name TEXT not null,
  address TEXT not null,
  area TEXT not null,
  latitude REAL not null check (latitude between -90 and 90),
  longitude REAL not null check (longitude between -180 and 180),
  zone_id TEXT not null references zones(zone_id),
  service_base_min INTEGER not null check (service_base_min between 1 and 120),
  max_vehicle_class TEXT not null check (max_vehicle_class in ('SMALL','MEDIUM','LARGE')),
  access_difficulty INTEGER not null check (access_difficulty between 0 and 3),
  signature_required INTEGER not null,
  contact_name TEXT not null,
  phone TEXT not null,
  email TEXT,
  effective_from TEXT not null
);
create index idx_customer_sites_zone_id on customer_sites (zone_id);
create table delivery_partners (
  partner_id TEXT not null primary key,
  name TEXT not null unique,
  contact_person TEXT not null,
  phone TEXT not null,
  email TEXT,
  address TEXT not null
);
create table vehicles (
  vehicle_id TEXT not null primary key,
  vehicle_class TEXT not null check (vehicle_class in ('SMALL','MEDIUM','LARGE')),
  registration_no TEXT not null unique,
  cost_per_km_inr REAL not null check (cost_per_km_inr between 0 and 1000),
  status TEXT not null check (status in ('Available','Maintenance'))
);
create table vehicle_capacities (
  capacity_id TEXT not null primary key,
  vehicle_id TEXT not null references vehicles(vehicle_id),
  max_weight_kg REAL not null check (max_weight_kg between 0 and 100000),
  max_volume_m3 REAL not null check (max_volume_m3 between 0 and 1000),
  effective_from TEXT not null,
  effective_to TEXT
);
create index idx_vehicle_capacities_vehicle_id on vehicle_capacities (vehicle_id);
create table drivers (
  driver_id TEXT not null primary key,
  full_name TEXT not null,
  phone TEXT not null,
  email TEXT,
  address TEXT not null,
  licence_no TEXT not null unique,
  status TEXT not null check (status in ('Active','Inactive'))
);
create table shifts (
  shift_id TEXT not null primary key,
  driver_id TEXT not null references drivers(driver_id),
  vehicle_id TEXT not null references vehicles(vehicle_id),
  shift_date TEXT not null,
  start_ts TEXT not null,
  end_ts TEXT not null,
  break_start_ts TEXT not null,
  break_min INTEGER not null check (break_min between 0 and 120)
);
create index idx_shifts_driver_id on shifts (driver_id);
create index idx_shifts_vehicle_id on shifts (vehicle_id);
create table traffic_scenarios (
  scenario_id TEXT not null primary key,
  scenario_date TEXT not null,
  period TEXT not null check (period in ('AM','MID','PM')),
  multiplier REAL not null check (multiplier between 0.5 and 3),
  label TEXT not null
);
create table travel_time_matrix (
  matrix_id TEXT not null primary key,
  scenario_id TEXT not null references traffic_scenarios(scenario_id),
  origin_zone TEXT not null references zones(zone_id),
  dest_zone TEXT not null references zones(zone_id),
  distance_km REAL not null check (distance_km between 0 and 500),
  duration_min REAL not null check (duration_min between 0 and 1000)
);
create index idx_travel_time_matrix_scenario_id on travel_time_matrix (scenario_id);
create index idx_travel_time_matrix_origin_zone on travel_time_matrix (origin_zone);
create index idx_travel_time_matrix_dest_zone on travel_time_matrix (dest_zone);
create table orders (
  order_id TEXT not null primary key,
  site_id TEXT not null references customer_sites(site_id),
  order_date TEXT not null,
  total_weight_kg REAL not null check (total_weight_kg between 0 and 1000000),
  total_volume_m3 REAL not null check (total_volume_m3 between 0 and 100000),
  status TEXT not null check (status in ('IN_PROGRESS','COMPLETED','COMPLETED_WITH_ISSUES'))
);
create index idx_orders_site_id on orders (site_id);
create table deliveries (
  delivery_id TEXT not null primary key,
  order_id TEXT not null references orders(order_id),
  site_id TEXT not null references customer_sites(site_id),
  partner_id TEXT not null references delivery_partners(partner_id),
  category TEXT not null,
  weight_kg REAL not null check (weight_kg between 0 and 100000),
  volume_m3 REAL not null check (volume_m3 between 0 and 1000),
  value_inr REAL not null check (value_inr between 0 and 1000000000),
  priority INTEGER not null check (priority between 1 and 3),
  service_min INTEGER not null check (service_min between 1 and 240),
  required_min_class TEXT not null check (required_min_class in ('SMALL','MEDIUM','LARGE')),
  planned_date TEXT not null,
  status TEXT not null check (status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED'))
);
create index idx_deliveries_order_id on deliveries (order_id);
create index idx_deliveries_site_id on deliveries (site_id);
create index idx_deliveries_partner_id on deliveries (partner_id);
create table time_windows (
  window_id TEXT not null primary key,
  delivery_id TEXT not null references deliveries(delivery_id),
  window_date TEXT not null,
  window_start TEXT not null,
  window_end TEXT not null,
  window_type TEXT not null check (window_type in ('ORIGINAL','RESCHEDULED'))
);
create index idx_time_windows_delivery_id on time_windows (delivery_id);
create table planning_runs (
  run_id TEXT not null primary key,
  run_date TEXT not null,
  algorithm_version TEXT not null,
  seed INTEGER not null,
  objective_weights TEXT not null,
  input_delivery_count INTEGER not null,
  routes_created INTEGER not null,
  deliveries_assigned INTEGER not null,
  deliveries_unserved INTEGER not null,
  total_distance_km REAL not null,
  solver_status TEXT not null check (solver_status in ('HEURISTIC_FEASIBLE')),
  created_at TEXT not null
);
create table routes (
  route_id TEXT not null primary key,
  run_id TEXT not null references planning_runs(run_id),
  route_date TEXT not null,
  vehicle_id TEXT not null references vehicles(vehicle_id),
  driver_id TEXT not null references drivers(driver_id),
  shift_id TEXT not null references shifts(shift_id),
  planned_start TEXT not null,
  planned_end TEXT not null,
  stop_count INTEGER not null,
  total_distance_km REAL not null,
  return_distance_km REAL not null,
  return_travel_min REAL not null,
  total_service_min INTEGER not null,
  total_wait_min INTEGER not null,
  total_weight_kg REAL not null,
  total_volume_m3 REAL not null,
  status TEXT not null check (status in ('PLANNED','COMPLETED'))
);
create index idx_routes_run_id on routes (run_id);
create index idx_routes_vehicle_id on routes (vehicle_id);
create index idx_routes_driver_id on routes (driver_id);
create index idx_routes_shift_id on routes (shift_id);
create table route_stops (
  stop_id TEXT not null primary key,
  route_id TEXT not null references routes(route_id),
  sequence INTEGER not null check (sequence between 1 and 500),
  delivery_id TEXT not null references deliveries(delivery_id),
  attempt_no INTEGER not null check (attempt_no between 1 and 5),
  assignment_status TEXT not null check (assignment_status in ('ACTIVE','COMPLETED','CANCELLED')),
  travel_min_from_prev INTEGER not null,
  distance_km_from_prev REAL not null,
  planned_arrival TEXT not null,
  wait_min INTEGER not null,
  service_min INTEGER not null,
  planned_departure TEXT not null
);
create index idx_route_stops_route_id on route_stops (route_id);
create index idx_route_stops_delivery_id on route_stops (delivery_id);
create table delivery_outcomes (
  outcome_id TEXT not null primary key,
  delivery_id TEXT not null references deliveries(delivery_id),
  attempt_no INTEGER not null check (attempt_no between 1 and 5),
  stop_id TEXT references route_stops(stop_id),
  outcome TEXT not null check (outcome in ('DELIVERED','FAILED','UNSERVED')),
  reason_code TEXT check (reason_code in ('LATE_WINDOW_CLOSED','CUSTOMER_UNAVAILABLE','ACCESS_BLOCKED','NO_ELIGIBLE_VEHICLE','CAPACITY_EXCEEDS_FLEET','WINDOW_INFEASIBLE','SHIFT_INFEASIBLE','INSUFFICIENT_FLEET_CAPACITY')),
  actual_arrival TEXT,
  actual_departure TEXT,
  recorded_at TEXT not null
);
create index idx_delivery_outcomes_delivery_id on delivery_outcomes (delivery_id);
create index idx_delivery_outcomes_stop_id on delivery_outcomes (stop_id);
create table delivery_events (
  event_id TEXT not null primary key,
  delivery_id TEXT not null references deliveries(delivery_id),
  event_seq INTEGER not null check (event_seq between 1 and 1000),
  event_type TEXT not null check (event_type in ('CREATED','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED','RESCHEDULED')),
  from_status TEXT check (from_status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED')),
  to_status TEXT not null check (to_status in ('PENDING','PLANNED','ASSIGNED','IN_TRANSIT','DELIVERED','FAILED','UNSERVED')),
  event_ts TEXT not null,
  route_id TEXT references routes(route_id)
);
create index idx_delivery_events_delivery_id on delivery_events (delivery_id);
create index idx_delivery_events_route_id on delivery_events (route_id);
create table planning_exceptions (
  exception_id TEXT not null primary key,
  run_id TEXT not null references planning_runs(run_id),
  delivery_id TEXT not null references deliveries(delivery_id),
  issue_type TEXT not null check (issue_type in ('UNSERVED_DELIVERY','DELIVERY_FAILED')),
  severity TEXT not null check (severity in ('High','Medium','Low')),
  detail TEXT not null,
  recommended_action TEXT not null,
  resolution_status TEXT not null check (resolution_status in ('OPEN','RESCHEDULED','RESOLVED')),
  detected_at TEXT not null
);
create index idx_planning_exceptions_run_id on planning_exceptions (run_id);
create index idx_planning_exceptions_delivery_id on planning_exceptions (delivery_id);
