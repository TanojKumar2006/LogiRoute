# Data dictionary

Generated from `spec.py`. Timestamps are UTC (ISO-8601, `Z`); the operational timezone is Asia/Kolkata (IST, UTC+05:30).

## zones

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| zone_id | text | yes |  |  | PK |  | Grid-cell id, ZONE-NN (generated) |
| center_lat | numeric(9,6) | yes | -90 .. 90 | degrees |  |  | Cell centre latitude |
| center_lon | numeric(9,6) | yes | -180 .. 180 | degrees |  |  | Cell centre longitude |

## customer_sites

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| site_id | text | yes |  |  | PK |  | SITE-000001 style id (generated) |
| name | text | yes |  |  |  |  | Synthetic business name |
| address | text | yes |  |  |  |  | Synthetic street address |
| area | text | yes |  |  |  |  | Locality name |
| latitude | numeric(9,6) | yes | -90 .. 90 | degrees |  |  | Must lie inside the configured region |
| longitude | numeric(9,6) | yes | -180 .. 180 | degrees |  |  | Must lie inside the configured region |
| zone_id | text | yes |  |  |  | zones.zone_id | Zone used by the travel-time matrix |
| service_base_min | integer | yes | 1 .. 120 | minutes |  |  | Base on-site service time |
| max_vehicle_class | text | yes | SMALL, MEDIUM, LARGE |  |  |  | Largest vehicle class that can access the site |
| access_difficulty | integer | yes | 0 .. 3 |  |  |  | 0 easy .. 3 very hard (drives ACCESS_BLOCKED rule) |
| signature_required | boolean | yes |  |  |  |  | Customer must sign (drives CUSTOMER_UNAVAILABLE rule) |
| contact_name | text | yes |  |  |  |  | Synthetic contact |
| phone | text | yes |  |  |  |  | Synthetic phone (not a real number) |
| email | text | no |  |  |  |  | Synthetic email, optional |
| effective_from | date | yes |  |  |  |  | Date the site record became effective |

## delivery_partners

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| partner_id | text | yes |  |  | PK |  | PTR-001 style id |
| name | text | yes |  |  | yes |  | Synthetic carrier name |
| contact_person | text | yes |  |  |  |  | Synthetic contact |
| phone | text | yes |  |  |  |  | Synthetic phone |
| email | text | no |  |  |  |  | Synthetic email |
| address | text | yes |  |  |  |  | Synthetic hub address |

## vehicles

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| vehicle_id | text | yes |  |  | PK |  | VEH-000001 |
| vehicle_class | text | yes | SMALL, MEDIUM, LARGE |  |  |  | Size class |
| registration_no | text | yes |  |  | yes |  | Synthetic plate |
| cost_per_km_inr | numeric(12,2) | yes | 0 .. 1000 | INR/km |  |  | Operating cost |
| status | text | yes | Available, Maintenance |  |  |  | Maintenance vehicles are excluded from planning |

## vehicle_capacities

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| capacity_id | text | yes |  |  | PK |  | CAP-000001 |
| vehicle_id | text | yes |  |  |  | vehicles.vehicle_id |  |
| max_weight_kg | numeric(12,2) | yes | 0 .. 100000 | kg |  |  | Payload limit |
| max_volume_m3 | numeric(12,2) | yes | 0 .. 1000 | m3 |  |  | Cargo volume limit |
| effective_from | date | yes |  |  |  |  | First day valid |
| effective_to | date | no |  |  |  |  | Last day valid (blank = open ended) |

## drivers

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| driver_id | text | yes |  |  | PK |  | DRV-000001 |
| full_name | text | yes |  |  |  |  | Synthetic name |
| phone | text | yes |  |  |  |  | Synthetic phone |
| email | text | no |  |  |  |  | Optional |
| address | text | yes |  |  |  |  | Synthetic home address |
| licence_no | text | yes |  |  | yes |  | Synthetic licence number |
| status | text | yes | Active, Inactive |  |  |  |  |

## shifts

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| shift_id | text | yes |  |  | PK |  | SHF-000001 |
| driver_id | text | yes |  |  |  | drivers.driver_id |  |
| vehicle_id | text | yes |  |  |  | vehicles.vehicle_id |  |
| shift_date | date | yes |  |  |  |  | Local (IST) date |
| start_ts | timestamptz | yes |  |  |  |  | UTC |
| end_ts | timestamptz | yes |  |  |  |  | UTC, must be after start_ts |
| break_start_ts | timestamptz | yes |  |  |  |  | UTC |
| break_min | integer | yes | 0 .. 120 | minutes |  |  |  |

## traffic_scenarios

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| scenario_id | text | yes |  |  | PK |  | TS-YYYY-MM-DD-AM|MID|PM |
| scenario_date | date | yes |  |  |  |  |  |
| period | text | yes | AM, MID, PM |  |  |  | AM <11:00, MID <15:00, PM otherwise (IST) |
| multiplier | numeric(12,2) | yes | 0.5 .. 3 | x free-flow time |  |  | Applied to base travel time |
| label | text | yes |  |  |  |  | NORMAL, WEEKEND_LIGHT or RAIN_DELAY |

## travel_time_matrix

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| matrix_id | text | yes |  |  | PK |  | MTX-0000001 |
| scenario_id | text | yes |  |  |  | traffic_scenarios.scenario_id |  |
| origin_zone | text | yes |  |  |  | zones.zone_id |  |
| dest_zone | text | yes |  |  |  | zones.zone_id |  |
| distance_km | numeric(12,2) | yes | 0 .. 500 | km |  |  | Synthetic road distance (centre-to-centre x1.35) |
| duration_min | numeric(12,2) | yes | 0 .. 1000 | minutes |  |  | Base time at 30 km/h x scenario multiplier |

## orders

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| order_id | text | yes |  |  | PK |  | ORD-2026-000001 |
| site_id | text | yes |  |  |  | customer_sites.site_id |  |
| order_date | date | yes |  |  |  |  |  |
| total_weight_kg | numeric(12,2) | yes | 0 .. 1000000 | kg |  |  | DERIVED: sum of its deliveries |
| total_volume_m3 | numeric(12,2) | yes | 0 .. 100000 | m3 |  |  | DERIVED: sum of its deliveries |
| status | text | yes | IN_PROGRESS, COMPLETED, COMPLETED_WITH_ISSUES |  |  |  | DERIVED from final delivery statuses |

## deliveries

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| delivery_id | text | yes |  |  | PK |  | DEL-2026-000001 |
| order_id | text | yes |  |  |  | orders.order_id | One order has 1..2 deliveries |
| site_id | text | yes |  |  |  | customer_sites.site_id |  |
| partner_id | text | yes |  |  |  | delivery_partners.partner_id |  |
| category | text | yes |  |  |  |  | Goods category |
| weight_kg | numeric(12,2) | yes | 0 .. 100000 | kg |  |  |  |
| volume_m3 | numeric(12,2) | yes | 0 .. 1000 | m3 |  |  |  |
| value_inr | numeric(12,2) | yes | 0 .. 1000000000 | INR |  |  | Declared value |
| priority | integer | yes | 1 .. 3 |  |  |  | 1 = highest |
| service_min | integer | yes | 1 .. 240 | minutes |  |  | DERIVED: site base + weight/80 |
| required_min_class | text | yes | SMALL, MEDIUM, LARGE |  |  |  | Smallest acceptable vehicle class |
| planned_date | date | yes |  |  |  |  | First planned delivery date |
| status | text | yes | PENDING, PLANNED, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED, UNSERVED |  |  |  | DERIVED: last delivery_events.to_status |

## time_windows

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| window_id | text | yes |  |  | PK |  | TW-000001 |
| delivery_id | text | yes |  |  |  | deliveries.delivery_id |  |
| window_date | date | yes |  |  |  |  | Local date |
| window_start | timestamptz | yes |  |  |  |  | UTC |
| window_end | timestamptz | yes |  |  |  |  | UTC, must be after window_start |
| window_type | text | yes | ORIGINAL, RESCHEDULED |  |  |  |  |

## planning_runs

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| run_id | text | yes |  |  | PK |  | RUN-2026-000001 |
| run_date | date | yes |  |  |  |  | Service day planned |
| algorithm_version | text | yes |  |  |  |  |  |
| seed | integer | yes |  |  |  |  | Generator seed |
| objective_weights | text | yes |  |  |  |  | JSON text of objective/hard-constraint config |
| input_delivery_count | integer | yes |  |  |  |  |  |
| routes_created | integer | yes |  |  |  |  |  |
| deliveries_assigned | integer | yes |  |  |  |  |  |
| deliveries_unserved | integer | yes |  |  |  |  |  |
| total_distance_km | numeric(12,2) | yes |  | km |  |  |  |
| solver_status | text | yes | HEURISTIC_FEASIBLE |  |  |  | Never claims optimality |
| created_at | timestamptz | yes |  |  |  |  | UTC |

## routes

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| route_id | text | yes |  |  | PK |  | RTE-2026-000001 |
| run_id | text | yes |  |  |  | planning_runs.run_id |  |
| route_date | date | yes |  |  |  |  |  |
| vehicle_id | text | yes |  |  |  | vehicles.vehicle_id |  |
| driver_id | text | yes |  |  |  | drivers.driver_id |  |
| shift_id | text | yes |  |  |  | shifts.shift_id |  |
| planned_start | timestamptz | yes |  |  |  |  | UTC depot departure |
| planned_end | timestamptz | yes |  |  |  |  | UTC depot return (DERIVED) |
| stop_count | integer | yes |  |  |  |  | DERIVED |
| total_distance_km | numeric(12,2) | yes |  | km |  |  | DERIVED: stop legs + return leg |
| return_distance_km | numeric(12,2) | yes |  | km |  |  |  |
| return_travel_min | numeric(12,2) | yes |  | minutes |  |  |  |
| total_service_min | integer | yes |  | minutes |  |  | DERIVED |
| total_wait_min | integer | yes |  | minutes |  |  | DERIVED |
| total_weight_kg | numeric(12,2) | yes |  | kg |  |  | DERIVED |
| total_volume_m3 | numeric(12,2) | yes |  | m3 |  |  | DERIVED |
| status | text | yes | PLANNED, COMPLETED |  |  |  |  |

## route_stops

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| stop_id | text | yes |  |  | PK |  | STOP-<route_id>-001 |
| route_id | text | yes |  |  |  | routes.route_id |  |
| sequence | integer | yes | 1 .. 500 |  |  |  | 1-based, contiguous |
| delivery_id | text | yes |  |  |  | deliveries.delivery_id |  |
| attempt_no | integer | yes | 1 .. 5 |  |  |  | 1 = first attempt |
| assignment_status | text | yes | ACTIVE, COMPLETED, CANCELLED |  |  |  |  |
| travel_min_from_prev | integer | yes |  | minutes |  |  | From depot for sequence 1 |
| distance_km_from_prev | numeric(12,2) | yes |  | km |  |  |  |
| planned_arrival | timestamptz | yes |  |  |  |  | UTC |
| wait_min | integer | yes |  | minutes |  |  | max(0, window_start - arrival) |
| service_min | integer | yes |  | minutes |  |  |  |
| planned_departure | timestamptz | yes |  |  |  |  | UTC = arrival + wait + service |

## delivery_outcomes

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| outcome_id | text | yes |  |  | PK |  | OUT-000001 |
| delivery_id | text | yes |  |  |  | deliveries.delivery_id |  |
| attempt_no | integer | yes | 1 .. 5 |  |  |  |  |
| stop_id | text | no |  |  |  | route_stops.stop_id | Blank for UNSERVED |
| outcome | text | yes | DELIVERED, FAILED, UNSERVED |  |  |  |  |
| reason_code | text | no | LATE_WINDOW_CLOSED, CUSTOMER_UNAVAILABLE, ACCESS_BLOCKED, NO_ELIGIBLE_VEHICLE, CAPACITY_EXCEEDS_FLEET, WINDOW_INFEASIBLE, SHIFT_INFEASIBLE, INSUFFICIENT_FLEET_CAPACITY |  |  |  | Required for FAILED and UNSERVED |
| actual_arrival | timestamptz | no |  |  |  |  | Simulated, UTC |
| actual_departure | timestamptz | no |  |  |  |  | Simulated, UTC |
| recorded_at | timestamptz | yes |  |  |  |  | UTC |

## delivery_events

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| event_id | text | yes |  |  | PK |  | EVT-0000001 |
| delivery_id | text | yes |  |  |  | deliveries.delivery_id |  |
| event_seq | integer | yes | 1 .. 1000 |  |  |  | Per delivery, contiguous |
| event_type | text | yes | CREATED, PLANNED, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED, UNSERVED, RESCHEDULED |  |  |  |  |
| from_status | text | no | PENDING, PLANNED, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED, UNSERVED |  |  |  | Blank for the first event |
| to_status | text | yes | PENDING, PLANNED, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED, UNSERVED |  |  |  |  |
| event_ts | timestamptz | yes |  |  |  |  | UTC, non-decreasing per delivery |
| route_id | text | no |  |  |  | routes.route_id |  |

## planning_exceptions

| Field | Type | Required | Allowed values / range | Units | Unique | FK | Meaning / source |
|---|---|---|---|---|---|---|---|
| exception_id | text | yes |  |  | PK |  | EXC-000001 |
| run_id | text | yes |  |  |  | planning_runs.run_id |  |
| delivery_id | text | yes |  |  |  | deliveries.delivery_id |  |
| issue_type | text | yes | UNSERVED_DELIVERY, DELIVERY_FAILED |  |  |  | Operational exception, not a data defect |
| severity | text | yes | High, Medium, Low |  |  |  | From delivery priority |
| detail | text | yes |  |  |  |  | Human-readable reason |
| recommended_action | text | yes |  |  |  |  |  |
| resolution_status | text | yes | OPEN, RESCHEDULED, RESOLVED |  |  |  |  |
| detected_at | timestamptz | yes |  |  |  |  | UTC |
