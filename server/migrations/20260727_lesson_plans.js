import {
  DEFAULT_REASONS,
  DEFAULT_TEMPLATES,
} from "../services/lessonPlans.js";

export async function migrateLessonPlans(sql) {
  await sql`create table if not exists lesson_plan_templates(
    id uuid primary key default gen_random_uuid(),
    name text not null,
    schedule_type text not null check(schedule_type in ('MON_WED_FRI','TUE_THU_SAT','CUSTOM')),
    is_active boolean not null default true,
    is_default boolean not null default false,
    created_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create unique index if not exists lesson_plan_default_schedule_unique
    on lesson_plan_templates(schedule_type) where is_default=true`;
  await sql`create table if not exists lesson_plan_template_days(
    id uuid primary key default gen_random_uuid(),
    template_id uuid not null references lesson_plan_templates(id) on delete cascade,
    weekday smallint not null check(weekday between 1 and 7),
    order_index integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(template_id,weekday)
  )`;
  await sql`create table if not exists lesson_plan_template_items(
    id uuid primary key default gen_random_uuid(),
    template_day_id uuid not null references lesson_plan_template_days(id) on delete cascade,
    title text not null,
    skill_type text not null default 'OTHER',
    description text not null default '',
    order_index integer not null default 0,
    is_required boolean not null default true,
    carry_over_enabled boolean not null default true,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create index if not exists lesson_plan_items_day_order_idx
    on lesson_plan_template_items(template_day_id,order_index)`;
  await sql`create unique index if not exists lesson_plan_items_seed_unique
    on lesson_plan_template_items(template_day_id,title)`;
  await sql`create table if not exists group_lesson_plan_settings(
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    template_id uuid not null references lesson_plan_templates(id),
    effective_from date not null,
    effective_to date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check(effective_to is null or effective_to>=effective_from)
  )`;
  await sql`create index if not exists group_lesson_plan_effective_idx
    on group_lesson_plan_settings(group_id,effective_from desc)`;
  await sql`create table if not exists lesson_incomplete_reasons(
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    label text not null,
    is_active boolean not null default true,
    order_index integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists lesson_sessions(
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references groups(id) on delete cascade,
    attendance_session_id uuid not null unique references attendance_sessions(id) on delete cascade,
    template_id uuid references lesson_plan_templates(id),
    lesson_date date not null,
    teacher_snapshot text not null default '',
    schedule_type_snapshot text not null default 'CUSTOM',
    attendance_completed_at timestamptz,
    plan_completed_at timestamptz,
    status text not null default 'OPEN' check(status in ('OPEN','COMPLETED','REOPENED')),
    teacher_note text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(group_id,lesson_date)
  )`;
  await sql`create table if not exists lesson_session_items(
    id uuid primary key default gen_random_uuid(),
    lesson_session_id uuid not null references lesson_sessions(id) on delete cascade,
    template_item_id uuid references lesson_plan_template_items(id) on delete set null,
    title_snapshot text not null,
    description_snapshot text not null default '',
    skill_type_snapshot text not null default 'OTHER',
    is_required_snapshot boolean not null default true,
    carry_over_enabled_snapshot boolean not null default true,
    status text check(status in ('COMPLETED','PARTIAL','NOT_COMPLETED','NOT_APPLICABLE')),
    incomplete_reason_id uuid references lesson_incomplete_reasons(id) on delete set null,
    incomplete_reason_snapshot text,
    custom_reason text,
    teacher_note text not null default '',
    carry_over_to_next boolean not null default false,
    source_session_item_id uuid references lesson_session_items(id) on delete set null,
    carry_over_count integer not null default 0,
    completed_at timestamptz,
    order_index integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await sql`create unique index if not exists lesson_session_carry_source_unique
    on lesson_session_items(source_session_item_id) where source_session_item_id is not null`;
  await sql`create unique index if not exists lesson_session_template_item_unique
    on lesson_session_items(lesson_session_id,template_item_id)
    where template_item_id is not null`;
  await sql`create index if not exists lesson_session_items_session_order_idx
    on lesson_session_items(lesson_session_id,order_index)`;
  await sql`create table if not exists lesson_plan_audit_logs(
    id uuid primary key default gen_random_uuid(),
    lesson_session_id uuid references lesson_sessions(id) on delete cascade,
    session_item_id uuid references lesson_session_items(id) on delete set null,
    action text not null,
    changed_by_id text not null,
    old_value jsonb,
    new_value jsonb,
    reason text,
    created_at timestamptz not null default now()
  )`;

  for (const [index, [code, label]] of DEFAULT_REASONS.entries())
    await sql`insert into lesson_incomplete_reasons(code,label,order_index)
      values(${code},${label},${index})
      on conflict(code) do nothing`;

  for (const template of DEFAULT_TEMPLATES) {
    await sql`insert into lesson_plan_templates(id,name,schedule_type,is_active,is_default,created_by)
      values(${template.id},${template.name},${template.scheduleType},true,true,'system')
      on conflict(id) do nothing`;
    for (const [weekdayValue, items] of Object.entries(template.days)) {
      const weekday = Number(weekdayValue);
      await sql`insert into lesson_plan_template_days(template_id,weekday,order_index)
        values(${template.id},${weekday},${weekday})
        on conflict(template_id,weekday) do nothing`;
      const [day] = await sql`select id from lesson_plan_template_days
        where template_id=${template.id} and weekday=${weekday}`;
      for (const [index, [title, skillType]] of items.entries()) {
        await sql`insert into lesson_plan_template_items(
          template_day_id,title,skill_type,description,order_index,is_required,carry_over_enabled,is_active
        ) values(${day.id},${title},${skillType},'',${index},true,true,true)
        on conflict(template_day_id,title) do nothing`;
      }
    }
  }
}
