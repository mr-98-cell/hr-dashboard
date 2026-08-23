-- ===========================================================
-- داشبورد إدارة استقطاب المواهب — مركز أداء
-- مخطّط قاعدة البيانات (Supabase / PostgreSQL)
-- شغّل هذا الملف مرة واحدة من: Supabase → SQL Editor → New query
-- ===========================================================

-- ------------------------- المستخدمون والصلاحيات -------------------------
-- role: 'owner'  = مالك الداشبورد — كل الصلاحيات + تعديل العناوين
--       'editor' = مُدخِل بيانات — إضافة/تعديل/حذف البيانات
--       'viewer' = عرض فقط (الإدارة)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  role       text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

-- إنشاء ملف تعريف تلقائيًا لكل مستخدم جديد
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'viewer')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- دالة مساعدة: هل المستخدم الحالي مُدخِل بيانات؟
create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner', 'editor'));
$$;

-- ------------------------- الهيكل التنظيمي -------------------------
create table if not exists public.org_units (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  name_en    text,
  parent_id  text references public.org_units (id) on delete cascade,
  approved   integer not null default 0,   -- الوظائف المعتمدة
  filled     integer not null default 0,   -- الوظائف المشغولة
  junior     integer not null default 0,   -- مبتدئ
  senior     integer not null default 0,   -- متقدم
  male       integer not null default 0,   -- ذكور
  female     integer not null default 0,   -- إناث
  created_at timestamptz not null default now()
);
create index if not exists org_units_parent_idx on public.org_units (parent_id);

-- ------------------------- الوظائف الشاغرة -------------------------
create table if not exists public.vacancies (
  id         text primary key default gen_random_uuid()::text,
  unit_id    text references public.org_units (id) on delete set null,
  title      text,
  count      integer not null default 0,   -- عدد الشواغر
  received   integer not null default 0,   -- الطلبات المستلمة
  status     text default 'مفتوحة',
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- المرشحون ومراحلهم -------------------------
-- stage: 0=المقابلة 1=العرض الأولي 2=المسح الأمني 3=الفحص الطبي 4=العرض النهائي 5=الانضمام
create table if not exists public.candidates (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  position   text,
  unit_id    text references public.org_units (id) on delete set null,
  stage      integer not null default 0 check (stage between 0 and 5),
  note       text,
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- المقابلات -------------------------
create table if not exists public.interviews (
  id               text primary key default gen_random_uuid()::text,
  candidate        text not null,
  position         text,
  unit_id          text references public.org_units (id) on delete set null,
  owner            text,               -- مالك الوظيفة
  status           text default 'مجدولة' check (status in ('مجدولة', 'تمت', 'مرفوضة')),
  date             text,
  day              text,
  time             text,
  job_source       text,
  cand_source      text,
  cand_source_name text,
  hr_rating        text,
  mgr_rating       text,
  year             integer,
  month            integer,
  created_at       timestamptz not null default now()
);

-- ------------------------- الانضمام -------------------------
create table if not exists public.onboarding (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  position   text,
  grade      text,
  start_date text,
  notes      text,
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- المتدربون -------------------------
create table if not exists public.trainees (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  university text,
  supervisor text,
  unit_id    text references public.org_units (id) on delete set null,
  start_date text,
  end_date   text,
  phone      text,
  status     text default 'قائم' check (status in ('قائم', 'تحت الإجراء', 'مكتمل')),
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- طلبات تمهير -------------------------
create table if not exists public.tamheer (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  university text,
  supervisor text,
  unit_id    text references public.org_units (id) on delete set null,
  start_date text,
  end_date   text,
  phone      text,
  status     text default 'قائم' check (status in ('قائم', 'تحت الإجراء', 'مكتمل')),
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- الاستقالات -------------------------
create table if not exists public.resignations (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  position   text,
  grade      text,
  unit_id    text references public.org_units (id) on delete set null,
  last_day   text,
  reason     text,
  year       integer,
  month      integer,
  created_at timestamptz not null default now()
);

-- ------------------------- الإعدادات والعناوين -------------------------
create table if not exists public.settings (
  id    text primary key default gen_random_uuid()::text,
  key   text unique not null,
  value text
);

insert into public.settings (key, value) values ('training_target', '80')
  on conflict (key) do nothing;
insert into public.settings (key, value) values ('tamheer_target', '40')
  on conflict (key) do nothing;
insert into public.settings (key, value) values ('titles', '{}')
  on conflict (key) do nothing;

-- ===========================================================
-- سياسات الحماية (RLS): الجميع يقرأ بعد تسجيل الدخول،
-- والكتابة لمُدخِلي البيانات فقط.
-- ===========================================================
do $$
declare t text;
begin
  foreach t in array array['profiles','org_units','vacancies','candidates','interviews',
                           'onboarding','trainees','tamheer','resignations','settings']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "read_all" on public.%I', t);
    execute format('create policy "read_all" on public.%I for select to authenticated using (true)', t);

    if t <> 'profiles' then
      execute format('drop policy if exists "write_editor" on public.%I', t);
      execute format('create policy "write_editor" on public.%I for insert to authenticated with check (public.is_editor())', t);

      execute format('drop policy if exists "update_editor" on public.%I', t);
      execute format('create policy "update_editor" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);

      execute format('drop policy if exists "delete_editor" on public.%I', t);
      execute format('create policy "delete_editor" on public.%I for delete to authenticated using (public.is_editor())', t);
    end if;
  end loop;
end $$;

-- ===========================================================
-- الهيكل التنظيمي (٥٧ وحدة) — الأرقام أصفار حتى تُدخَل الأعداد الفعلية
-- ===========================================================
insert into public.org_units (id, name, name_en, parent_id, approved, filled, junior, senior, male, female) values
  ('perf', 'إدارة الأداء', 'Performance Management', null, 0, 0, 0, 0, 0, 0),
  ('perf-q', 'إدارة جودة الأداء', 'Performance Quality', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-adv', 'الدعم الاستشاري', 'Advisory Support', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-adv-1', 'المشاريع الخاصة', 'Special Projects', 'perf-adv', 0, 0, 0, 0, 0, 0),
  ('perf-adv-2', 'دعم إدارة الأداء', 'Performance Management Support', 'perf-adv', 0, 0, 0, 0, 0, 0),
  ('perf-cap', 'تنمية القدرات المؤسسية', 'Institutional Capability Development', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-cap-1', 'تقييم ممارسات أداء الأجهزة', 'Entity Performance Practices Assessment', 'perf-cap', 0, 0, 0, 0, 0, 0),
  ('perf-cap-2', 'تنمية قدرات الأجهزة', 'Entity Capability Development', 'perf-cap', 0, 0, 0, 0, 0, 0),
  ('perf-ana', 'التحاليل المتقدمة والتقارير', 'Advanced Analytics & Reporting', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-ana-1', 'التحاليل المتقدمة', 'Advanced Analytics', 'perf-ana', 0, 0, 0, 0, 0, 0),
  ('perf-ana-2', 'التقارير', 'Reporting', 'perf-ana', 0, 0, 0, 0, 0, 0),
  ('perf-dev', 'تطوير الأداء', 'Performance Development', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-dev-1', 'الاستراتيجيات والتخطيط', 'Strategy & Planning', 'perf-dev', 0, 0, 0, 0, 0, 0),
  ('perf-dev-2', 'إدارة مخاطر الأداء', 'Performance Risk Management', 'perf-dev', 0, 0, 0, 0, 0, 0),
  ('perf-dev-3', 'إدارة تجربة المستفيد', 'Beneficiary Experience', 'perf-dev', 0, 0, 0, 0, 0, 0),
  ('perf-dev-4', 'إدارة المنتجات الخاصة', 'Special Products', 'perf-dev', 0, 0, 0, 0, 0, 0),
  ('perf-ops', 'عمليات إدارة الأداء', 'Performance Operations', 'perf', 0, 0, 0, 0, 0, 0),
  ('perf-ops-1', 'عمليات القطاع المالي والاقتصادي', 'Financial & Economic Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-2', 'عمليات قطاع الشؤون الأمنية والعدلية', 'Security & Judicial Affairs Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-3', 'عمليات قطاع الصناعة والتنمية المناطقية', 'Industry & Regional Development Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-4', 'عمليات قطاع البنية التحتية', 'Infrastructure Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-5', 'عمليات قطاع جودة الحياة', 'Quality of Life Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-6', 'عمليات قطاع التنمية الاجتماعية', 'Social Development Sector Operations', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('perf-ops-7', 'دعم عمليات الأداء', 'Performance Operations Support', 'perf-ops', 0, 0, 0, 0, 0, 0),
  ('shared', 'الخدمات المشتركة', 'Shared Services', null, 0, 0, 0, 0, 0, 0),
  ('shared-proc', 'المشتريات والعقود', 'Procurement & Contracts', 'shared', 0, 0, 0, 0, 0, 0),
  ('shared-adm', 'الشؤون الإدارية', 'Administrative Affairs', 'shared', 0, 0, 0, 0, 0, 0),
  ('shared-fin', 'المالية', 'Finance', 'shared', 0, 0, 0, 0, 0, 0),
  ('shared-fin-1', 'المحاسبة', 'Accounting', 'shared-fin', 0, 0, 0, 0, 0, 0),
  ('shared-fin-2', 'الرقابة والتقارير', 'Control & Reporting', 'shared-fin', 0, 0, 0, 0, 0, 0),
  ('shared-it', 'التحول الرقمي وتقنية المعلومات', 'Digital Transformation & IT', 'shared', 0, 0, 0, 0, 0, 0),
  ('shared-it-sol', 'حلول الأعمال', 'Business Solutions', 'shared-it', 0, 0, 0, 0, 0, 0),
  ('shared-it-1', 'تقنية المعلومات', 'Information Technology', 'shared-it', 0, 0, 0, 0, 0, 0),
  ('shared-it-2', 'هندسة البيانات', 'Data Engineering', 'shared-it', 0, 0, 0, 0, 0, 0),
  ('shared-it-3', 'التحول الرقمي', 'Digital Transformation', 'shared-it', 0, 0, 0, 0, 0, 0),
  ('shared-hc', 'رأس المال البشري', 'Human Capital', 'shared', 0, 0, 0, 0, 0, 0),
  ('shared-hc-1', 'عمليات الموارد البشرية', 'HR Operations', 'shared-hc', 0, 0, 0, 0, 0, 0),
  ('shared-hc-2', 'إدارة واستقطاب وتطوير المواهب', 'Talent Acquisition & Development', 'shared-hc', 0, 0, 0, 0, 0, 0),
  ('shared-hc-3', 'ثقافة العمل والانخراط الوظيفي', 'Workplace Culture & Engagement', 'shared-hc', 0, 0, 0, 0, 0, 0),
  ('shared-hc-4', 'تخطيط وتنمية الموارد البشرية', 'HR Planning & Development', 'shared-hc', 0, 0, 0, 0, 0, 0),
  ('grc', 'الحوكمة والمخاطر والالتزام ومكتب البيانات', 'Governance, Risk, Compliance & Data Office', null, 0, 0, 0, 0, 0, 0),
  ('grc-1', 'الحوكمة والمخاطر والالتزام واستمرارية الأعمال', 'Governance, Risk, Compliance & Business Continuity', 'grc', 0, 0, 0, 0, 0, 0),
  ('grc-2', 'الأمن السيبراني', 'Cybersecurity', 'grc', 0, 0, 0, 0, 0, 0),
  ('grc-3', 'مكتب إدارة البيانات', 'Data Management Office', 'grc', 0, 0, 0, 0, 0, 0),
  ('strat', 'التحول الاستراتيجي', 'Strategic Transformation', null, 0, 0, 0, 0, 0, 0),
  ('strat-1', 'الاستراتيجية المؤسسية', 'Corporate Strategy', 'strat', 0, 0, 0, 0, 0, 0),
  ('strat-2', 'التميز المؤسسي', 'Corporate Excellence', 'strat', 0, 0, 0, 0, 0, 0),
  ('strat-3', 'مكتب إدارة المشاريع', 'Project Management Office', 'strat', 0, 0, 0, 0, 0, 0),
  ('legal', 'القانونية', 'Legal', null, 0, 0, 0, 0, 0, 0),
  ('legal-1', 'الاستشارات والعقود', 'Legal Advisory & Contracts', 'legal', 0, 0, 0, 0, 0, 0),
  ('legal-2', 'الامتثال والتمثيل', 'Compliance & Representation', 'legal', 0, 0, 0, 0, 0, 0),
  ('gmo', 'مكتب المدير العام', 'Director General's Office', null, 0, 0, 0, 0, 0, 0),
  ('gmo-1', 'المراسلات والوثائق والمحفوظات', 'Correspondence, Documents & Archives', 'gmo', 0, 0, 0, 0, 0, 0),
  ('gmo-2', 'الأعمال التنفيذية', 'Executive Affairs', 'gmo', 0, 0, 0, 0, 0, 0),
  ('comm', 'التواصل المؤسسي', 'Corporate Communication', null, 0, 0, 0, 0, 0, 0),
  ('comm-1', 'الإعلام والهوية المؤسسية', 'Media & Corporate Identity', 'comm', 0, 0, 0, 0, 0, 0),
  ('comm-2', 'العلاقات العامة', 'Public Relations', 'comm', 0, 0, 0, 0, 0, 0),
  ('audit', 'المراجعة الداخلية', 'Internal Audit', null, 0, 0, 0, 0, 0, 0)
on conflict (id) do nothing;
